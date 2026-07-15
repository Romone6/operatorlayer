import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createAgentConfig } from "@/app/api/agent-configs/route";
import { POST as createApiKey } from "@/app/api/api-keys/route";
import { GET as listAuditEvents } from "@/app/api/audit/events/route";
import { GET as listJobs } from "@/app/api/jobs/route";
import { GET as listNotificationDestinations } from "@/app/api/notifications/destinations/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as createExport } from "@/app/api/exports/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { POST as runtimeGovernance } from "@/app/api/v1/runtime/governance/route";
import { POST as createWebhook } from "@/app/api/webhooks/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "notification-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "notification-owner@example.com");
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
        "x-user-id": "notification-owner-001",
        "x-user-email": "notification-owner@example.com",
      },
      body: JSON.stringify({ name: "Notification Routing Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

async function uploadPolicySource(orgId: string) {
  const form = new FormData();
  form.set("title", "Notification Runtime Policy Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    [
      "Pricing objection scenario. Required behaviour: acknowledge_concern, reference_customer_context, provide_policy_aligned_next_step.",
      "Approved phrase: Based on what you shared, a scoped pilot approach may make sense.",
      "Forbidden phrases: no risk at all, guaranteed discount, legal promise.",
      "Human review conditions: discounts, legal threats, refunds, and security claims.",
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

describe("notification routing API", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_DATA_BACKEND = "memory";
    process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "1";
    process.env.OPERATORLAYER_PROCESSING_MODE = "deterministic";
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY = "test-secret-encryption-key";
    delete process.env.OPENAI_API_KEY;
  });

  it("attaches runtime notifications, queues webhook delivery, and labels unavailable providers", async () => {
    const orgId = await createOrg();
    await uploadPolicySource(orgId);

    const webhook = await createWebhook(
      authedRequest("http://localhost/api/webhooks", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://example.com/operatorlayer/runtime",
          events: ["runtime_governance.*"],
        }),
      })
    );
    expect(webhook.status).toBe(201);

    const destinations = await listNotificationDestinations(
      authedRequest("http://localhost/api/notifications/destinations", orgId)
    );
    expect(destinations.status).toBe(200);
    const destinationsPayload = (await destinations.json()) as {
      data: Array<{ destination: string; state: string; reason: string; activeSubscriptions?: number }>;
    };
    expect(destinationsPayload.data.find((item) => item.destination === "webhook")).toMatchObject({
      state: "available",
      reason: "active_subscription_matched",
      activeSubscriptions: 1,
    });
    expect(destinationsPayload.data.find((item) => item.destination === "slack")).toMatchObject({
      state: "unavailable",
      reason: "provider_not_implemented",
    });

    const config = await createAgentConfig(
      authedRequest("http://localhost/api/agent-configs", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "support-agent",
          displayName: "Support Agent",
          channel: "email",
          useCase: "pricing_objection",
          customerSegment: "smb",
          governanceMode: "conditional_approval",
          scoreThreshold: 95,
          riskLevels: ["low"],
          notificationDestinations: ["dashboard", "webhook", "slack", "linear", "teams", "email"],
          enabled: true,
        }),
      })
    );
    expect(config.status).toBe(201);

    const apiKey = await createApiKey(
      authedRequest("http://localhost/api/api-keys", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Notification Runtime Key", scopes: ["runtime.invoke"] }),
      })
    );
    expect(apiKey.status).toBe(201);
    const apiKeyPayload = (await apiKey.json()) as { data: { rawKey: string } };

    const decision = await runtimeGovernance(
      externalRuntimeRequest(orgId, apiKeyPayload.data.rawKey, {
        agentId: "support-agent",
        channel: "email",
        useCase: "pricing_objection",
        customerSegment: "smb",
        inputMessage: "Can you discount this?",
        draft: "We can definitely discount this. No risk at all.",
      })
    );
    expect(decision.status).toBe(200);
    const decisionPayload = (await decision.json()) as {
      data: {
        notificationRouting: {
          state: string;
          destinations: Array<{ destination: string; state: string; reason: string; jobId: string | null }>;
        };
      };
    };
    expect(decisionPayload.data.notificationRouting.state).toBe("partially_queued");
    expect(decisionPayload.data.notificationRouting.destinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: "dashboard", state: "recorded" }),
        expect.objectContaining({ destination: "webhook", state: "queued", jobId: expect.any(String) }),
        expect.objectContaining({ destination: "slack", state: "unavailable", reason: "provider_not_implemented" }),
        expect.objectContaining({ destination: "linear", state: "unavailable", reason: "provider_not_implemented" }),
        expect.objectContaining({ destination: "teams", state: "unavailable", reason: "provider_not_implemented" }),
        expect.objectContaining({ destination: "email", state: "unavailable", reason: "provider_not_implemented" }),
      ])
    );

    const jobs = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
    expect(jobs.status).toBe(200);
    const jobsPayload = (await jobs.json()) as { data: Array<{ jobType: string; status: string; payload: { eventType?: string } }> };
    expect(
      jobsPayload.data.some(
        (job) => job.jobType === "webhook_delivery" && job.status === "queued" && job.payload.eventType === "runtime_governance.decision"
      )
    ).toBe(true);

    const audit = await listAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(audit.status).toBe(200);
    const auditPayload = (await audit.json()) as { data: { events: Array<{ action: string; metadata: Record<string, unknown> }> } };
    const notificationAudit = auditPayload.data.events.find(
      (event) => event.action === "enterprise:notification_route_recorded"
    );
    expect(notificationAudit).toBeTruthy();
    expect(JSON.stringify(notificationAudit?.metadata)).not.toContain("No risk at all");
  });
});
