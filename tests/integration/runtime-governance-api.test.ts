import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createApiKey } from "@/app/api/api-keys/route";
import { GET as listAgentConfigs, POST as upsertAgentConfig } from "@/app/api/agent-configs/route";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { POST as createExport } from "@/app/api/exports/route";
import { GET as listJobs } from "@/app/api/jobs/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as listSendEvents } from "@/app/api/send-events/route";
import { POST as runtimeGovernance } from "@/app/api/v1/runtime/governance/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "runtime-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "runtime-owner@example.com");
  return new NextRequest(url, { ...init, headers });
}

function externalRuntimeRequest(orgId: string, rawKey: string, body: unknown) {
  return new NextRequest("http://localhost/api/v1/runtime/governance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ol-api-key": rawKey,
      "x-ol-org-id": orgId,
    },
    body: JSON.stringify(body),
  });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "runtime-owner-001",
        "x-user-email": "runtime-owner@example.com",
      },
      body: JSON.stringify({ name: "Runtime Governance Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

async function uploadPolicyPackSource(orgId: string) {
  const form = new FormData();
  form.set("title", "Runtime Governance Policy Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    [
      "Pricing objection scenario. Required behaviour: acknowledge_concern, reference_customer_context, provide_policy_aligned_next_step.",
      "Approved phrase: Based on what you shared, a scoped pilot approach may make sense.",
      "Forbidden phrases: no risk at all, guaranteed discount, legal promise.",
      "Human review conditions: discounts, refunds, legal threats, security claims.",
    ].join(" ")
  );
  const uploaded = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  expect(uploaded.status).toBe(201);

  const exported = await createExport(
    authedRequest("http://localhost/api/exports", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exportType: "full_pack" }),
    })
  );
  expect(exported.status).toBe(201);
}

async function createRawApiKey(orgId: string, scopes: string[]) {
  const response = await createApiKey(
    authedRequest("http://localhost/api/api-keys", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Runtime ${scopes.join(" ")}`, scopes }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { rawKey: string; credential: { id: string } } };
  return payload.data;
}

describe("runtime governance API", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_DATA_BACKEND = "memory";
    process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "1";
    process.env.OPERATORLAYER_PROCESSING_MODE = "deterministic";
    delete process.env.OPENAI_API_KEY;
  });

  it("runs a scoped runtime decision with evaluation, repair, notification intent, and no send side effects", async () => {
    const orgId = await createOrg();
    await uploadPolicyPackSource(orgId);
    const apiKey = await createRawApiKey(orgId, ["runtime.invoke"]);

    const response = await runtimeGovernance(
      externalRuntimeRequest(orgId, apiKey.rawKey, {
        agentId: "sales-agent",
        channel: "email",
        useCase: "pricing_objection",
        customerSegment: "smb",
        governanceMode: "conditional_approval",
        inputMessage: "Can you discount this?",
        draft: "We can definitely discount this. No risk at all.",
        notificationDestinations: ["dashboard"],
      })
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        decisionId: string;
        policyPack: { id: string; checksum: string } | null;
        repairedDraft: string | null;
        decision: {
          mode: string;
          status: string;
          allowResponse: boolean;
          humanApprovalRequired: boolean;
        };
        notificationIntent: { state: string; reason: string; destinations: string[] };
        evaluationRecord: { id: string };
        audit: { sendState: string; autoSendAttempted: boolean };
      };
    };
    expect(payload.data.decisionId).toBeTruthy();
    expect(payload.data.policyPack?.checksum).toBeTruthy();
    expect(payload.data.repairedDraft).toBeTruthy();
    expect(payload.data.decision.mode).toBe("conditional_approval");
    expect(payload.data.decision.status).toBe("review_required");
    expect(payload.data.decision.allowResponse).toBe(false);
    expect(payload.data.decision.humanApprovalRequired).toBe(true);
    expect(payload.data.notificationIntent.state).toBe("required");
    expect(payload.data.notificationIntent.reason).toBe("human_approval_required");
    expect(payload.data.audit.sendState).toBe("not_sent");
    expect(payload.data.audit.autoSendAttempted).toBe(false);

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: {
        events: Array<{
          action: string;
          metadata: Record<string, unknown>;
        }>;
      };
    };
    const runtimeAudit = auditPayload.data.events.find(
      (event) =>
        event.action === "enterprise:runtime_governance_decision" &&
        event.metadata.evaluationId === payload.data.evaluationRecord.id
    );
    expect(runtimeAudit).toBeTruthy();
    expect(runtimeAudit?.metadata.inputMessageHash).toMatch(/^[a-f0-9]{64}$/);
    expect(runtimeAudit?.metadata.draftHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(runtimeAudit?.metadata)).not.toContain("No risk at all");
    expect(runtimeAudit?.metadata.sendState).toBe("not_sent");

    const sendEvents = await listSendEvents(authedRequest("http://localhost/api/send-events", orgId));
    expect(sendEvents.status).toBe(200);
    const sendEventsPayload = (await sendEvents.json()) as { data: unknown[] };
    expect(sendEventsPayload.data).toHaveLength(0);

    const jobs = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
    expect(jobs.status).toBe(200);
    const jobsPayload = (await jobs.json()) as { data: Array<{ jobType: string }> };
    expect(jobsPayload.data.some((job) => job.jobType === "auto_send")).toBe(false);
  });

  it("fails closed when the API key lacks runtime.invoke scope", async () => {
    const orgId = await createOrg();
    const apiKey = await createRawApiKey(orgId, ["evaluation.read"]);

    const response = await runtimeGovernance(
      externalRuntimeRequest(orgId, apiKey.rawKey, {
        agentId: "support-agent",
        channel: "email",
        useCase: "support_reply",
        governanceMode: "notify_only",
        inputMessage: "Can you help?",
        draft: "Here is a safe response draft.",
      })
    );
    expect(response.status).toBe(403);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("api_scope_forbidden");
  });

  it("persists agent governance config and enforces it during runtime decisions", async () => {
    const orgId = await createOrg();
    await uploadPolicyPackSource(orgId);
    const apiKey = await createRawApiKey(orgId, ["runtime.invoke"]);

    const configResponse = await upsertAgentConfig(
      authedRequest("http://localhost/api/agent-configs", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "support-agent",
          displayName: "Support Agent",
          channel: "email",
          useCase: "support_reply",
          customerSegment: "standard",
          governanceMode: "human_approval_required",
          scoreThreshold: 95,
          riskLevels: ["low"],
          notificationDestinations: ["dashboard", "support-lead"],
          enabled: true,
        }),
      })
    );
    expect(configResponse.status).toBe(201);

    const configsResponse = await listAgentConfigs(
      authedRequest("http://localhost/api/agent-configs", orgId)
    );
    expect(configsResponse.status).toBe(200);
    const configsPayload = (await configsResponse.json()) as {
      data: Array<{ agentId: string; governanceMode: string }>;
    };
    expect(configsPayload.data).toHaveLength(1);
    expect(configsPayload.data[0].agentId).toBe("support-agent");

    const response = await runtimeGovernance(
      externalRuntimeRequest(orgId, apiKey.rawKey, {
        agentId: "support-agent",
        channel: "email",
        useCase: "support_reply",
        customerSegment: "standard",
        governanceMode: "notify_only",
        inputMessage: "Can you help with pricing?",
        draft: "Based on what you shared, a scoped pilot approach may make sense. Would you like next steps?",
      })
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        agentConfig: {
          source: string;
          governanceMode: string;
          scoreThreshold: number;
        };
        decision: {
          mode: string;
          status: string;
          humanApprovalRequired: boolean;
        };
        notificationIntent: { destinations: string[] };
      };
    };
    expect(payload.data.agentConfig.source).toBe("persisted");
    expect(payload.data.agentConfig.governanceMode).toBe("human_approval_required");
    expect(payload.data.agentConfig.scoreThreshold).toBe(95);
    expect(payload.data.decision.mode).toBe("human_approval_required");
    expect(payload.data.decision.status).toBe("review_required");
    expect(payload.data.decision.humanApprovalRequired).toBe(true);
    expect(payload.data.notificationIntent.destinations).toEqual(["dashboard", "support-lead"]);

    const missingConfig = await runtimeGovernance(
      externalRuntimeRequest(orgId, apiKey.rawKey, {
        agentId: "unknown-agent",
        channel: "email",
        useCase: "support_reply",
        customerSegment: "standard",
        inputMessage: "Can you help?",
        draft: "Here is a safe response draft.",
      })
    );
    expect(missingConfig.status).toBe(409);
    const missingPayload = (await missingConfig.json()) as { error: { code: string } };
    expect(missingPayload.error.code).toBe("runtime_agent_config_missing");
  });

  it.each([
    {
      mode: "suggest_only",
      expectedStatus: "suggested",
      expectedAllowed: false,
      expectedHumanApproval: true,
      threshold: 90,
    },
    {
      mode: "human_approval_required",
      expectedStatus: "review_required",
      expectedAllowed: false,
      expectedHumanApproval: true,
      threshold: 90,
    },
    {
      mode: "conditional_approval",
      expectedStatus: "review_required",
      expectedAllowed: false,
      expectedHumanApproval: true,
      threshold: 90,
    },
    {
      mode: "final_authority",
      expectedStatus: "review_required",
      expectedAllowed: false,
      expectedHumanApproval: true,
      threshold: 100,
    },
    {
      mode: "notify_only",
      expectedStatus: "allowed_with_monitoring",
      expectedAllowed: true,
      expectedHumanApproval: false,
      threshold: 90,
    },
  ])(
    "enforces persisted $mode runtime governance mode",
    async ({ mode, expectedStatus, expectedAllowed, expectedHumanApproval, threshold }) => {
      const orgId = await createOrg();
      await uploadPolicyPackSource(orgId);
      const apiKey = await createRawApiKey(orgId, ["runtime.invoke"]);
      const agentId = `agent-${mode}`;

      const configResponse = await upsertAgentConfig(
        authedRequest("http://localhost/api/agent-configs", orgId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            displayName: `Agent ${mode}`,
            channel: "email",
            useCase: "pricing_objection",
            customerSegment: "smb",
            governanceMode: mode,
            scoreThreshold: threshold,
            riskLevels: ["low"],
            notificationDestinations: ["dashboard"],
            enabled: true,
          }),
        })
      );
      expect(configResponse.status).toBe(201);

      const response = await runtimeGovernance(
        externalRuntimeRequest(orgId, apiKey.rawKey, {
          agentId,
          channel: "email",
          useCase: "pricing_objection",
          customerSegment: "smb",
          inputMessage: "Can you discount this?",
          draft: "We can definitely discount this. No risk at all.",
        })
      );
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        data: {
          decision: {
            mode: string;
            status: string;
            allowResponse: boolean;
            humanApprovalRequired: boolean;
          };
          agentConfig: { source: string; governanceMode: string };
        };
      };
      expect(payload.data.agentConfig.source).toBe("persisted");
      expect(payload.data.agentConfig.governanceMode).toBe(mode);
      expect(payload.data.decision.mode).toBe(mode);
      expect(payload.data.decision.status).toBe(expectedStatus);
      expect(payload.data.decision.allowResponse).toBe(expectedAllowed);
      expect(payload.data.decision.humanApprovalRequired).toBe(expectedHumanApproval);
    }
  );
});
