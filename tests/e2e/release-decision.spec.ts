import { type APIRequestContext, expect, test } from "@playwright/test";

const CONNECTOR_PROVIDERS = ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const;
const SCIM_TOKEN = "e2e-scim-token";

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

function ownerHeaders(userId: string, orgId: string) {
  return {
    "x-user-id": userId,
    "x-user-role": "owner",
    "x-org-id": orgId,
  };
}

function expectExactIdSet(actual: string[], expected: readonly string[], label: string) {
  const uniqueActual = Array.from(new Set(actual));
  expect(uniqueActual.length, `${label} should not contain duplicates.`).toBe(actual.length);
  expect(uniqueActual.sort(), `${label} should match expected ids.`).toEqual([...expected].sort());
}

function expectObjectiveCoverageParity(input: {
  closureRequirements: Array<{
    id: string;
    status: "proved" | "blocked" | "incomplete";
    gaps: string[];
    nextActions: string[];
    evidenceSources: string[];
  }>;
  objectiveCoverage: Array<{
    id: string;
    scope: "domain" | "compliance" | "runtime_safety" | "non_negotiable";
    status: "proved" | "blocked" | "incomplete";
    gaps: string[];
    nextActions: string[];
    evidenceSources: string[];
  }>;
}) {
  expectExactIdSet(
    input.objectiveCoverage.map((item) => item.id),
    REQUIRED_CLOSURE_IDS,
    "objective coverage"
  );
  const closureById = new Map(input.closureRequirements.map((item) => [item.id, item] as const));
  for (const objective of input.objectiveCoverage) {
    expect(objective.scope).toBe(OBJECTIVE_SCOPE_BY_REQUIREMENT_ID[objective.id as (typeof REQUIRED_CLOSURE_IDS)[number]]);
    const requirement = closureById.get(objective.id);
    expect(requirement, `Missing closure requirement for objective ${objective.id}.`).toBeDefined();
    expect(objective.status).toBe(requirement?.status);
    expect(objective.gaps).toEqual(requirement?.gaps ?? []);
    expect(objective.nextActions).toEqual(requirement?.nextActions ?? []);
    expect(objective.evidenceSources).toEqual(requirement?.evidenceSources ?? []);
  }
}

async function createOrganisation(request: APIRequestContext, userId: string, name: string) {
  const response = await request.post("/api/organisations", {
    headers: {
      "x-user-id": userId,
      "Content-Type": "application/json",
    },
    data: {
      name,
      industry: "SaaS",
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data: { id: string } };
  expect(payload.data.id).toBeTruthy();
  return payload.data.id;
}

test("enterprise release decision endpoint is fail-closed and actionable over live HTTP", async ({ request }) => {
  const userId = "e2e-release-decision-user-001";
  const orgId = await createOrganisation(request, userId, "E2E Release Decision No-Go Org");

  const releaseDecisionResponse = await request.get("/api/enterprise/release-decision", {
    headers: ownerHeaders(userId, orgId),
  });
  expect(releaseDecisionResponse.ok()).toBeTruthy();

  const releaseDecisionPayload = (await releaseDecisionResponse.json()) as {
    data: {
      decision: "go" | "no_go";
      closureAudit: {
        summary: { total: number; proved: number; blocked: number; incomplete: number };
        requirements: Array<{
          id: string;
          status: "proved" | "blocked" | "incomplete";
          gaps: string[];
          nextActions: string[];
          evidenceSources: string[];
        }>;
      };
      objectiveCoverage: Array<{
        id: string;
        scope: "domain" | "compliance" | "runtime_safety" | "non_negotiable";
        status: "proved" | "blocked" | "incomplete";
        gaps: string[];
        nextActions: string[];
        evidenceSources: string[];
      }>;
      domainAssessments: Array<{
        id: string;
        status: "ready" | "blocked" | "verification_gap";
      }>;
      unavailableCapabilities: Array<{ id: string; reason: string; message: string }>;
      compliancePosture: {
        certificationClaim: "not_claimed";
      };
    };
  };

  expect(releaseDecisionPayload.data.decision).toBe("no_go");
  expect(releaseDecisionPayload.data.closureAudit.summary.total).toBe(18);
  expect(
    releaseDecisionPayload.data.closureAudit.summary.blocked + releaseDecisionPayload.data.closureAudit.summary.incomplete
  ).toBeGreaterThan(0);
  expect(releaseDecisionPayload.data.compliancePosture.certificationClaim).toBe("not_claimed");
  expectExactIdSet(
    releaseDecisionPayload.data.domainAssessments.map((item) => item.id),
    REQUIRED_DOMAIN_IDS,
    "domain assessments"
  );
  expectExactIdSet(
    releaseDecisionPayload.data.closureAudit.requirements.map((item) => item.id),
    REQUIRED_CLOSURE_IDS,
    "closure requirements"
  );
  expectObjectiveCoverageParity({
    closureRequirements: releaseDecisionPayload.data.closureAudit.requirements,
    objectiveCoverage: releaseDecisionPayload.data.objectiveCoverage,
  });

  const runtimeDisabledRequirement = releaseDecisionPayload.data.closureAudit.requirements.find(
    (item) => item.id === "runtime_disabled_unsupported_capabilities"
  );
  expect(runtimeDisabledRequirement).toBeDefined();
  expect(runtimeDisabledRequirement?.status).not.toBe("proved");

  for (const requirement of releaseDecisionPayload.data.closureAudit.requirements) {
    expect(requirement.evidenceSources.length, `${requirement.id} should include evidence sources.`).toBeGreaterThan(0);
    if (requirement.status !== "proved") {
      expect(requirement.gaps.length, `${requirement.id} should include explicit gap codes.`).toBeGreaterThan(0);
      expect(requirement.nextActions.length, `${requirement.id} should include actionable next commands.`).toBeGreaterThan(0);
    }
  }

  expect(releaseDecisionPayload.data.unavailableCapabilities.length).toBeGreaterThan(0);
  expect(
    releaseDecisionPayload.data.unavailableCapabilities.every(
      (item) => item.reason.trim().length > 0 && item.message.trim().length > 0
    )
  ).toBe(true);
});

test("enterprise release decision remains no_go until real connector sync-success evidence exists", async ({ request }) => {
  const userId = "e2e-release-decision-user-go-001";
  const orgId = await createOrganisation(request, userId, "E2E Release Decision Go Org");
  const headers = ownerHeaders(userId, orgId);

  const allFlagKeys = [
    "auto_send",
    "mcp_actions",
    "scim_write",
    ...CONNECTOR_PROVIDERS.map((provider) => `connector_${provider}`),
  ];
  for (const key of allFlagKeys) {
    const response = await request.patch("/api/feature-flags", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { key, enabled: true, rolloutPercent: 100 },
    });
    expect(response.ok(), `Expected feature-flag patch to succeed for ${key}.`).toBeTruthy();
  }

  const entitlementResponse = await request.patch("/api/billing/entitlements", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      plan: "enterprise",
      status: "active",
      autoSendEnabled: true,
      apiAccessEnabled: true,
      mcpAccessEnabled: true,
      connectorLimit: 20,
      evaluationsMonthlyLimit: 10000,
      sourcesMonthlyLimit: 1000,
      seatsLimit: 100,
    },
  });
  expect(entitlementResponse.ok()).toBeTruthy();

  const ssoResponse = await request.patch("/api/sso/config", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      enabled: true,
      idpEntityId: "https://idp.example.com/entity",
      ssoUrl: "https://idp.example.com/saml",
      certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
      domainAllowlist: ["example.com"],
    },
  });
  expect(ssoResponse.ok()).toBeTruthy();

  const apiKeyResponse = await request.post("/api/api-keys", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      name: "E2E Enterprise API Key",
      scopes: ["api:read"],
    },
  });
  expect(apiKeyResponse.ok()).toBeTruthy();

  const scimBulkResponse = await request.post("/api/scim/v2/Bulk", {
    headers: {
      Authorization: `Bearer ${SCIM_TOKEN}`,
      "x-ol-org-id": orgId,
      "Content-Type": "application/json",
    },
    data: {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
      Operations: [
        {
          method: "POST",
          path: "/Users",
          data: {
            userName: "scim-go-user-001",
            emails: [{ value: "scim-go-user-001@example.com" }],
            active: true,
            roles: [{ value: "member" }],
          },
        },
      ],
    },
  });
  expect(scimBulkResponse.ok()).toBeTruthy();

  const scimReconcileResponse = await request.post("/api/scim/v2/reconcile?apply=1", {
    headers: {
      Authorization: `Bearer ${SCIM_TOKEN}`,
      "x-ol-org-id": orgId,
      "Content-Type": "application/json",
    },
  });
  expect(scimReconcileResponse.ok()).toBeTruthy();

  const uploadResponse = await request.post("/api/sources/upload", {
    headers,
    multipart: {
      title: "E2E Release Decision Source",
      sourceType: "pasted_text",
      authorityLevel: "standard",
      pastedText:
        "Enterprise objection handling guidance. Acknowledge concern, reframe with approved value language, and escalate exceptions to review queue.",
    },
  });
  expect(uploadResponse.ok()).toBeTruthy();

  const reviewQueueResponse = await request.get("/api/review-queue", { headers });
  expect(reviewQueueResponse.ok()).toBeTruthy();
  const reviewQueuePayload = (await reviewQueueResponse.json()) as {
    data: {
      items: Array<{ id: string; entityType: "policy" | "terminology" | "conflict" }>;
    };
  };
  const policyItem = reviewQueuePayload.data.items.find((item) => item.entityType === "policy");
  expect(policyItem, "Expected at least one policy review item after source extraction.").toBeDefined();

  const approvePolicyResponse = await request.post("/api/review-queue/actions", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      itemType: "policy",
      itemId: policyItem?.id,
      action: "approve",
    },
  });
  expect(approvePolicyResponse.ok()).toBeTruthy();

  const evaluateResponse = await request.post("/api/playground/evaluate-repair", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      inputMessage: "Customer says the proposed annual commitment is too expensive.",
      channel: "email",
      team: "sales",
      customerType: "enterprise",
      draft: "We can discount immediately and bypass approvals.",
      context: "Enterprise pricing objection response policy.",
    },
  });
  expect(evaluateResponse.ok()).toBeTruthy();

  const approvalRuleResponse = await request.post("/api/approval-rules", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      name: "Low-risk high-score auto-send",
      scenario: "pricing_objection",
      minScore: 90,
      riskLevels: ["low"],
      channelAllowlist: ["email"],
      customerTypeAllowlist: ["enterprise"],
      requiresHumanApproval: false,
      enabled: true,
    },
  });
  expect(approvalRuleResponse.ok()).toBeTruthy();

  const autoSendDecisionResponse = await request.post("/api/auto-send/decide", {
    headers: { ...headers, "Content-Type": "application/json", "Idempotency-Key": "e2e-auto-send-go-001" },
    data: {
      evaluationId: "e2e-eval-go-001",
      scenarioId: "e2e-scenario-go-001",
      workspaceId: "workspace-go-001",
      score: 95,
      riskLevel: "low",
      channel: "email",
      customerType: "enterprise",
      draft: "Thank you for raising this. We can proceed with a scoped pilot plan and approved next steps.",
      recipient: "customer@example.com",
      evidence: ["e2e-release-decision-go"],
    },
  });
  expect(autoSendDecisionResponse.ok()).toBeTruthy();

  const workerResponse = await request.post("/api/jobs/worker?max=10", {
    headers: { ...headers, "Content-Type": "application/json" },
  });
  expect(workerResponse.ok()).toBeTruthy();

  const legalHoldPlaceResponse = await request.post("/api/data-governance/legal-hold", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      scope: "global",
      reason: "E2E governance lifecycle legal hold placement.",
      ticketRef: "E2E-LEGAL-HOLD-001",
    },
  });
  expect(legalHoldPlaceResponse.ok()).toBeTruthy();

  const legalHoldReleaseResponse = await request.patch("/api/data-governance/legal-hold", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      action: "release",
      reason: "E2E governance lifecycle legal hold release.",
      ticketRef: "E2E-LEGAL-HOLD-002",
    },
  });
  expect(legalHoldReleaseResponse.ok()).toBeTruthy();

  const breakGlassInvokeResponse = await request.post("/api/data-governance/break-glass", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      reason: "E2E governance lifecycle break-glass invocation.",
      ticketRef: "E2E-BREAK-GLASS-001",
      durationMinutes: 30,
    },
  });
  expect(breakGlassInvokeResponse.ok()).toBeTruthy();

  const breakGlassReleaseResponse = await request.patch("/api/data-governance/break-glass", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      reason: "E2E governance lifecycle break-glass release.",
    },
  });
  expect(breakGlassReleaseResponse.ok()).toBeTruthy();

  const deletionRequestResponse = await request.post("/api/data-governance/deletion-requests", {
    headers: { ...headers, "Content-Type": "application/json" },
    data: {
      reason: "E2E governance lifecycle deletion request evidence.",
      target: "sources_only",
    },
  });
  expect(deletionRequestResponse.ok()).toBeTruthy();

  for (const provider of CONNECTOR_PROVIDERS) {
    const connectorResponse = await request.post("/api/connectors", {
      headers: { ...headers, "Content-Type": "application/json" },
      data: {
        provider,
        displayName: `${provider.toUpperCase()} Connector`,
        scopes: ["read"],
        sourceSelection: ["all"],
        syncSchedule: "hourly",
        tokenRef: `${provider}-token-ref`,
      },
    });
    expect(connectorResponse.ok(), `Expected connector upsert to succeed for ${provider}.`).toBeTruthy();
  }

  for (const provider of CONNECTOR_PROVIDERS) {
    const syncResponse = await request.post(`/api/connectors/${provider}/sync`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
    expect(syncResponse.ok(), `Expected connector sync enqueue to succeed for ${provider}.`).toBeTruthy();
  }

  const releaseDecisionResponse = await request.get("/api/enterprise/release-decision", {
    headers,
  });
  expect(releaseDecisionResponse.ok()).toBeTruthy();

  const payload = (await releaseDecisionResponse.json()) as {
    data: {
      decision: "go" | "no_go";
      nextActions: string[];
      onboardingChecklist: { readinessMeter: { completionPct: number } };
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
          gaps: string[];
          evidenceSources: string[];
        }>;
      };
      objectiveCoverage: Array<{
        id: string;
        scope: "domain" | "compliance" | "runtime_safety" | "non_negotiable";
        status: "proved" | "blocked" | "incomplete";
        gaps: string[];
        nextActions: string[];
        evidenceSources: string[];
      }>;
      domainAssessments: Array<{
        id: string;
        status: "ready" | "blocked" | "verification_gap";
        blockingCodes: string[];
      }>;
      unavailableCapabilities: Array<{ id: string; reason: string; message: string }>;
    };
  };

  expect(payload.data.decision).toBe("no_go");
  expect(payload.data.nextActions.length).toBeGreaterThan(0);
  expect(payload.data.onboardingChecklist.readinessMeter.completionPct).toBe(100);
  expect(payload.data.compliancePosture.certificationClaim).toBe("not_claimed");
  expect(payload.data.compliancePosture.soc2ReadinessStatus).toBe("controls_evidenced");
  expect(payload.data.compliancePosture.missingEvidence).toHaveLength(0);
  expect(payload.data.unavailableCapabilities).toHaveLength(0);

  expect(payload.data.closureAudit.summary.total).toBe(18);
  expect(payload.data.closureAudit.summary.proved).toBeLessThan(18);
  expect(payload.data.closureAudit.summary.blocked).toBe(0);
  expect(payload.data.closureAudit.summary.incomplete).toBeGreaterThan(0);
  expectExactIdSet(
    payload.data.domainAssessments.map((item) => item.id),
    REQUIRED_DOMAIN_IDS,
    "go domain assessments"
  );
  expectExactIdSet(
    payload.data.closureAudit.requirements.map((item) => item.id),
    REQUIRED_CLOSURE_IDS,
    "go closure requirements"
  );
  expectObjectiveCoverageParity({
    closureRequirements: payload.data.closureAudit.requirements,
    objectiveCoverage: payload.data.objectiveCoverage,
  });
  const providerDomain = payload.data.domainAssessments.find((item) => item.id === "provider_deep_connectors");
  expect(providerDomain).toBeDefined();
  expect(providerDomain?.status).toBe("verification_gap");
  expect(providerDomain?.blockingCodes.some((code) => code.startsWith("connector_sync_proof_missing_"))).toBe(true);
  const providerRequirement = payload.data.closureAudit.requirements.find((item) => item.id === "provider_deep_connectors");
  expect(providerRequirement).toBeDefined();
  expect(providerRequirement?.status).toBe("incomplete");
  expect(providerRequirement?.gaps.some((gap) => gap.startsWith("connector_sync_proof_missing_"))).toBe(true);
  expect(payload.data.closureAudit.requirements.every((item) => item.evidenceSources.length > 0)).toBe(true);
});
