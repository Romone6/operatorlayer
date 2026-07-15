import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-runtime-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "runtime-owner@example.com");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

function externalRuntimeRequest(url: string, orgId: string, rawKey: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-ol-api-key", rawKey);
  headers.set("x-ol-org-id", orgId);
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_INLINE_JOB_RUNNER = process.env.OPERATORLAYER_INLINE_JOB_RUNNER ?? "1";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: createApiKey } = await import("@/app/api/api-keys/route");
  const { POST: upsertAgentConfig } = await import("@/app/api/agent-configs/route");
  const { POST: uploadSource } = await import("@/app/api/sources/upload/route");
  const { POST: createExport } = await import("@/app/api/exports/route");
  const { POST: runtimeGovernance } = await import("@/app/api/v1/runtime/governance/route");
  const { GET: getAuditEvents } = await import("@/app/api/audit/events/route");
  const { GET: listSendEvents } = await import("@/app/api/send-events/route");
  const { GET: listJobs } = await import("@/app/api/jobs/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "smoke-runtime-owner-001",
        "x-user-email": "runtime-owner@example.com",
      },
      body: JSON.stringify({ name: "Runtime Governance Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for runtime smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const form = new FormData();
  form.set("title", "Runtime Smoke Policy Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    "Pricing objection scenario. Approved phrase: Based on what you shared, a scoped pilot may fit. Forbidden phrases: no risk at all, guaranteed discount. Human review conditions: discount and legal requests."
  );
  const source = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  if (!source.ok) throw new Error("Failed to upload runtime smoke source.");

  const exportPack = await createExport(
    authedRequest("http://localhost/api/exports", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exportType: "full_pack" }),
    })
  );
  if (!exportPack.ok) throw new Error("Failed to create runtime smoke export pack.");

  const agentConfig = await upsertAgentConfig(
    authedRequest("http://localhost/api/agent-configs", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "support-agent",
        displayName: "Support agent",
        channel: "email",
        useCase: "pricing_objection",
        customerSegment: "smb",
        governanceMode: "conditional_approval",
        scoreThreshold: 90,
        riskLevels: ["low"],
        notificationDestinations: ["dashboard"],
        enabled: true,
      }),
    })
  );
  if (!agentConfig.ok) throw new Error("Failed to create runtime smoke agent governance config.");

  const key = await createApiKey(
    authedRequest("http://localhost/api/api-keys", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Runtime Smoke Key", scopes: ["runtime.invoke"] }),
    })
  );
  if (!key.ok) throw new Error("Failed to create runtime smoke API key.");
  const keyPayload = (await key.json()) as { data: { rawKey: string } };

  const decision = await runtimeGovernance(
    externalRuntimeRequest("http://localhost/api/v1/runtime/governance", orgId, keyPayload.data.rawKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "support-agent",
        channel: "email",
        useCase: "pricing_objection",
        customerSegment: "smb",
        inputMessage: "Can you discount this?",
        draft: "We can definitely discount this. No risk at all.",
        notificationDestinations: ["dashboard"],
      }),
    })
  );
  if (!decision.ok) throw new Error("Runtime governance decision failed.");
  const decisionPayload = (await decision.json()) as {
    data: {
      decisionId: string;
      decision: { status: string; humanApprovalRequired: boolean };
      agentConfig: { source: string; governanceMode: string };
      repairedDraft: string | null;
      audit: { sendState: string; autoSendAttempted: boolean };
    };
  };
  if (!decisionPayload.data.decisionId) throw new Error("Runtime decision missing decision id.");
  if (
    decisionPayload.data.agentConfig.source !== "persisted" ||
    decisionPayload.data.agentConfig.governanceMode !== "conditional_approval"
  ) {
    throw new Error("Runtime governance did not use persisted agent config.");
  }
  if (decisionPayload.data.decision.status !== "review_required") {
    throw new Error("Expected conditional governance to require review for risky draft.");
  }
  if (!decisionPayload.data.decision.humanApprovalRequired) {
    throw new Error("Expected runtime governance decision to require human approval.");
  }
  if (!decisionPayload.data.repairedDraft) throw new Error("Expected runtime governance repair suggestion.");
  if (decisionPayload.data.audit.sendState !== "not_sent" || decisionPayload.data.audit.autoSendAttempted) {
    throw new Error("Runtime governance must not send or attempt auto-send.");
  }

  const audit = await getAuditEvents(
    authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
  );
  if (!audit.ok) throw new Error("Runtime governance audit lookup failed.");
  const auditPayload = (await audit.json()) as {
    data: { events: Array<{ action: string; metadata: Record<string, unknown> }> };
  };
  const runtimeAudit = auditPayload.data.events.find(
    (event) =>
      event.action === "enterprise:runtime_governance_decision" &&
      event.metadata.sendState === "not_sent"
  );
  if (!runtimeAudit) throw new Error("Missing runtime governance audit event.");
  if (JSON.stringify(runtimeAudit.metadata).includes("No risk at all")) {
    throw new Error("Runtime audit metadata exposed raw draft text.");
  }

  const sendEvents = await listSendEvents(authedRequest("http://localhost/api/send-events", orgId));
  if (!sendEvents.ok) throw new Error("Send events lookup failed.");
  const sendEventsPayload = (await sendEvents.json()) as { data: unknown[] };
  if (sendEventsPayload.data.length !== 0) throw new Error("Runtime governance created send events.");

  const jobs = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
  if (!jobs.ok) throw new Error("Jobs lookup failed.");
  const jobsPayload = (await jobs.json()) as { data: Array<{ jobType: string }> };
  if (jobsPayload.data.some((job) => job.jobType === "auto_send")) {
    throw new Error("Runtime governance created an auto-send job.");
  }

  console.log("runtime-governance-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
