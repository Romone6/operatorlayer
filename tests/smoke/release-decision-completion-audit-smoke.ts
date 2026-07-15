import { NextRequest } from "next/server";

const CONNECTOR_PROVIDERS = ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const;
const RUNTIME_ENV_KEYS = [
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPERATORLAYER_SCIM_TOKEN",
  "OPERATORLAYER_OAUTH_STATE_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "HUBSPOT_CLIENT_ID",
  "HUBSPOT_CLIENT_SECRET",
  "SALESFORCE_CLIENT_ID",
  "SALESFORCE_CLIENT_SECRET",
  "INTERCOM_CLIENT_ID",
  "INTERCOM_CLIENT_SECRET",
  "ZENDESK_CLIENT_ID",
  "ZENDESK_CLIENT_SECRET",
  "ZENDESK_AUTHORIZE_URL",
  "ZENDESK_TOKEN_URL",
  "ZENDESK_API_BASE_URL",
] as const;

const REQUIRED_DOMAIN_IDS = [
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

const REQUIRED_CLOSURE_IDS = [
  ...REQUIRED_DOMAIN_IDS,
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
  (typeof REQUIRED_CLOSURE_IDS)[number],
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

function authedRequest(url: string, orgId: string, init: RequestInit = {}, userId = "smoke-user-completion-audit-001") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", userId);
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

function setGoEnv() {
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
    process.env.ZENDESK_AUTHORIZE_URL ?? "https://completion-audit-smoke.zendesk.com/oauth/authorizations/new";
  process.env.ZENDESK_TOKEN_URL =
    process.env.ZENDESK_TOKEN_URL ?? "https://completion-audit-smoke.zendesk.com/oauth/tokens";
  process.env.ZENDESK_API_BASE_URL =
    process.env.ZENDESK_API_BASE_URL ?? "https://completion-audit-smoke.zendesk.com/api/v2";
}

function clearRuntimeEnv() {
  for (const key of RUNTIME_ENV_KEYS) {
    delete process.env[key];
  }
}

type ReleaseDecisionPayload = {
  data: {
    decision: "go" | "no_go";
    readinessBoard: { goNoGo: "go" | "no_go" };
    onboardingChecklist: { goNoGo: "go" | "no_go"; readinessMeter: { completionPct: number } };
    compliancePosture: {
      certificationClaim: "not_claimed";
      soc2ReadinessStatus: "controls_evidenced" | "evidence_incomplete";
      missingEvidence: string[];
    };
    closureAudit: {
      summary: { total: number; proved: number; blocked: number; incomplete: number };
      requirements: Array<{
        id: string;
        status: "proved" | "blocked" | "incomplete";
        evidenceQuality: "direct" | "indirect" | "missing";
        evidenceSources: string[];
        gaps: string[];
        nextActions: string[];
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
    domainAssessments: Array<{
      id: string;
      status: "ready" | "blocked" | "verification_gap";
      evidence: string[];
      blockingCodes: string[];
    }>;
    unavailableCapabilities: Array<{ id: string; reason: string; message: string }>;
  };
};

function assertRequirementExists(payload: ReleaseDecisionPayload, id: string) {
  const requirement = payload.data.closureAudit.requirements.find((item) => item.id === id);
  if (!requirement) throw new Error(`Missing closure requirement ${id}.`);
  return requirement;
}

function assertDomainExists(payload: ReleaseDecisionPayload, id: string) {
  const domain = payload.data.domainAssessments.find((item) => item.id === id);
  if (!domain) throw new Error(`Missing domain assessment ${id}.`);
  return domain;
}

function assertExactIdSet(input: { actual: string[]; expected: readonly string[]; label: string }) {
  const actualUnique = Array.from(new Set(input.actual));
  if (actualUnique.length !== input.actual.length) {
    throw new Error(`${input.label} contains duplicate IDs.`);
  }
  const missing = input.expected.filter((id) => !actualUnique.includes(id));
  const unexpected = actualUnique.filter((id) => !input.expected.includes(id));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${input.label} set mismatch. Missing: [${missing.join(", ")}], Unexpected: [${unexpected.join(", ")}].`
    );
  }
}

function assertNoGoAudit(payload: ReleaseDecisionPayload) {
  if (payload.data.decision !== "no_go") throw new Error("Expected no_go decision in baseline audit scenario.");
  if (payload.data.readinessBoard.goNoGo !== "no_go") throw new Error("Expected readiness board no_go state.");
  if (payload.data.onboardingChecklist.goNoGo !== "no_go") throw new Error("Expected onboarding checklist no_go state.");
  if (payload.data.closureAudit.summary.total !== 18) throw new Error("Expected 18 closure requirements in no_go scenario.");
  if (payload.data.closureAudit.summary.blocked === 0 && payload.data.closureAudit.summary.incomplete === 0) {
    throw new Error("Expected blocked or incomplete closure requirements in no_go scenario.");
  }
  assertExactIdSet({
    actual: payload.data.domainAssessments.map((item) => item.id),
    expected: REQUIRED_DOMAIN_IDS,
    label: "no_go domain assessments",
  });
  assertExactIdSet({
    actual: payload.data.closureAudit.requirements.map((item) => item.id),
    expected: REQUIRED_CLOSURE_IDS,
    label: "no_go closure requirements",
  });
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
  for (const [id, expectedStatus] of expectedNoGoDomainStatuses) {
    const domain = assertDomainExists(payload, id);
    if (domain.status !== expectedStatus) {
      throw new Error(`No-go domain status mismatch for ${id}: expected ${expectedStatus}, got ${domain.status}.`);
    }
    if (domain.evidence.length === 0) throw new Error(`No-go domain ${id} must include evidence output.`);
    if (domain.blockingCodes.length === 0) throw new Error(`No-go domain ${id} must include blocking codes.`);
  }
  const runtimeDisabledRequirement = assertRequirementExists(payload, "runtime_disabled_unsupported_capabilities");
  if (runtimeDisabledRequirement.status !== "incomplete") {
    throw new Error("Expected runtime_disabled_unsupported_capabilities to be incomplete in no_go scenario.");
  }
  if (!runtimeDisabledRequirement.gaps.includes("connector_runtime_disable_proof_missing")) {
    throw new Error("Expected connector runtime-disable proof gap in no_go scenario.");
  }
  const noUnsupportedClaimsRequirement = assertRequirementExists(payload, "no_unsupported_certification_claims");
  if (noUnsupportedClaimsRequirement.status !== "proved" || noUnsupportedClaimsRequirement.evidenceQuality !== "direct") {
    throw new Error("Expected no_unsupported_certification_claims to be proved with direct evidence.");
  }
  const noFakeRequirement = assertRequirementExists(payload, "non_negotiable_no_fake_data_integrations");
  if (noFakeRequirement.status !== "proved" || noFakeRequirement.evidenceQuality !== "direct") {
    throw new Error("Expected no-fake-integrations requirement to remain proved in no_go scenario.");
  }
  if (payload.data.unavailableCapabilities.length === 0) {
    throw new Error("Expected unavailable capabilities in no_go scenario.");
  }
  if (!payload.data.unavailableCapabilities.some((item) => item.id.startsWith("connector_"))) {
    throw new Error("Expected connector capabilities to be unavailable in no_go scenario.");
  }
  if (
    !payload.data.unavailableCapabilities.every(
      (item) => item.reason.trim().length > 0 && item.message.trim().length > 0
    )
  ) {
    throw new Error("Expected all unavailable capabilities to carry explicit reason/message labels.");
  }
}

function assertGoAudit(payload: ReleaseDecisionPayload) {
  if (payload.data.decision !== "go") {
    const apiMcpDomain = payload.data.domainAssessments.find((item) => item.id === "api_mcp_ga");
    const unresolvedRequirements = payload.data.closureAudit.requirements
      .filter((item) => item.status !== "proved")
      .map((item) => ({ id: item.id, status: item.status, gaps: item.gaps }));
    throw new Error(
      `Expected go decision in completion audit go scenario. decision=${payload.data.decision}; api_mcp_ga=${JSON.stringify(
        apiMcpDomain
      )}; unresolved=${JSON.stringify(unresolvedRequirements)}`
    );
  }
  if (payload.data.readinessBoard.goNoGo !== "go") throw new Error("Expected readiness board go state.");
  if (payload.data.onboardingChecklist.goNoGo !== "go") throw new Error("Expected onboarding checklist go state.");
  if (payload.data.onboardingChecklist.readinessMeter.completionPct !== 100) {
    throw new Error("Expected onboarding readiness completion at 100 in go scenario.");
  }
  if (payload.data.compliancePosture.certificationClaim !== "not_claimed") {
    throw new Error("Expected no unsupported certification claim in go scenario.");
  }
  if (payload.data.compliancePosture.soc2ReadinessStatus !== "controls_evidenced") {
    throw new Error("Expected SOC2 readiness controls_evidenced in go scenario.");
  }
  if (payload.data.compliancePosture.missingEvidence.length > 0) {
    throw new Error("Expected no missing SOC2 evidence entries in go scenario.");
  }
  if (payload.data.closureAudit.summary.total !== 18) throw new Error("Expected 18 closure requirements in go scenario.");
  if (payload.data.closureAudit.summary.blocked !== 0 || payload.data.closureAudit.summary.incomplete !== 0) {
    throw new Error("Expected no blocked/incomplete closure requirements in go scenario.");
  }
  if (payload.data.closureAudit.summary.proved !== payload.data.closureAudit.summary.total) {
    throw new Error("Expected all closure requirements proved in go scenario.");
  }
  assertExactIdSet({
    actual: payload.data.domainAssessments.map((item) => item.id),
    expected: REQUIRED_DOMAIN_IDS,
    label: "go domain assessments",
  });
  assertExactIdSet({
    actual: payload.data.closureAudit.requirements.map((item) => item.id),
    expected: REQUIRED_CLOSURE_IDS,
    label: "go closure requirements",
  });
  for (const id of REQUIRED_DOMAIN_IDS) {
    const domain = assertDomainExists(payload, id);
    if (domain.status !== "ready") throw new Error(`Expected ${id} ready in go scenario.`);
    if (domain.evidence.length === 0) throw new Error(`Expected ${id} evidence in go scenario.`);
    if (domain.blockingCodes.length !== 0) throw new Error(`Expected ${id} to have no blocking codes in go scenario.`);
  }
  for (const id of REQUIRED_CLOSURE_IDS) {
    const requirement = assertRequirementExists(payload, id);
    if (requirement.status !== "proved") throw new Error(`Expected closure requirement ${id} proved in go scenario.`);
    if (requirement.evidenceSources.length === 0) throw new Error(`Expected evidenceSources for ${id} in go scenario.`);
    if (requirement.evidenceQuality === "missing") throw new Error(`Expected non-missing evidence quality for ${id}.`);
    if (requirement.gaps.length !== 0) throw new Error(`Expected no gaps for ${id} in go scenario.`);
  }
  if (payload.data.unavailableCapabilities.length !== 0) {
    throw new Error("Expected zero unavailable capabilities in go scenario.");
  }
}

function assertActionableClosureRequirements(payload: ReleaseDecisionPayload) {
  for (const requirement of payload.data.closureAudit.requirements) {
    if (requirement.evidenceSources.length === 0) {
      throw new Error(`Expected evidence sources for closure requirement ${requirement.id}.`);
    }
    if (requirement.status !== "proved") {
      if (requirement.gaps.length === 0) {
        throw new Error(`Expected explicit gap codes for closure requirement ${requirement.id}.`);
      }
      if (requirement.nextActions.length === 0) {
        throw new Error(`Expected actionable next commands for closure requirement ${requirement.id}.`);
      }
    }
  }
}

function assertObjectiveCoverage(payload: ReleaseDecisionPayload) {
  assertExactIdSet({
    actual: payload.data.objectiveCoverage.map((item) => item.id),
    expected: REQUIRED_CLOSURE_IDS,
    label: "objective coverage requirements",
  });
  const objectiveById = new Map(payload.data.objectiveCoverage.map((item) => [item.id, item] as const));
  for (const requirementId of REQUIRED_CLOSURE_IDS) {
    const objective = objectiveById.get(requirementId);
    if (!objective) throw new Error(`Missing objective coverage for requirement ${requirementId}.`);
    if (objective.scope !== OBJECTIVE_SCOPE_BY_REQUIREMENT_ID[requirementId]) {
      throw new Error(
        `Objective scope mismatch for ${requirementId}: expected ${OBJECTIVE_SCOPE_BY_REQUIREMENT_ID[requirementId]}, got ${objective.scope}.`
      );
    }
  }

  const closureById = new Map(payload.data.closureAudit.requirements.map((item) => [item.id, item] as const));
  for (const objective of payload.data.objectiveCoverage) {
    const requirement = closureById.get(objective.id);
    if (!requirement) throw new Error(`Missing closure requirement for objective ${objective.id}.`);
    if (objective.status !== requirement.status) {
      throw new Error(`Objective status mismatch for ${objective.id}.`);
    }
    if (JSON.stringify(objective.evidenceSources) !== JSON.stringify(requirement.evidenceSources)) {
      throw new Error(`Objective evidence mismatch for ${objective.id}.`);
    }
    if (JSON.stringify(objective.gaps) !== JSON.stringify(requirement.gaps)) {
      throw new Error(`Objective gaps mismatch for ${objective.id}.`);
    }
    if (JSON.stringify(objective.nextActions) !== JSON.stringify(requirement.nextActions)) {
      throw new Error(`Objective nextActions mismatch for ${objective.id}.`);
    }
  }
}

async function createOrg(createOrganisation: (request: NextRequest) => Promise<Response>, name: string, userId: string) {
  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ name, industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error(`Failed to create organisation for ${name}.`);
  const payload = (await create.json()) as { data: { id: string } };
  return payload.data.id;
}

async function seedGoEvidence(repository: Awaited<ReturnType<typeof import("@/lib/repository").getRepository>>, orgId: string) {
  const now = new Date().toISOString();

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
  ] as const) {
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:feature_flag_upsert",
      details: { key, enabled: true, rolloutPercent: 100, updatedBy: "smoke-user-completion-audit-go-001" },
    });
  }

  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:billing_entitlement_upsert",
    details: {
      organisationId: orgId,
      plan: "enterprise",
      seatsLimit: 100,
      evaluationsMonthlyLimit: 10000,
      sourcesMonthlyLimit: 1000,
      connectorLimit: 20,
      autoSendEnabled: true,
      apiAccessEnabled: true,
      mcpAccessEnabled: true,
      status: "active",
      updatedAt: now,
    },
  });

  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:sso_config_upsert",
    details: {
      enabled: true,
      idpEntityId: "https://idp.example.com/entity",
      ssoUrl: "https://idp.example.com/saml",
      certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
      metadataSource: "manual",
      updatedAt: now,
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:mcp_capability_evaluated",
    details: {
      capabilityId: "mcp_actions",
      actorId: "smoke-user-completion-audit-go-001",
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
        actorId: "smoke-user-completion-audit-go-001",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:connector_sync_result",
      details: {
        provider,
        syncStatus: "succeeded",
        actorId: "smoke-user-completion-audit-go-001",
      },
    });
  }

  const source = await repository.createSource({
    organisationId: orgId,
    title: "Completion Audit Source",
    sourceType: "txt",
    rawText: "Enterprise communications governance source.",
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
        reviewedBy: "smoke-user-completion-audit-go-001",
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
    actorId: "smoke-user-completion-audit-go-001",
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
    details: { id: "api-key-completion-go-smoke", actorId: "smoke-user-completion-audit-go-001" },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:legal_hold_placed",
    details: {
      holdId: "hold-completion-go-smoke",
      scope: "global",
      reason: "Governance exercise",
      ticketRef: "SMOKE-COMPLETE-001",
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:break_glass_invoked",
    details: {
      invocationId: "breakglass-completion-go-smoke",
      reason: "Incident response drill",
      durationMinutes: 30,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:scim_bulk_operation",
    details: {
      operation: "PATCH",
      resourceType: "User",
      resourceId: "scim-user-completion-001",
      status: "success",
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:scim_user_status_set",
    details: {
      userId: "scim-user-completion-001",
      active: true,
      reason: "Provisioned",
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:scim_drift_reconcile_run",
    details: {
      runId: "scim-reconcile-completion-go-smoke",
      apply: true,
      issues: 0,
      resolved: 0,
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:member_role_updated",
    details: {
      memberId: "member-completion-go-smoke-001",
      previousRole: "member",
      newRole: "analyst",
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:member_invite_created",
    details: {
      inviteId: "invite-completion-go-smoke-001",
      email: "invitee-completion-go@example.com",
      role: "member",
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:approval_rule_upsert",
    details: {
      id: "approval-rule-completion-go-smoke-001",
      name: "Completion GO approval boundary",
      channel: "email",
      enabled: true,
      maxRiskLevel: "low",
      minScore: 90,
      updatedBy: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: "source-completion-go-smoke-001",
    action: "source_uploaded",
    details: {
      sourceType: "pasted_text",
      title: "Completion GO Evidence Source",
      authorityLevel: "standard",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: "source-completion-go-smoke-001",
    action: "source_process_requested",
    details: {
      sourceId: "source-completion-go-smoke-001",
      mode: "manual",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:deletion_completed",
    details: {
      id: "deletion-completion-go-smoke",
      completion: {
        completedBy: "smoke-user-completion-audit-go-001",
        completedAt: now,
        executionMode: "soft_delete",
        proofRecordId: "proof-completion-go-smoke",
        deletionEvidenceHash: "hash-completion-go-smoke",
        deletedObjectCounts: { sources: 1, evaluations: 1, exports: 0, jobs: 0 },
        notes: "completion-go smoke",
      },
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:auto_send_decision_recorded",
    details: {
      requestKey: "completion-go-smoke-request",
      actorId: "smoke-user-completion-audit-go-001",
      decision: { allowed: true, state: "allowed" },
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:send_event_created",
    details: {
      id: "completion-go-smoke-send-001",
      status: "queued",
      autoSend: true,
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:send_event_delivery_confirmed",
    details: {
      id: "completion-go-smoke-send-001",
      confirmationSource: "auto_send_worker",
      confirmationId: "provider-msg-completion-001",
      actorId: "smoke-user-completion-audit-go-001",
    },
  });
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { GET: getReleaseDecision } = await import("@/app/api/enterprise/release-decision/route");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  const previousEnv = Object.fromEntries(RUNTIME_ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
    (typeof RUNTIME_ENV_KEYS)[number],
    string | undefined
  >;

  try {
    resetMemoryRepository();
    clearRuntimeEnv();

    const noGoOrgId = await createOrg(createOrganisation, "Release Decision Completion Audit No-Go Org", "smoke-user-completion-audit-001");
    const noGoResponse = await getReleaseDecision(
      authedRequest("http://localhost/api/enterprise/release-decision", noGoOrgId, {}, "smoke-user-completion-audit-001")
    );
    if (!noGoResponse.ok) throw new Error("Release decision endpoint failed in no_go completion-audit scenario.");
    const noGoPayload = (await noGoResponse.json()) as ReleaseDecisionPayload;
    assertNoGoAudit(noGoPayload);
    assertActionableClosureRequirements(noGoPayload);
    assertObjectiveCoverage(noGoPayload);

    resetMemoryRepository();
    setGoEnv();

    const goOrgId = await createOrg(createOrganisation, "Release Decision Completion Audit Go Org", "smoke-user-completion-audit-go-001");
    const repository = getRepository();
    await seedGoEvidence(repository, goOrgId);

    const goResponse = await getReleaseDecision(
      authedRequest("http://localhost/api/enterprise/release-decision", goOrgId, {}, "smoke-user-completion-audit-go-001")
    );
    if (!goResponse.ok) throw new Error("Release decision endpoint failed in go completion-audit scenario.");
    const goPayload = (await goResponse.json()) as ReleaseDecisionPayload;
    assertGoAudit(goPayload);
    assertActionableClosureRequirements(goPayload);
    assertObjectiveCoverage(goPayload);

    console.log("release-decision-completion-audit-smoke:ok");
  } finally {
    for (const key of RUNTIME_ENV_KEYS) {
      const previousValue = previousEnv[key];
      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
