import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-governance-001");
  headers.set("x-user-email", "owner@example.com");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { PATCH: patchSsoConfig } = await import("@/app/api/sso/config/route");
  const { PATCH: patchGovernancePolicy } = await import("@/app/api/data-governance/policies/route");
  const { POST: simulateGovernancePolicy } = await import("@/app/api/data-governance/policies/simulate/route");
  const { POST: placeLegalHold, PATCH: patchLegalHold } = await import(
    "@/app/api/data-governance/legal-hold/route"
  );
  const { POST: invokeBreakGlass, PATCH: releaseBreakGlass } = await import(
    "@/app/api/data-governance/break-glass/route"
  );
  const { POST: createInvite } = await import("@/app/api/members/invites/route");
  const { POST: createDeletionRequest } = await import("@/app/api/data-governance/deletion-requests/route");
  const { POST: completeDeletionRequest } = await import(
    "@/app/api/data-governance/deletion-requests/[id]/complete/route"
  );
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-governance-001" },
      body: JSON.stringify({ name: "Governance Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for governance smoke.");
  const org = (await create.json()) as { data: { id: string } };

  const ssoResponse = await patchSsoConfig(
    authedRequest("http://localhost/api/sso/config", org.data.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: true,
        idpEntityId: "https://idp.example.com",
        ssoUrl: "https://idp.example.com/saml",
        certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
        domainAllowlist: ["example.com"],
      }),
    })
  );
  if (!ssoResponse.ok) throw new Error("Failed to patch SSO config for governance smoke.");

  const policyResponse = await patchGovernancePolicy(
    authedRequest("http://localhost/api/data-governance/policies", org.data.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        retentionDays: 365,
        legalHoldEnabled: false,
        deletionRequiresApproval: true,
        invitePolicy: "domain_allowlist_only",
        sessionDurationMinutes: 480,
        enforcedMfa: true,
        breakGlassAdminEnabled: true,
      }),
    })
  );
  if (!policyResponse.ok) throw new Error("Failed to patch governance policy for governance smoke.");

  const deletionResponse = await createDeletionRequest(
    authedRequest("http://localhost/api/data-governance/deletion-requests", org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "Governance smoke simulation request",
        target: "sources_only",
      }),
    })
  );
  if (deletionResponse.status !== 201) {
    throw new Error(`Expected deletion request status 201 but received ${deletionResponse.status}.`);
  }
  const deletionPayload = (await deletionResponse.json()) as { data: { id: string } };

  const simulationResponse = await simulateGovernancePolicy(
    authedRequest("http://localhost/api/data-governance/policies/simulate", org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposedPolicy: {
          legalHoldEnabled: true,
          retentionDays: 30,
          deletionRequiresApproval: true,
          sessionDurationMinutes: 480,
          enforcedMfa: true,
          invitePolicy: "domain_allowlist_only",
          breakGlassAdminEnabled: true,
        },
      }),
    })
  );
  if (!simulationResponse.ok) throw new Error("Failed to simulate governance policy impact.");
  const simulationPayload = (await simulationResponse.json()) as {
    data: {
      status: "safe" | "review_required" | "blocked";
      blockedActions: Array<{ code: string }>;
    };
  };
  if (simulationPayload.data.status !== "blocked") {
    throw new Error(`Expected governance simulation status blocked but received ${simulationPayload.data.status}.`);
  }
  if (
    !simulationPayload.data.blockedActions.some(
      (action) => action.code === "deletion_requests_blocked_by_legal_hold"
    )
  ) {
    throw new Error("Governance simulation missing legal-hold blocked-action evidence.");
  }

  const completeDeletionResponse = await completeDeletionRequest(
    authedRequest(`http://localhost/api/data-governance/deletion-requests/${deletionPayload.data.id}/complete`, org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approvalTicketRef: "SMOKE-DELETE-001",
        executionMode: "anonymize",
        proofRecordId: "proof-smoke-delete-001",
        deletedObjectCounts: {
          sources: 0,
          evaluations: 0,
          exports: 0,
          jobs: 0,
        },
        dependentArtifactsHandled: [],
        notes: "Governance smoke completion path.",
      }),
    }),
    { params: Promise.resolve({ id: deletionPayload.data.id }) }
  );
  if (completeDeletionResponse.status !== 200) {
    throw new Error(
      `Expected deletion completion status 200 but received ${completeDeletionResponse.status}.`
    );
  }
  const completeDeletionPayload = (await completeDeletionResponse.json()) as {
    data: { completion: { proofRecordId: string } | null };
  };
  if (completeDeletionPayload.data.completion?.proofRecordId !== "proof-smoke-delete-001") {
    throw new Error("Expected deletion completion proof record id to match smoke payload.");
  }

  const placeLegalHoldResponse = await placeLegalHold(
    authedRequest("http://localhost/api/data-governance/legal-hold", org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "global",
        reason: "Smoke legal hold lifecycle validation in progress.",
        ticketRef: "SMOKE-LEGAL-001",
      }),
    })
  );
  if (placeLegalHoldResponse.status !== 201) {
    throw new Error(`Expected legal hold place status 201 but received ${placeLegalHoldResponse.status}.`);
  }
  const legalHoldPayload = (await placeLegalHoldResponse.json()) as {
    data: { active: { holdId: string } | null };
  };
  if (!legalHoldPayload.data.active?.holdId) {
    throw new Error("Expected active legal hold id after place.");
  }

  const blockedByActiveLegalHold = await createDeletionRequest(
    authedRequest("http://localhost/api/data-governance/deletion-requests", org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "Deletion must block while legal hold lifecycle is active.",
        target: "sources_only",
      }),
    })
  );
  if (blockedByActiveLegalHold.status !== 409) {
    throw new Error(
      `Expected deletion request status 409 while legal hold active but received ${blockedByActiveLegalHold.status}.`
    );
  }

  const releaseLegalHoldResponse = await patchLegalHold(
    authedRequest("http://localhost/api/data-governance/legal-hold", org.data.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "release",
        holdId: legalHoldPayload.data.active.holdId,
        reason: "Smoke legal hold lifecycle validation complete.",
        ticketRef: "SMOKE-LEGAL-002",
      }),
    })
  );
  if (!releaseLegalHoldResponse.ok) {
    throw new Error("Failed to release legal hold lifecycle in governance smoke.");
  }

  const invokeBreakGlassResponse = await invokeBreakGlass(
    authedRequest("http://localhost/api/data-governance/break-glass", org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "Emergency governance drill for smoke validation.",
        ticketRef: "SMOKE-DRILL-001",
        durationMinutes: 15,
      }),
    })
  );
  if (invokeBreakGlassResponse.status !== 201) {
    throw new Error(
      `Expected break-glass invoke status 201 but received ${invokeBreakGlassResponse.status}.`
    );
  }

  const releaseBreakGlassResponse = await releaseBreakGlass(
    authedRequest("http://localhost/api/data-governance/break-glass", org.data.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "Smoke drill complete and emergency mode cleared.",
      }),
    })
  );
  if (!releaseBreakGlassResponse.ok) {
    throw new Error("Failed to release break-glass protocol in governance smoke.");
  }
  const releasePayload = (await releaseBreakGlassResponse.json()) as {
    data: {
      active: null | { invocationId: string };
      history: Array<{ status: string }>;
    };
  };
  if (releasePayload.data.active !== null) {
    throw new Error("Expected break-glass protocol to be inactive after release.");
  }
  if (releasePayload.data.history[0]?.status !== "released") {
    throw new Error("Expected latest break-glass history status to be released.");
  }

  const deniedInvite = await createInvite(
    authedRequest("http://localhost/api/members/invites", org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "blocked@outside.com",
        role: "member",
      }),
    })
  );
  if (deniedInvite.status !== 403) {
    throw new Error(`Expected blocked invite status 403 but received ${deniedInvite.status}.`);
  }

  const allowedInvite = await createInvite(
    authedRequest("http://localhost/api/members/invites", org.data.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "allowed@example.com",
        role: "member",
      }),
    })
  );
  if (![201, 202].includes(allowedInvite.status)) {
    throw new Error(`Expected allowed invite status 201/202 but received ${allowedInvite.status}.`);
  }

  console.log("governance-controls-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
