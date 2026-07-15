import { NextRequest } from "next/server";

const CONNECTOR_PROVIDERS = ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const;
const REQUIRED_READY_DOMAIN_IDS = [
  "reliability_control_plane",
  "iam_saml_scim_rbac_audit",
  "provider_deep_connectors",
  "intelligence_hardening",
  "approval_auto_send_governance",
  "billing_entitlements",
  "api_mcp_ga",
  "data_governance_security_ops",
  "enterprise_ux",
  "operational_readiness",
] as const;

const REQUIRED_PROVED_REQUIREMENT_IDS = [
  ...REQUIRED_READY_DOMAIN_IDS,
  "soc2_ready_architecture_evidence",
  "no_unsupported_certification_claims",
  "runtime_disabled_unsupported_capabilities",
  "non_negotiable_no_fake_data_integrations",
  "non_negotiable_permissioned_ingestion",
  "non_negotiable_human_governance",
  "non_negotiable_customer_owned_data_posture",
  "non_negotiable_evidence_first_outputs",
] as const;

const OBJECTIVE_SCOPE_BY_REQUIREMENT_ID: Record<
  (typeof REQUIRED_PROVED_REQUIREMENT_IDS)[number],
  "domain" | "compliance" | "runtime_safety" | "non_negotiable"
> = {
  reliability_control_plane: "domain",
  iam_saml_scim_rbac_audit: "domain",
  provider_deep_connectors: "domain",
  intelligence_hardening: "domain",
  approval_auto_send_governance: "domain",
  billing_entitlements: "domain",
  api_mcp_ga: "domain",
  data_governance_security_ops: "domain",
  enterprise_ux: "domain",
  operational_readiness: "domain",
  soc2_ready_architecture_evidence: "compliance",
  no_unsupported_certification_claims: "compliance",
  runtime_disabled_unsupported_capabilities: "runtime_safety",
  non_negotiable_no_fake_data_integrations: "non_negotiable",
  non_negotiable_permissioned_ingestion: "non_negotiable",
  non_negotiable_human_governance: "non_negotiable",
  non_negotiable_customer_owned_data_posture: "non_negotiable",
  non_negotiable_evidence_first_outputs: "non_negotiable",
};

function assertExactIdSet(input: { actual: string[]; expected: readonly string[]; label: string }) {
  const unique = Array.from(new Set(input.actual));
  if (unique.length !== input.actual.length) {
    throw new Error(`${input.label} contains duplicate ids.`);
  }
  const missing = input.expected.filter((id) => !unique.includes(id));
  const unexpected = unique.filter((id) => !input.expected.includes(id));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${input.label} mismatch. missing=[${missing.join(",")}], unexpected=[${unexpected.join(",")}].`
    );
  }
}

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-release-go-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

function envSetRequired() {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "smoke-openai-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "smoke-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "smoke-service-role";
  process.env.OPERATORLAYER_SCIM_TOKEN = process.env.OPERATORLAYER_SCIM_TOKEN ?? "smoke-scim-token";
  process.env.OPERATORLAYER_OAUTH_STATE_SECRET =
    process.env.OPERATORLAYER_OAUTH_STATE_SECRET ?? "smoke-oauth-state-secret";
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "smoke-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "smoke-google-client-secret";
  process.env.SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID ?? "smoke-slack-client-id";
  process.env.SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET ?? "smoke-slack-client-secret";
  process.env.MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? "smoke-ms-client-id";
  process.env.MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET ?? "smoke-ms-client-secret";
  process.env.HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID ?? "smoke-hubspot-client-id";
  process.env.HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET ?? "smoke-hubspot-client-secret";
  process.env.SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID ?? "smoke-salesforce-client-id";
  process.env.SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET ?? "smoke-salesforce-client-secret";
  process.env.INTERCOM_CLIENT_ID = process.env.INTERCOM_CLIENT_ID ?? "smoke-intercom-client-id";
  process.env.INTERCOM_CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET ?? "smoke-intercom-client-secret";
  process.env.ZENDESK_CLIENT_ID = process.env.ZENDESK_CLIENT_ID ?? "smoke-zendesk-client-id";
  process.env.ZENDESK_CLIENT_SECRET = process.env.ZENDESK_CLIENT_SECRET ?? "smoke-zendesk-client-secret";
  process.env.ZENDESK_AUTHORIZE_URL =
    process.env.ZENDESK_AUTHORIZE_URL ?? "https://release-go-smoke.zendesk.com/oauth/authorizations/new";
  process.env.ZENDESK_TOKEN_URL =
    process.env.ZENDESK_TOKEN_URL ?? "https://release-go-smoke.zendesk.com/oauth/tokens";
  process.env.ZENDESK_API_BASE_URL =
    process.env.ZENDESK_API_BASE_URL ?? "https://release-go-smoke.zendesk.com/api/v2";
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";
  envSetRequired();

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { PATCH: patchFeatureFlags } = await import("@/app/api/feature-flags/route");
  const { PATCH: patchBilling } = await import("@/app/api/billing/entitlements/route");
  const { PATCH: patchSsoConfig } = await import("@/app/api/sso/config/route");
  const { GET: getReleaseDecision } = await import("@/app/api/enterprise/release-decision/route");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-release-go-001" },
      body: JSON.stringify({ name: "Release Decision GO Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for release-decision-go smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  for (const key of [
    "auto_send",
    "mcp_actions",
    "scim_write",
    "connector_gmail",
    "connector_slack",
    "connector_outlook",
    "connector_hubspot",
    "connector_salesforce",
    "connector_intercom",
    "connector_zendesk",
  ]) {
    const response = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: true, rolloutPercent: 100 }),
      })
    );
    if (!response.ok) throw new Error(`Failed to enable feature flag ${key}.`);
  }

  const billing = await patchBilling(
    authedRequest("http://localhost/api/billing/entitlements", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: "enterprise",
        status: "active",
        autoSendEnabled: true,
        apiAccessEnabled: true,
        mcpAccessEnabled: true,
      }),
    })
  );
  if (!billing.ok) throw new Error("Failed to enable enterprise billing entitlements.");

  const sso = await patchSsoConfig(
    authedRequest("http://localhost/api/sso/config", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: true,
        idpEntityId: "https://idp.example.com/entity",
        ssoUrl: "https://idp.example.com/saml",
        certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
        domainAllowlist: ["example.com"],
      }),
    })
  );
  if (!sso.ok) throw new Error("Failed to enable SSO config.");

  const repository = getRepository();
  const now = new Date().toISOString();

  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:mcp_capability_evaluated",
    details: {
      capabilityId: "mcp_actions",
      actorId: "smoke-user-release-go-001",
    },
  });

  for (const provider of CONNECTOR_PROVIDERS) {
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:connector_upsert",
      details: {
        provider,
        status: "connected",
        displayName: provider.toUpperCase(),
        scopes: ["read"],
        sourceSelection: ["all"],
        syncSchedule: "hourly",
        actorId: "smoke-user-release-go-001",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:connector_sync_result",
      details: {
        provider,
        syncStatus: "succeeded",
        actorId: "smoke-user-release-go-001",
      },
    });
  }

  const source = await repository.createSource({
    organisationId: orgId,
    title: "GO Smoke Source",
    sourceType: "txt",
    rawText: "Pricing guidance for enterprise conversations.",
  });

  const policyId = crypto.randomUUID();
  const scenarioId = crypto.randomUUID();
  await repository.replaceExtractedData({
    source,
    chunks: [],
    policies: [
      {
        id: policyId,
        organisationId: orgId,
        name: "Pricing objection response flow",
        ruleType: "scenario_response_flow",
        description: "Handle pricing objections with value framing and no discount promises.",
        severity: "high",
        status: "approved",
        structuredRule: { scenario: "pricing_objection", required_sequence: ["acknowledge", "reframe", "next_step"] },
        sourceEvidence: [{ sourceId: source.id }],
        confidence: 0.95,
        createdAt: now,
        updatedAt: now,
        reviewedBy: "smoke-user-release-go-001",
        reviewedAt: now,
      },
    ],
    terminologyPatterns: [],
    scenarios: [
      {
        id: scenarioId,
        organisationId: orgId,
        name: "Pricing objection",
        category: "sales",
        description: "Handle enterprise pricing objections safely.",
        riskLevel: "medium",
        triggerPhrases: ["too expensive"],
        approvedResponseFlow: ["acknowledge", "reframe", "next_step"],
        forbiddenBehaviours: ["promise discount without approval"],
        evaluationRubric: { compliance: 30, flow: 30, clarity: 40 },
        createdAt: now,
      },
    ],
    conflicts: [],
  });

  await repository.createReviewEvent({
    organisationId: orgId,
    itemType: "policy",
    itemId: policyId,
    action: "approve",
    actorId: "smoke-user-release-go-001",
    beforeState: { status: "suggested" },
    afterState: { status: "approved" },
  });

  await repository.createEvaluation(orgId, {
    scenarioId,
    inputMessage: "Prospect says this is too expensive.",
    originalDraft: "I can guarantee a discount.",
    repairedDraft: "I understand the concern. Based on your goals, a scoped pilot can de-risk rollout.",
    detectedPhrases: ["scoped pilot"],
    missingRequiredElements: [],
    policyViolations: [],
    scores: {
      total: 91,
      policyCompliance: 92,
      scenarioFlow: 90,
      approvedTerminology: 90,
      forbiddenPhraseAvoidance: 95,
      toneMatch: 88,
      clarityNextStep: 90,
    },
    approvalRequired: false,
    repairRequired: false,
  });

  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:api_key_created",
    details: { id: "api-key-release-go-smoke", actorId: "smoke-user-release-go-001" },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:legal_hold_placed",
    details: {
      holdId: "hold-release-go-smoke",
      scope: "global",
      reason: "Governance exercise",
      ticketRef: "SMOKE-GO-001",
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:break_glass_invoked",
    details: {
      invocationId: "breakglass-release-go-smoke",
      reason: "Incident response drill",
      durationMinutes: 30,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:scim_bulk_operation",
    details: {
      operation: "PATCH",
      resourceType: "User",
      resourceId: "scim-user-001",
      status: "success",
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:scim_user_status_set",
    details: {
      userId: "scim-user-001",
      active: true,
      reason: "Provisioned",
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:scim_drift_reconcile_run",
    details: {
      runId: "scim-reconcile-release-go-smoke",
      apply: true,
      issues: 0,
      resolved: 0,
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:member_role_updated",
    details: {
      memberId: "member-release-go-smoke-001",
      previousRole: "member",
      newRole: "reviewer",
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:member_invite_created",
    details: {
      inviteId: "invite-release-go-smoke-001",
      email: "invitee-release-go@example.com",
      role: "member",
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:approval_rule_upsert",
    details: {
      id: "approval-rule-release-go-smoke-001",
      name: "Release GO approval boundary",
      channel: "email",
      enabled: true,
      maxRiskLevel: "low",
      minScore: 90,
      updatedBy: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: "source-release-go-smoke-001",
    action: "source_uploaded",
    details: {
      sourceType: "pasted_text",
      title: "Release GO Evidence Source",
      authorityLevel: "standard",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: "source-release-go-smoke-001",
    action: "source_process_requested",
    details: {
      sourceId: "source-release-go-smoke-001",
      mode: "manual",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:deletion_completed",
    details: {
      id: "deletion-release-go-smoke",
      completion: {
        completedBy: "smoke-user-release-go-001",
        completedAt: now,
        executionMode: "soft_delete",
        proofRecordId: "proof-release-go-smoke",
        deletionEvidenceHash: "hash-release-go-smoke",
        deletedObjectCounts: { sources: 1, evaluations: 1, exports: 0, jobs: 0 },
        notes: "release-go smoke",
      },
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:auto_send_decision_recorded",
    details: {
      requestKey: "release-go-smoke-request",
      actorId: "smoke-user-release-go-001",
      decision: { allowed: true, state: "allowed" },
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:send_event_created",
    details: {
      id: "release-go-smoke-send-001",
      status: "queued",
      autoSend: true,
      actorId: "smoke-user-release-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:send_event_delivery_confirmed",
    details: {
      id: "release-go-smoke-send-001",
      confirmationSource: "auto_send_worker",
      confirmationId: "provider-msg-001",
      actorId: "smoke-user-release-go-001",
    },
  });

  const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
  if (!response.ok) throw new Error("Release decision endpoint failed for release-decision-go smoke.");
  const payload = (await response.json()) as {
    data: {
      decision: "go" | "no_go";
      summary: { hardBlockerCount: number };
      readinessBoard: { goNoGo: "go" | "no_go" };
      onboardingChecklist: { goNoGo: "go" | "no_go"; readinessMeter: { completionPct: number } };
      compliancePosture: {
        certificationClaim: "not_claimed";
        soc2ReadinessStatus: "controls_evidenced" | "evidence_incomplete";
        missingEvidence: string[];
      };
      domainAssessments: Array<{
        id: string;
        status: "ready" | "blocked" | "verification_gap";
        evidence: string[];
        blockingCodes: string[];
      }>;
      closureAudit: {
        summary: { total: number; proved: number; blocked: number; incomplete: number };
        requirements: Array<{
          id: string;
          status: "proved" | "blocked" | "incomplete";
          evidenceSources: string[];
          evidenceQuality: "direct" | "indirect" | "missing";
          gaps: string[];
        }>;
      };
      objectiveCoverage: Array<{
        id: string;
        scope: "domain" | "compliance" | "runtime_safety" | "non_negotiable";
        status: "proved" | "blocked" | "incomplete";
        evidenceSources: string[];
        gaps: string[];
        nextActions: string[];
      }>;
      unavailableCapabilities: Array<{ id: string }>;
    };
  };

  if (payload.data.decision !== "go") throw new Error("Expected release decision to be go.");
  if (payload.data.summary.hardBlockerCount !== 0) throw new Error("Expected zero hard blockers in go scenario.");
  if (payload.data.readinessBoard.goNoGo !== "go") throw new Error("Expected readiness board go/no-go to be go.");
  if (payload.data.onboardingChecklist.goNoGo !== "go") throw new Error("Expected onboarding checklist go/no-go to be go.");
  if (payload.data.onboardingChecklist.readinessMeter.completionPct !== 100) {
    throw new Error("Expected onboarding checklist completion to be 100.");
  }
  if (payload.data.compliancePosture.soc2ReadinessStatus !== "controls_evidenced") {
    throw new Error("Expected SOC2 readiness posture to be controls_evidenced.");
  }
  if (payload.data.compliancePosture.certificationClaim !== "not_claimed") {
    throw new Error("Expected no unsupported certification claim in go scenario.");
  }
  if (payload.data.compliancePosture.missingEvidence.length > 0) {
    throw new Error("Expected no missing compliance evidence in go scenario.");
  }
  assertExactIdSet({
    actual: payload.data.domainAssessments.map((item) => item.id),
    expected: REQUIRED_READY_DOMAIN_IDS,
    label: "go smoke domain assessments",
  });
  assertExactIdSet({
    actual: payload.data.closureAudit.requirements.map((item) => item.id),
    expected: REQUIRED_PROVED_REQUIREMENT_IDS,
    label: "go smoke closure requirements",
  });
  assertExactIdSet({
    actual: payload.data.objectiveCoverage.map((item) => item.id),
    expected: REQUIRED_PROVED_REQUIREMENT_IDS,
    label: "go smoke objective coverage",
  });

  for (const id of REQUIRED_READY_DOMAIN_IDS) {
    const domain = payload.data.domainAssessments.find((item) => item.id === id);
    if (!domain || domain.status !== "ready") {
      throw new Error(`Expected domain ${id} to be ready in go scenario.`);
    }
    if (domain.evidence.length === 0) {
      throw new Error(`Expected domain ${id} to include evidence-first output entries.`);
    }
    if (domain.blockingCodes.length !== 0) {
      throw new Error(`Expected domain ${id} to have no blocking codes in go scenario.`);
    }
  }
  const blockedDomains = payload.data.domainAssessments.filter((domain) => domain.status !== "ready");
  if (blockedDomains.length > 0) {
    throw new Error(
      `Expected all release domains ready; got non-ready: ${blockedDomains.map((domain) => domain.id).join(", ")}.`
    );
  }
  if (payload.data.closureAudit.summary.blocked !== 0 || payload.data.closureAudit.summary.incomplete !== 0) {
    throw new Error("Expected closure audit to have no blocked or incomplete requirements in go scenario.");
  }
  if (payload.data.closureAudit.summary.proved !== payload.data.closureAudit.summary.total) {
    throw new Error("Expected all closure audit requirements to be proved in go scenario.");
  }
  for (const id of REQUIRED_PROVED_REQUIREMENT_IDS) {
    const requirement = payload.data.closureAudit.requirements.find((item) => item.id === id);
    if (!requirement || requirement.status !== "proved") {
      throw new Error(`Expected closure requirement ${id} to be proved in go scenario.`);
    }
    if (requirement.evidenceSources.length === 0) {
      throw new Error(`Expected closure requirement ${id} to include evidence sources.`);
    }
    if (requirement.evidenceQuality === "missing") {
      throw new Error(`Expected closure requirement ${id} to avoid missing evidence quality when proved.`);
    }
    if (requirement.gaps.length !== 0) {
      throw new Error(`Expected closure requirement ${id} to have no gaps when proved.`);
    }
  }
  const closureById = new Map(payload.data.closureAudit.requirements.map((item) => [item.id, item] as const));
  for (const objective of payload.data.objectiveCoverage) {
    const expectedScope = OBJECTIVE_SCOPE_BY_REQUIREMENT_ID[objective.id as (typeof REQUIRED_PROVED_REQUIREMENT_IDS)[number]];
    if (objective.scope !== expectedScope) {
      throw new Error(
        `Expected objective scope for ${objective.id} to be ${expectedScope}; got ${objective.scope}.`
      );
    }
    const requirement = closureById.get(objective.id);
    if (!requirement) {
      throw new Error(`Expected closure requirement for objective ${objective.id}.`);
    }
    if (objective.status !== requirement.status) {
      throw new Error(`Objective status mismatch for ${objective.id}.`);
    }
    if (JSON.stringify(objective.evidenceSources) !== JSON.stringify(requirement.evidenceSources)) {
      throw new Error(`Objective evidenceSources mismatch for ${objective.id}.`);
    }
    if (JSON.stringify(objective.gaps) !== JSON.stringify(requirement.gaps)) {
      throw new Error(`Objective gaps mismatch for ${objective.id}.`);
    }
    if (objective.nextActions.length !== 0) {
      throw new Error(`Expected no objective nextActions for proved go requirement ${objective.id}.`);
    }
  }
  if (payload.data.unavailableCapabilities.length !== 0) {
    throw new Error("Expected no unavailable capabilities in go scenario.");
  }

  console.log("release-decision-go-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
