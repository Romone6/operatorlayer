import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-ops-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function requireFile(relativePath: string) {
  const absolutePath = join(process.cwd(), relativePath);
  await access(absolutePath, fsConstants.F_OK);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { GET: getReadinessBoard } = await import("@/app/api/enterprise/readiness-board/route");
  const { GET: getOnboardingChecklist } = await import("@/app/api/enterprise/onboarding-checklist/route");
  const { GET: getReleaseDecision } = await import("@/app/api/enterprise/release-decision/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-ops-001" },
      body: JSON.stringify({ name: "Ops Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for ops readiness smoke.");
  const org = (await create.json()) as { data: { id: string } };

  const boardResponse = await getReadinessBoard(authedRequest("http://localhost/api/enterprise/readiness-board", org.data.id));
  if (!boardResponse.ok) throw new Error("Readiness board endpoint failed.");
  const board = (await boardResponse.json()) as {
    data: {
      goNoGo: "go" | "no_go";
      hardBlockerCount: number;
      blockers: Array<{ nextCommand: string }>;
      sloTargets: Record<string, number>;
      incidentSeverityPolicy: Array<{ severity: string; owner: string }>;
    };
  };
  if (board.data.goNoGo !== "no_go" && board.data.goNoGo !== "go") {
    throw new Error("Invalid go/no-go state.");
  }
  if (board.data.hardBlockerCount < 0) {
    throw new Error("Invalid hard blocker count.");
  }
  if (!board.data.sloTargets.apiLatencyP95Ms) {
    throw new Error("Missing API latency SLO target.");
  }
  if (board.data.incidentSeverityPolicy.length !== 4) {
    throw new Error("Incident severity mapping is incomplete.");
  }
  if (board.data.blockers.some((item) => item.nextCommand.length === 0)) {
    throw new Error("Readiness blockers must include executable nextCommand guidance.");
  }

  const checklistResponse = await getOnboardingChecklist(
    authedRequest("http://localhost/api/enterprise/onboarding-checklist", org.data.id)
  );
  if (!checklistResponse.ok) throw new Error("Onboarding checklist endpoint failed.");
  const checklist = (await checklistResponse.json()) as {
    data: {
      goNoGo: "go" | "no_go";
      readinessMeter: { completed: number; total: number; completionPct: number };
      steps: Array<{ id: string; nextCommands: string[] }>;
    };
  };

  if (checklist.data.goNoGo !== board.data.goNoGo) {
    throw new Error("Onboarding checklist go/no-go state does not match readiness board.");
  }
  if (checklist.data.steps.length !== checklist.data.readinessMeter.total) {
    throw new Error("Onboarding checklist readiness meter total must match step count.");
  }
  if (checklist.data.steps.length < 7) {
    throw new Error("Onboarding checklist is missing required enterprise onboarding steps.");
  }
  if (checklist.data.readinessMeter.completionPct < 0 || checklist.data.readinessMeter.completionPct > 100) {
    throw new Error("Onboarding checklist readiness completionPct must be between 0 and 100.");
  }
  if (checklist.data.steps.every((step) => step.nextCommands.length === 0) && checklist.data.goNoGo === "no_go") {
    throw new Error("Onboarding checklist must provide at least one next command while not ready.");
  }

  const releaseDecisionResponse = await getReleaseDecision(
    authedRequest("http://localhost/api/enterprise/release-decision", org.data.id)
  );
  if (!releaseDecisionResponse.ok) throw new Error("Release decision endpoint failed.");
  const releaseDecision = (await releaseDecisionResponse.json()) as {
    data: {
      decision: "go" | "no_go";
      summary: {
        blockerCount: number;
      };
      nextActions: string[];
      evidenceSignals: {
        auditEvents: { total: number; governance: number; security: number };
        intelligence: { evaluations: number; reviewEvents: number };
      };
      compliancePosture: {
        certificationClaim: "not_claimed";
        soc2ReadinessStatus: "controls_evidenced" | "evidence_incomplete";
        procurementDocs: {
          architectureBrief: boolean;
          securityQuestionnaireBaseline: boolean;
          connectorScopeMatrix: boolean;
          governanceWalkthrough: boolean;
        };
      };
      closureAudit: {
        summary: { total: number; proved: number; blocked: number; incomplete: number };
        requirements: Array<{
          id: string;
          status: "proved" | "blocked" | "incomplete";
          evidenceQuality: "direct" | "indirect" | "missing";
        }>;
      };
      domainAssessments: Array<{
        id: string;
        status: "ready" | "blocked" | "verification_gap";
        evidence: string[];
        blockingCodes: string[];
        nextActions: string[];
      }>;
      readinessBoard: { goNoGo: "go" | "no_go"; blockers: Array<{ code: string }> };
      onboardingChecklist: { goNoGo: "go" | "no_go" };
      unavailableCapabilities: Array<{ id: string; reason: string; message: string }>;
    };
  };
  if (releaseDecision.data.readinessBoard.goNoGo !== board.data.goNoGo) {
    throw new Error("Release decision readiness board snapshot is inconsistent.");
  }
  if (releaseDecision.data.onboardingChecklist.goNoGo !== checklist.data.goNoGo) {
    throw new Error("Release decision checklist snapshot is inconsistent.");
  }
  if (releaseDecision.data.summary.blockerCount !== board.data.blockers.length) {
    throw new Error("Release decision blocker summary mismatch.");
  }
  if (releaseDecision.data.nextActions.length === 0 && releaseDecision.data.decision === "no_go") {
    throw new Error("Release decision must include next actions while blocked.");
  }
  if (releaseDecision.data.evidenceSignals.auditEvents.total < 0) {
    throw new Error("Release decision evidence signals are malformed.");
  }
  if (releaseDecision.data.compliancePosture.certificationClaim !== "not_claimed") {
    throw new Error("Release decision must not assert unsupported certification claims.");
  }
  if (
    !releaseDecision.data.compliancePosture.procurementDocs.architectureBrief ||
    !releaseDecision.data.compliancePosture.procurementDocs.securityQuestionnaireBaseline ||
    !releaseDecision.data.compliancePosture.procurementDocs.connectorScopeMatrix ||
    !releaseDecision.data.compliancePosture.procurementDocs.governanceWalkthrough
  ) {
    throw new Error("Release decision compliance posture is missing required procurement evidence artifacts.");
  }
  if (releaseDecision.data.closureAudit.summary.total !== 18) {
    throw new Error("Release decision closure audit must include all mapped enterprise requirements.");
  }
  if (
    releaseDecision.data.closureAudit.summary.proved +
      releaseDecision.data.closureAudit.summary.blocked +
      releaseDecision.data.closureAudit.summary.incomplete !==
    releaseDecision.data.closureAudit.summary.total
  ) {
    throw new Error("Release decision closure audit summary counts are inconsistent.");
  }
  const shouldBeGo =
    board.data.goNoGo === "go" &&
    releaseDecision.data.closureAudit.summary.blocked === 0 &&
    releaseDecision.data.closureAudit.summary.incomplete === 0;
  if (releaseDecision.data.decision !== (shouldBeGo ? "go" : "no_go")) {
    throw new Error("Release decision does not enforce fail-closed closure semantics.");
  }
  if (
    !releaseDecision.data.closureAudit.requirements.some(
      (item) => item.id === "no_unsupported_certification_claims" && item.status === "proved"
    )
  ) {
    throw new Error("Release decision closure audit must prove no unsupported certification claim.");
  }
  if (
    !releaseDecision.data.closureAudit.requirements.some(
      (item) => item.id === "no_unsupported_certification_claims" && item.evidenceQuality === "direct"
    )
  ) {
    throw new Error("Release decision closure audit should classify direct proof for certification-claim requirement.");
  }
  if (
    !releaseDecision.data.closureAudit.requirements.some(
      (item) =>
        item.id === "non_negotiable_no_fake_data_integrations" &&
        item.status === "proved" &&
        item.evidenceQuality === "direct"
    )
  ) {
    throw new Error(
      "Release decision closure audit should prove non-negotiable no-fake-integrations with direct evidence."
    );
  }
  if (
    !releaseDecision.data.closureAudit.requirements.every((item) =>
      ["direct", "indirect", "missing"].includes(item.evidenceQuality)
    )
  ) {
    throw new Error("Release decision closure audit has invalid evidenceQuality classification.");
  }
  if (
    !releaseDecision.data.closureAudit.requirements
      .filter((item) => item.status === "proved")
      .every((item) => item.evidenceQuality !== "missing")
  ) {
    throw new Error("Release decision proved requirements must include non-missing evidence quality.");
  }
  if (
    !releaseDecision.data.closureAudit.requirements.some(
      (item) => item.id === "non_negotiable_no_fake_data_integrations"
    ) ||
    !releaseDecision.data.closureAudit.requirements.some(
      (item) => item.id === "non_negotiable_permissioned_ingestion"
    ) ||
    !releaseDecision.data.closureAudit.requirements.some(
      (item) => item.id === "non_negotiable_human_governance"
    ) ||
    !releaseDecision.data.closureAudit.requirements.some(
      (item) => item.id === "non_negotiable_customer_owned_data_posture"
    ) ||
    !releaseDecision.data.closureAudit.requirements.some(
      (item) => item.id === "non_negotiable_evidence_first_outputs"
    )
  ) {
    throw new Error("Release decision closure audit is missing non-negotiable objective requirements.");
  }
  if (releaseDecision.data.domainAssessments.length !== 10) {
    throw new Error("Release decision must include all 10 enterprise closure domain assessments.");
  }
  if (
    !releaseDecision.data.domainAssessments.every(
      (item) =>
        item.id.length > 0 &&
        ["ready", "blocked", "verification_gap"].includes(item.status) &&
        Array.isArray(item.evidence) &&
        Array.isArray(item.blockingCodes) &&
        Array.isArray(item.nextActions)
    )
  ) {
    throw new Error("Release decision domain assessments are malformed.");
  }
  if (releaseDecision.data.decision === "no_go") {
    const expectedNoGoDomainStatuses = new Map<string, "ready" | "blocked" | "verification_gap">([
      ["reliability_control_plane", "blocked"],
      ["iam_saml_scim_rbac_audit", "blocked"],
      ["provider_deep_connectors", "blocked"],
      ["intelligence_hardening", "verification_gap"],
      ["approval_auto_send_governance", "blocked"],
      ["billing_entitlements", "blocked"],
      ["api_mcp_ga", "blocked"],
      ["data_governance_security_ops", "verification_gap"],
      ["enterprise_ux", "blocked"],
      ["operational_readiness", "blocked"],
    ]);
    for (const [domainId, expectedStatus] of expectedNoGoDomainStatuses) {
      const domain = releaseDecision.data.domainAssessments.find((item) => item.id === domainId);
      if (!domain) {
        throw new Error(`Release decision missing domain assessment ${domainId} in no-go scenario.`);
      }
      if (domain.status !== expectedStatus) {
        throw new Error(
          `Release decision no-go domain status mismatch for ${domainId}: expected ${expectedStatus}, got ${domain.status}.`
        );
      }
      if (domain.evidence.length === 0) {
        throw new Error(`Release decision no-go domain ${domainId} is missing evidence output.`);
      }
      if (domain.blockingCodes.length === 0) {
        throw new Error(`Release decision no-go domain ${domainId} is missing blocking codes.`);
      }
    }
  }
  if (
    !releaseDecision.data.unavailableCapabilities.every(
      (item) => item.id.length > 0 && item.reason.length > 0 && item.message.length > 0
    )
  ) {
    throw new Error("Release decision unavailable capability entries are malformed.");
  }

  await Promise.all([
    requireFile("docs/operations/slo-targets.md"),
    requireFile("docs/operations/incident-response-runbook.md"),
    requireFile("docs/operations/backup-restore-drill.md"),
    requireFile("docs/operations/queue-replay-disaster-exercise.md"),
    requireFile("docs/operations/provider-outage-chaos-exercise.md"),
    requireFile("docs/procurement/architecture-brief.md"),
    requireFile("docs/procurement/security-questionnaire-baseline.md"),
    requireFile("docs/procurement/connector-scope-matrix.md"),
    requireFile("docs/procurement/governance-walkthrough.md"),
  ]);

  console.log(JSON.stringify(board, null, 2));
  console.log(JSON.stringify(checklist, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
