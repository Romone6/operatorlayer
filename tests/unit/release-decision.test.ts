import { describe, expect, it } from "vitest";

import { buildEnterpriseOnboardingChecklist } from "@/lib/enterprise/onboarding-checklist";
import type { EnterpriseCapabilityStatus } from "@/lib/enterprise/capability-status";
import { buildEnterpriseReleaseDecision } from "@/lib/enterprise/release-decision";
import type { ConnectorRecord, EnterpriseReleaseEvidenceSignals, ReadinessBoard } from "@/lib/types";

const PROVIDERS = ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const;

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

const REQUIRED_REQUIREMENT_IDS = [
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

function assertExactSet(actual: string[], expected: readonly string[], label: string) {
  const unique = Array.from(new Set(actual));
  expect(unique.length, `${label} should not contain duplicates`).toBe(actual.length);
  const missing = expected.filter((id) => !unique.includes(id));
  const unexpected = unique.filter((id) => !expected.includes(id));
  expect(missing, `${label} missing expected IDs`).toEqual([]);
  expect(unexpected, `${label} contains unexpected IDs`).toEqual([]);
}

function createBoardNoGo(): ReadinessBoard {
  return {
    generatedAt: "2026-05-21T00:00:00.000Z",
    goNoGo: "no_go",
    hardBlockerCount: 6,
    queueHealth: { queued: 0, running: 0, failed: 1, deadLetter: 0 },
    sloTargets: {
      apiLatencyP95Ms: 400,
      jobCompletionP95Minutes: 15,
      connectorSyncFreshnessMinutes: 60,
      evaluationThroughputPerMinute: 40,
      webhookDeliverySuccessRatePct: 99.5,
    },
    incidentSeverityPolicy: [
      { severity: "sev0", responseSlaMinutes: 5, escalationMinutes: 10, owner: "platform-director" },
      { severity: "sev1", responseSlaMinutes: 15, escalationMinutes: 30, owner: "platform-oncall" },
      { severity: "sev2", responseSlaMinutes: 30, escalationMinutes: 60, owner: "service-owner" },
      { severity: "sev3", responseSlaMinutes: 120, escalationMinutes: 240, owner: "product-owner" },
    ],
    blockers: [
      {
        code: "missing_env",
        category: "configuration",
        severity: "critical",
        owner: "platform-oncall",
        status: "open",
        remediation: "Set required environment variables.",
        nextCommand: "set-env",
        evidence: ["missing env"],
      },
      {
        code: "sso_disabled",
        category: "identity",
        severity: "high",
        owner: "iam-oncall",
        status: "open",
        remediation: "Enable SSO lifecycle.",
        nextCommand: "enable-sso",
        evidence: ["saml_sso disabled"],
      },
      {
        code: "billing_not_active",
        category: "billing",
        severity: "critical",
        owner: "billing-oncall",
        status: "open",
        remediation: "Activate enterprise billing entitlement.",
        nextCommand: "activate-billing",
        evidence: ["billing entitlement inactive"],
      },
      {
        code: "connector_gmail_disabled",
        category: "feature_flag",
        severity: "high",
        owner: "release-oncall",
        status: "open",
        remediation: "Enable connector feature flags.",
        nextCommand: "enable-connector-flags",
        evidence: ["gmail feature flag disabled"],
      },
      {
        code: "gmail_connector_missing",
        category: "connector",
        severity: "high",
        owner: "connector-oncall",
        status: "open",
        remediation: "Complete OAuth.",
        nextCommand: "connect-gmail",
        evidence: ["gmail not connected"],
      },
      {
        code: "queue_failed_jobs_present",
        category: "queue",
        severity: "high",
        owner: "queue-oncall",
        status: "open",
        remediation: "Replay failed jobs.",
        nextCommand: "replay-jobs",
        evidence: ["queue failed jobs"],
      },
    ],
  };
}

function createBoardGo(): ReadinessBoard {
  return {
    ...createBoardNoGo(),
    goNoGo: "go",
    hardBlockerCount: 0,
    queueHealth: { queued: 0, running: 0, failed: 0, deadLetter: 0 },
    blockers: [],
  };
}

function createCapabilityStatusNoGo(): EnterpriseCapabilityStatus {
  return {
    configured: false,
    missingEnvironment: ["OPENAI_API_KEY"],
    connectorReadiness: {
      gmail: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
      outlook: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
      hubspot: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
      salesforce: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
      intercom: ["INTERCOM_CLIENT_ID", "INTERCOM_CLIENT_SECRET"],
      zendesk: [
        "ZENDESK_CLIENT_ID",
        "ZENDESK_CLIENT_SECRET",
        "ZENDESK_AUTHORIZE_URL",
        "ZENDESK_TOKEN_URL",
        "ZENDESK_API_BASE_URL",
      ],
    },
    featureFlags: [],
    capabilityStates: [
      {
        id: "auto_send",
        state: "unavailable",
        reason: "billing_not_active",
        message: "Auto-send unavailable because billing entitlement is not active.",
      },
      {
        id: "mcp_actions",
        state: "unavailable",
        reason: "billing_not_active",
        message: "MCP actions unavailable because billing entitlement is not active.",
      },
      {
        id: "scim_write",
        state: "unavailable",
        reason: "scim_not_configured",
        message: "SCIM write unavailable because OPERATORLAYER_SCIM_TOKEN is not configured.",
      },
      {
        id: "saml_sso",
        state: "unavailable",
        reason: "sso_disabled",
        message: "SAML SSO unavailable because tenant identity lifecycle is not enabled.",
      },
      ...PROVIDERS.map((provider) => ({
        id: `connector_${provider}`,
        state: "unavailable" as const,
        reason: "connector_not_connected" as const,
        message: `${provider} connector unavailable because OAuth connection is not completed.`,
      })),
    ],
  };
}

function createCapabilityStatusGo(): EnterpriseCapabilityStatus {
  return {
    configured: true,
    missingEnvironment: [],
    connectorReadiness: {
      gmail: [],
      slack: [],
      outlook: [],
      hubspot: [],
      salesforce: [],
      intercom: [],
      zendesk: [],
    },
    featureFlags: [],
    capabilityStates: [
      { id: "auto_send", state: "available", reason: "enabled", message: "Auto-send is available." },
      { id: "mcp_actions", state: "available", reason: "enabled", message: "MCP actions are available." },
      { id: "scim_write", state: "available", reason: "enabled", message: "SCIM write is available." },
      { id: "saml_sso", state: "available", reason: "enabled", message: "SAML SSO is available." },
      ...PROVIDERS.map((provider) => ({
        id: `connector_${provider}`,
        state: "available" as const,
        reason: "enabled" as const,
        message: `${provider} connector is available.`,
      })),
    ],
  };
}

function createEvidenceSignalsNoGo(): EnterpriseReleaseEvidenceSignals {
  return {
    auditEvents: { total: 0, enterprise: 0, connector: 0, billing: 0, security: 0, governance: 0, mcp: 0 },
    intelligence: { evaluations: 0, reviewEvents: 0, policies: 0, scenarios: 0, conflicts: 0 },
    governanceLifecycles: { legalHoldEvents: 0, breakGlassEvents: 0, deletionEvents: 0, deletionProofEvents: 0 },
    iamLifecycles: {
      ssoConfigEvents: 0,
      scimBulkOperationEvents: 0,
      scimUserStatusEvents: 0,
      scimDriftReconcileEvents: 0,
      rbacRoleChangeEvents: 0,
      memberInviteLifecycleEvents: 0,
    },
    permissionedIngestionLifecycles: {
      sourceUploadedEvents: 0,
      sourceProcessRequestedEvents: 0,
      sourceReprocessRequestedEvents: 0,
    },
    autoSend: {
      approvalRuleEvents: 0,
      decisionEvents: 0,
      sendEventsCreated: 0,
      sendEventsDelivered: 0,
      sendEventsBlockedOrFailed: 0,
    },
    runtimeDenials: { connectorUnavailable: 0 },
  };
}

function createEvidenceSignalsGo(): EnterpriseReleaseEvidenceSignals {
  return {
    auditEvents: { total: 25, enterprise: 10, connector: 6, billing: 2, security: 3, governance: 3, mcp: 1 },
    intelligence: { evaluations: 1, reviewEvents: 1, policies: 1, scenarios: 1, conflicts: 0 },
    governanceLifecycles: { legalHoldEvents: 1, breakGlassEvents: 1, deletionEvents: 1, deletionProofEvents: 1 },
    iamLifecycles: {
      ssoConfigEvents: 1,
      scimBulkOperationEvents: 1,
      scimUserStatusEvents: 1,
      scimDriftReconcileEvents: 1,
      rbacRoleChangeEvents: 1,
      memberInviteLifecycleEvents: 1,
    },
    permissionedIngestionLifecycles: {
      sourceUploadedEvents: 1,
      sourceProcessRequestedEvents: 1,
      sourceReprocessRequestedEvents: 0,
    },
    autoSend: {
      approvalRuleEvents: 1,
      decisionEvents: 1,
      sendEventsCreated: 1,
      sendEventsDelivered: 1,
      sendEventsBlockedOrFailed: 0,
    },
    runtimeDenials: { connectorUnavailable: 0 },
  };
}

function createConnectorsNoGo(): ConnectorRecord[] {
  const now = "2026-05-21T00:00:00.000Z";
  return PROVIDERS.map((provider) => ({
    id: `connector-${provider}`,
    organisationId: "org-no-go",
    provider,
    status: "disconnected",
    displayName: provider.toUpperCase(),
    scopes: ["read"],
    connectionHealth: "offline",
    sourceSelection: ["all"],
    syncSchedule: "hourly",
    lastSyncAt: null,
    lastSyncStatus: "never",
    lastSyncError: "not_connected",
    tokenRef: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  }));
}

function createConnectorsGo(): ConnectorRecord[] {
  const now = "2026-05-21T00:00:00.000Z";
  return PROVIDERS.map((provider) => ({
    id: `connector-${provider}`,
    organisationId: "org-go",
    provider,
    status: "connected",
    displayName: provider.toUpperCase(),
    scopes: ["read"],
    connectionHealth: "healthy",
    sourceSelection: ["all"],
    syncSchedule: "hourly",
    lastSyncAt: now,
    lastSyncStatus: "succeeded",
    lastSyncError: null,
    tokenRef: `token-${provider}`,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  }));
}

describe("buildEnterpriseReleaseDecision", () => {
  it("returns fail-closed no_go with exact domain and requirement composition when prerequisites are missing", () => {
    const board = createBoardNoGo();
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus: createCapabilityStatusNoGo(),
      evidenceSignals: createEvidenceSignalsNoGo(),
      procurementDocs: {
        architectureBrief: true,
        securityQuestionnaireBaseline: true,
        connectorScopeMatrix: true,
        governanceWalkthrough: true,
      },
      connectors: createConnectorsNoGo(),
      developerDocs: {
        apiV1: true,
        mcpV1: true,
      },
      operationsDocs: {
        sloTargets: true,
        incidentResponseRunbook: true,
        backupRestoreDrill: true,
        queueReplayDisasterExercise: true,
        providerOutageChaosExercise: true,
      },
    });

    expect(decision.decision).toBe("no_go");
    expect(decision.closureAudit.summary.total).toBe(18);
    expect(decision.closureAudit.summary.blocked).toBeGreaterThan(0);
    expect(decision.summary.unavailableCapabilityCount).toBeGreaterThan(0);
    assertExactSet(
      decision.domainAssessments.map((item) => item.id),
      REQUIRED_DOMAIN_IDS,
      "domainAssessments"
    );
    assertExactSet(
      decision.closureAudit.requirements.map((item) => item.id),
      REQUIRED_REQUIREMENT_IDS,
      "closureAudit.requirements"
    );
    assertExactSet(
      decision.objectiveCoverage.map((item) => item.id),
      REQUIRED_REQUIREMENT_IDS,
      "objectiveCoverage"
    );

    const objectiveCoverageById = new Map(decision.objectiveCoverage.map((item) => [item.id, item]));
    expect(objectiveCoverageById.get("reliability_control_plane")?.scope).toBe("domain");
    expect(objectiveCoverageById.get("soc2_ready_architecture_evidence")?.scope).toBe("compliance");
    expect(objectiveCoverageById.get("runtime_disabled_unsupported_capabilities")?.scope).toBe("runtime_safety");
    expect(objectiveCoverageById.get("non_negotiable_permissioned_ingestion")?.scope).toBe("non_negotiable");
    expect(objectiveCoverageById.get("no_unsupported_certification_claims")?.scope).toBe("compliance");

    const expectedNoGoStatuses = new Map<string, "ready" | "blocked" | "verification_gap">([
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
    for (const [id, status] of expectedNoGoStatuses) {
      expect(decision.domainAssessments.find((item) => item.id === id)?.status).toBe(status);
    }

    const runtimeDisabledRequirement = decision.closureAudit.requirements.find(
      (item) => item.id === "runtime_disabled_unsupported_capabilities"
    );
    expect(runtimeDisabledRequirement?.status).toBe("incomplete");
    expect(runtimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_proof_missing");
    expect(runtimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_proof_missing_connector_gmail");
    expect(runtimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_proof_missing_connector_zendesk");
    expect(runtimeDisabledRequirement?.gaps).toContain("mcp_runtime_disable_proof_missing");
    expect(runtimeDisabledRequirement?.gaps).toContain("auto_send_runtime_disable_proof_missing");
    expect(runtimeDisabledRequirement?.gaps).toContain("scim_runtime_disable_proof_missing");
    expect(runtimeDisabledRequirement?.gaps).toContain("saml_runtime_disable_proof_missing");
    const closureRequirementsById = new Map(decision.closureAudit.requirements.map((item) => [item.id, item]));
    for (const requirement of decision.closureAudit.requirements) {
      expect(requirement.evidenceSources.length, `${requirement.id} should include evidence sources`).toBeGreaterThan(0);
      if (requirement.status !== "proved") {
        expect(requirement.gaps.length, `${requirement.id} should include explicit gap codes`).toBeGreaterThan(0);
        expect(requirement.nextActions.length, `${requirement.id} should include actionable next commands`).toBeGreaterThan(0);
      }
    }
    for (const objective of decision.objectiveCoverage) {
      const requirement = closureRequirementsById.get(objective.id);
      expect(requirement, `missing closure requirement for objective ${objective.id}`).toBeDefined();
      expect(objective.status).toBe(requirement?.status);
      expect(objective.gaps).toEqual(requirement?.gaps ?? []);
      expect(objective.nextActions).toEqual(requirement?.nextActions ?? []);
      expect(objective.evidenceSources).toEqual(requirement?.evidenceSources ?? []);
      if (objective.status !== "proved") {
        expect(objective.gaps.length, `${objective.id} should include explicit gap codes`).toBeGreaterThan(0);
        expect(objective.nextActions.length, `${objective.id} should include actionable next commands`).toBeGreaterThan(
          0
        );
      }
    }
  });

  it("requires runtime-denial reason evidence to match unavailable capability reasons", () => {
    const board = createBoardNoGo();
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const capabilityStatus = createCapabilityStatusNoGo();
    const unavailableCapabilityIds = capabilityStatus.capabilityStates
      .filter((item) => item.state === "unavailable")
      .map((item) => item.id);
    const evidenceSignals = createEvidenceSignalsNoGo();
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus,
      evidenceSignals: {
        ...evidenceSignals,
        runtimeDenials: {
          connectorUnavailable: PROVIDERS.length,
          mcpUnavailable: 1,
          autoSendUnavailable: 1,
          scimWriteUnavailable: 1,
          samlSsoUnavailable: 1,
          capabilityIds: unavailableCapabilityIds,
          entries: [
            ...PROVIDERS.map((provider) => ({
              capabilityId: `connector_${provider}`,
              reason: "feature_flag_disabled",
            })),
            { capabilityId: "mcp_actions", reason: "billing_not_active" },
            { capabilityId: "auto_send", reason: "billing_not_active" },
            { capabilityId: "scim_write", reason: "scim_not_configured" },
            { capabilityId: "saml_sso", reason: "sso_disabled" },
          ],
        },
      },
      procurementDocs: {
        architectureBrief: true,
        securityQuestionnaireBaseline: true,
        connectorScopeMatrix: true,
        governanceWalkthrough: true,
      },
      connectors: createConnectorsNoGo(),
      developerDocs: {
        apiV1: true,
        mcpV1: true,
      },
      operationsDocs: {
        sloTargets: true,
        incidentResponseRunbook: true,
        backupRestoreDrill: true,
        queueReplayDisasterExercise: true,
        providerOutageChaosExercise: true,
      },
    });

    const runtimeDisabledRequirement = decision.closureAudit.requirements.find(
      (item) => item.id === "runtime_disabled_unsupported_capabilities"
    );
    expect(runtimeDisabledRequirement?.status).toBe("incomplete");
    expect(runtimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_reason_mismatch");
    expect(runtimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_reason_mismatch_connector_gmail");
    expect(runtimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_reason_mismatch_connector_zendesk");
    expect(runtimeDisabledRequirement?.evidenceSources).toContain(
      "runtime_denial_capability_ids=auto_send,connector_gmail,connector_hubspot,connector_intercom,connector_outlook,connector_salesforce,connector_slack,connector_zendesk,mcp_actions,saml_sso,scim_write"
    );
    expect(runtimeDisabledRequirement?.evidenceSources).toContain(
      "runtime_denial_reason_entries=auto_send:billing_not_active,connector_gmail:feature_flag_disabled,connector_hubspot:feature_flag_disabled,connector_intercom:feature_flag_disabled,connector_outlook:feature_flag_disabled,connector_salesforce:feature_flag_disabled,connector_slack:feature_flag_disabled,connector_zendesk:feature_flag_disabled,mcp_actions:billing_not_active,saml_sso:sso_disabled,scim_write:scim_not_configured"
    );
  });

  it("returns go with all domains ready and all closure requirements proved when full evidence is present", () => {
    const board = createBoardGo();
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus: createCapabilityStatusGo(),
      evidenceSignals: createEvidenceSignalsGo(),
      procurementDocs: {
        architectureBrief: true,
        securityQuestionnaireBaseline: true,
        connectorScopeMatrix: true,
        governanceWalkthrough: true,
      },
      connectors: createConnectorsGo(),
      developerDocs: {
        apiV1: true,
        mcpV1: true,
      },
      operationsDocs: {
        sloTargets: true,
        incidentResponseRunbook: true,
        backupRestoreDrill: true,
        queueReplayDisasterExercise: true,
        providerOutageChaosExercise: true,
      },
    });

    expect(decision.decision).toBe("go");
    expect(decision.compliancePosture.certificationClaim).toBe("not_claimed");
    expect(decision.compliancePosture.soc2ReadinessStatus).toBe("controls_evidenced");
    expect(decision.closureAudit.summary.total).toBe(18);
    expect(decision.closureAudit.summary.proved).toBe(18);
    expect(decision.closureAudit.summary.blocked).toBe(0);
    expect(decision.closureAudit.summary.incomplete).toBe(0);
    expect(decision.unavailableCapabilities).toHaveLength(0);
    expect(decision.nextActions).toHaveLength(0);
    assertExactSet(
      decision.domainAssessments.map((item) => item.id),
      REQUIRED_DOMAIN_IDS,
      "domainAssessments"
    );
    assertExactSet(
      decision.closureAudit.requirements.map((item) => item.id),
      REQUIRED_REQUIREMENT_IDS,
      "closureAudit.requirements"
    );
    assertExactSet(
      decision.objectiveCoverage.map((item) => item.id),
      REQUIRED_REQUIREMENT_IDS,
      "objectiveCoverage"
    );
    expect(decision.domainAssessments.every((item) => item.status === "ready")).toBe(true);
    expect(decision.closureAudit.requirements.every((item) => item.status === "proved")).toBe(true);
    expect(decision.closureAudit.requirements.every((item) => item.gaps.length === 0)).toBe(true);
    expect(decision.closureAudit.requirements.every((item) => item.evidenceSources.length > 0)).toBe(true);
    expect(decision.objectiveCoverage.every((item) => item.status === "proved")).toBe(true);
    expect(decision.objectiveCoverage.every((item) => item.gaps.length === 0)).toBe(true);
    expect(decision.objectiveCoverage.every((item) => item.nextActions.length === 0)).toBe(true);
    expect(decision.objectiveCoverage.every((item) => item.evidenceSources.length > 0)).toBe(true);
  });

  it("marks api_mcp_ga as verification_gap when API/MCP developer docs evidence is missing", () => {
    const board = createBoardGo();
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus: createCapabilityStatusGo(),
      evidenceSignals: createEvidenceSignalsGo(),
      procurementDocs: {
        architectureBrief: true,
        securityQuestionnaireBaseline: true,
        connectorScopeMatrix: true,
        governanceWalkthrough: true,
      },
      connectors: createConnectorsGo(),
      developerDocs: {
        apiV1: false,
        mcpV1: false,
      },
      operationsDocs: {
        sloTargets: true,
        incidentResponseRunbook: true,
        backupRestoreDrill: true,
        queueReplayDisasterExercise: true,
        providerOutageChaosExercise: true,
      },
    });

    expect(decision.decision).toBe("no_go");
    const apiMcpDomain = decision.domainAssessments.find((item) => item.id === "api_mcp_ga");
    expect(apiMcpDomain?.status).toBe("verification_gap");
    expect(apiMcpDomain?.blockingCodes).toContain("api_v1_docs_missing");
    expect(apiMcpDomain?.blockingCodes).toContain("mcp_v1_docs_missing");

    const apiMcpRequirement = decision.closureAudit.requirements.find((item) => item.id === "api_mcp_ga");
    expect(apiMcpRequirement?.status).toBe("incomplete");
    expect(apiMcpRequirement?.gaps).toContain("api_v1_docs_missing");
    expect(apiMcpRequirement?.gaps).toContain("mcp_v1_docs_missing");
  });

  it("marks billing_entitlements as verification_gap when billing lifecycle evidence is missing", () => {
    const board = createBoardGo();
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const goSignals = createEvidenceSignalsGo();
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus: createCapabilityStatusGo(),
      evidenceSignals: {
        ...goSignals,
        auditEvents: {
          ...goSignals.auditEvents,
          billing: 0,
        },
      },
      procurementDocs: {
        architectureBrief: true,
        securityQuestionnaireBaseline: true,
        connectorScopeMatrix: true,
        governanceWalkthrough: true,
      },
      connectors: createConnectorsGo(),
      developerDocs: {
        apiV1: true,
        mcpV1: true,
      },
      operationsDocs: {
        sloTargets: true,
        incidentResponseRunbook: true,
        backupRestoreDrill: true,
        queueReplayDisasterExercise: true,
        providerOutageChaosExercise: true,
      },
    });

    expect(decision.decision).toBe("no_go");
    const billingDomain = decision.domainAssessments.find((item) => item.id === "billing_entitlements");
    expect(billingDomain?.status).toBe("verification_gap");
    expect(billingDomain?.blockingCodes).toContain("billing_lifecycle_evidence_missing");

    const billingRequirement = decision.closureAudit.requirements.find((item) => item.id === "billing_entitlements");
    expect(billingRequirement?.status).toBe("incomplete");
    expect(billingRequirement?.gaps).toContain("billing_lifecycle_evidence_missing");
  });

  it("marks iam_saml_scim_rbac_audit as verification_gap when IAM security audit evidence is missing", () => {
    const board = createBoardGo();
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const goSignals = createEvidenceSignalsGo();
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus: createCapabilityStatusGo(),
      evidenceSignals: {
        ...goSignals,
        auditEvents: {
          ...goSignals.auditEvents,
          security: 0,
        },
      },
      procurementDocs: {
        architectureBrief: true,
        securityQuestionnaireBaseline: true,
        connectorScopeMatrix: true,
        governanceWalkthrough: true,
      },
      connectors: createConnectorsGo(),
      developerDocs: {
        apiV1: true,
        mcpV1: true,
      },
      operationsDocs: {
        sloTargets: true,
        incidentResponseRunbook: true,
        backupRestoreDrill: true,
        queueReplayDisasterExercise: true,
        providerOutageChaosExercise: true,
      },
    });

    expect(decision.decision).toBe("no_go");
    const iamDomain = decision.domainAssessments.find((item) => item.id === "iam_saml_scim_rbac_audit");
    expect(iamDomain?.status).toBe("verification_gap");
    expect(iamDomain?.blockingCodes).toContain("iam_security_audit_evidence_missing");

    const iamRequirement = decision.closureAudit.requirements.find((item) => item.id === "iam_saml_scim_rbac_audit");
    expect(iamRequirement?.status).toBe("incomplete");
    expect(iamRequirement?.gaps).toContain("iam_security_audit_evidence_missing");
  });

  it("marks reliability_control_plane as verification_gap when source processing reliability evidence is missing", () => {
    const board = createBoardGo();
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const goSignals = createEvidenceSignalsGo();
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus: createCapabilityStatusGo(),
      evidenceSignals: {
        ...goSignals,
        permissionedIngestionLifecycles: {
          sourceUploadedEvents: 0,
          sourceProcessRequestedEvents: 0,
          sourceReprocessRequestedEvents: 0,
        },
      },
      procurementDocs: {
        architectureBrief: true,
        securityQuestionnaireBaseline: true,
        connectorScopeMatrix: true,
        governanceWalkthrough: true,
      },
      connectors: createConnectorsGo(),
      developerDocs: {
        apiV1: true,
        mcpV1: true,
      },
      operationsDocs: {
        sloTargets: true,
        incidentResponseRunbook: true,
        backupRestoreDrill: true,
        queueReplayDisasterExercise: true,
        providerOutageChaosExercise: true,
      },
    });

    expect(decision.decision).toBe("no_go");
    const reliabilityDomain = decision.domainAssessments.find((item) => item.id === "reliability_control_plane");
    expect(reliabilityDomain?.status).toBe("verification_gap");
    expect(reliabilityDomain?.blockingCodes).toContain("source_upload_lifecycle_evidence_missing");
    expect(reliabilityDomain?.blockingCodes).toContain("source_processing_lifecycle_evidence_missing");

    const reliabilityRequirement = decision.closureAudit.requirements.find(
      (item) => item.id === "reliability_control_plane"
    );
    expect(reliabilityRequirement?.status).toBe("incomplete");
    expect(reliabilityRequirement?.gaps).toContain("source_upload_lifecycle_evidence_missing");
    expect(reliabilityRequirement?.gaps).toContain("source_processing_lifecycle_evidence_missing");
  });
});
