import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as decideAutoSend } from "@/app/api/auto-send/decide/route";
import { PATCH as patchBilling } from "@/app/api/billing/entitlements/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as createApprovalRule } from "@/app/api/approval-rules/route";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { GET as listJobs } from "@/app/api/jobs/route";
import { POST as runWorker } from "@/app/api/jobs/worker/route";
import { GET as getSendEvents } from "@/app/api/send-events/route";
import {
  GET as getAutoSendKillSwitch,
  PATCH as patchAutoSendKillSwitch,
} from "@/app/api/auto-send/kill-switch/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-001",
    },
    body: JSON.stringify({ name: "Auto Send Kill Switch Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

async function configureAutoSendReady(orgId: string) {
  const flagResponse = await patchFeatureFlags(
    authedRequest("http://localhost/api/feature-flags", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "auto_send", enabled: true, rolloutPercent: 100 }),
    })
  );
  expect(flagResponse.status).toBe(200);

  const billingResponse = await patchBilling(
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
  expect(billingResponse.status).toBe(200);

  const approvalRuleResponse = await createApprovalRule(
    authedRequest("http://localhost/api/approval-rules", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Low risk email auto-send",
        scenario: "pricing_objection",
        minScore: 90,
        riskLevels: ["low"],
        channelAllowlist: ["email"],
        customerTypeAllowlist: ["smb"],
        requiresHumanApproval: false,
        enabled: true,
      }),
    })
  );
  expect(approvalRuleResponse.status).toBe(201);
}

describe("auto-send kill switch API and enforcement", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-supabase-anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-supabase-service-role";
  });

  it("supports global/workspace kill switches and enforces them at decision and worker time", async () => {
    const orgId = await createOrg();
    await configureAutoSendReady(orgId);

    const getInitialState = await getAutoSendKillSwitch(
      authedRequest("http://localhost/api/auto-send/kill-switch", orgId)
    );
    expect(getInitialState.status).toBe(200);

    const enableGlobal = await patchAutoSendKillSwitch(
      authedRequest("http://localhost/api/auto-send/kill-switch", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          active: true,
          reason: "incident containment",
        }),
      })
    );
    expect(enableGlobal.status).toBe(200);

    const blockedByGlobal = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: 95,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          workspaceId: "workspace-a",
          draft: "A compliant draft with approved tone and next steps.",
          recipient: "buyer@example.com",
          evidence: ["policy:pricing_objection"],
        }),
      })
    );
    expect(blockedByGlobal.status).toBe(200);
    const blockedGlobalPayload = (await blockedByGlobal.json()) as {
      data: { decision: { allowed: boolean; reason: string } };
    };
    expect(blockedGlobalPayload.data.decision.allowed).toBe(false);
    expect(blockedGlobalPayload.data.decision.reason).toContain("Global auto-send kill switch active");

    const disableGlobal = await patchAutoSendKillSwitch(
      authedRequest("http://localhost/api/auto-send/kill-switch", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          active: false,
          reason: "incident resolved",
        }),
      })
    );
    expect(disableGlobal.status).toBe(200);

    const enableWorkspace = await patchAutoSendKillSwitch(
      authedRequest("http://localhost/api/auto-send/kill-switch", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "workspace",
          workspaceId: "workspace-a",
          active: true,
          reason: "workspace incident",
        }),
      })
    );
    expect(enableWorkspace.status).toBe(200);

    const blockedByWorkspace = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: 95,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          workspaceId: "workspace-a",
          draft: "A compliant draft with approved tone and next steps.",
          recipient: "buyer@example.com",
          evidence: ["policy:pricing_objection"],
        }),
      })
    );
    expect(blockedByWorkspace.status).toBe(200);
    const blockedWorkspacePayload = (await blockedByWorkspace.json()) as {
      data: { decision: { allowed: boolean; reason: string } };
    };
    expect(blockedWorkspacePayload.data.decision.allowed).toBe(false);
    expect(blockedWorkspacePayload.data.decision.reason).toContain(
      "Workspace auto-send kill switch active for workspace-a"
    );

    const allowedWorkspaceB = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: 95,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          workspaceId: "workspace-b",
          draft: "A compliant draft with approved tone and next steps.",
          recipient: "buyer@example.com",
          evidence: ["policy:pricing_objection"],
        }),
      })
    );
    expect(allowedWorkspaceB.status).toBe(200);
    const allowedPayload = (await allowedWorkspaceB.json()) as {
      data: { decision: { allowed: boolean }; sendEvent: { id: string } };
    };
    expect(allowedPayload.data.decision.allowed).toBe(true);

    const enableWorkspaceB = await patchAutoSendKillSwitch(
      authedRequest("http://localhost/api/auto-send/kill-switch", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "workspace",
          workspaceId: "workspace-b",
          active: true,
          reason: "post-queue workspace stop",
        }),
      })
    );
    expect(enableWorkspaceB.status).toBe(200);

    const workerRun = await runWorker(
      authedRequest("http://localhost/api/jobs/worker?max=10", orgId, { method: "POST" })
    );
    expect(workerRun.status).toBe(409);
    const workerError = (await workerRun.json()) as { error: { code: string } };
    expect(workerError.error.code).toBe("auto_send_kill_switch_active");

    const jobs = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
    expect(jobs.status).toBe(200);
    const jobsPayload = (await jobs.json()) as {
      data: Array<{ jobType: string; status: string; payload: { sendEventId?: string } }>;
    };
    expect(
      jobsPayload.data.some(
        (job) =>
          job.jobType === "auto_send" &&
          job.payload.sendEventId === allowedPayload.data.sendEvent.id &&
          job.status === "failed"
      )
    ).toBe(true);

    const sendEventsResponse = await getSendEvents(authedRequest("http://localhost/api/send-events", orgId));
    expect(sendEventsResponse.status).toBe(200);
    const sendEventsPayload = (await sendEventsResponse.json()) as {
      data: Array<{
        id: string;
        status: string;
        reason: string;
        delivery: { state: string; failureReason: string | null };
      }>;
    };
    const failedDeliveryEvent = sendEventsPayload.data.find(
      (item) => item.id === allowedPayload.data.sendEvent.id
    );
    expect(failedDeliveryEvent?.status).toBe("blocked");
    expect(failedDeliveryEvent?.reason).toContain("Workspace auto-send kill switch active");
    expect(failedDeliveryEvent?.delivery.state).toBe("not_started");
    expect(failedDeliveryEvent?.delivery.failureReason).toContain(
      "Workspace auto-send kill switch active"
    );

    const failedAudit = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(failedAudit.status).toBe(200);
    const failedAuditPayload = (await failedAudit.json()) as {
      data: { events: Array<{ action: string; metadata: { id?: string; status?: string } }> };
    };
    const failedLifecycleEvents = failedAuditPayload.data.events.filter(
      (event) => event.metadata.id === allowedPayload.data.sendEvent.id
    );
    expect(failedLifecycleEvents.some((event) => event.action === "enterprise:send_event_created")).toBe(true);
    expect(
      failedLifecycleEvents.some(
        (event) =>
          event.action === "enterprise:send_event_status_updated" &&
          event.metadata.status === "blocked"
      )
    ).toBe(true);
  });

  it("persists immutable send delivery confirmation on successful worker completion", async () => {
    const orgId = await createOrg();
    await configureAutoSendReady(orgId);

    const allowed = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: 96,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          workspaceId: "workspace-c",
          draft: "Draft follows approved phrasing and includes clear next steps.",
          recipient: "buyer@example.com",
          evidence: ["policy:pricing_objection"],
        }),
      })
    );
    expect(allowed.status).toBe(200);
    const allowedPayload = (await allowed.json()) as {
      data: {
        decision: { allowed: boolean };
        sendEvent: { id: string; status: string; delivery: { state: string } };
      };
    };
    expect(allowedPayload.data.decision.allowed).toBe(true);
    expect(allowedPayload.data.sendEvent.status).toBe("queued");

    const workerRun = await runWorker(
      authedRequest("http://localhost/api/jobs/worker?max=10", orgId, { method: "POST" })
    );
    expect(workerRun.status).toBe(200);

    const sendEventsResponse = await getSendEvents(authedRequest("http://localhost/api/send-events", orgId));
    expect(sendEventsResponse.status).toBe(200);
    const sendEventsPayload = (await sendEventsResponse.json()) as {
      data: Array<{
        id: string;
        status: string;
        delivery: {
          state: string;
          confirmedAt: string | null;
          confirmationSource: string | null;
          confirmationId: string | null;
        };
      }>;
    };
    const delivered = sendEventsPayload.data.find((item) => item.id === allowedPayload.data.sendEvent.id);
    expect(delivered?.status).toBe("sent");
    expect(delivered?.delivery.state).toBe("confirmed");
    expect(delivered?.delivery.confirmedAt).toBeTruthy();
    expect(delivered?.delivery.confirmationSource).toBe("auto_send_worker");
    expect(delivered?.delivery.confirmationId).toBeTruthy();

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: { events: Array<{ action: string; metadata: { id?: string; status?: string } }> };
    };
    const lifecycleEvents = auditPayload.data.events.filter(
      (event) => event.metadata.id === allowedPayload.data.sendEvent.id
    );
    expect(lifecycleEvents.some((event) => event.action === "enterprise:send_event_created")).toBe(true);
    expect(
      lifecycleEvents.some(
        (event) =>
          event.action === "enterprise:send_event_status_updated" &&
          event.metadata.status === "sent"
      )
    ).toBe(true);
    expect(
      lifecycleEvents.some((event) => event.action === "enterprise:send_event_delivery_confirmed")
    ).toBe(true);
  });

  it("scopes auto-send idempotency replay per organisation and requires explicit header", async () => {
    const orgA = await createOrg();
    await configureAutoSendReady(orgA);
    const orgB = await createOrg();
    await configureAutoSendReady(orgB);

    const decisionBody = {
      score: 96,
      riskLevel: "low",
      channel: "email",
      customerType: "smb",
      workspaceId: "workspace-idempotency",
      draft: "Draft follows approved phrasing and includes clear next steps.",
      recipient: "buyer@example.com",
      evidence: ["policy:pricing_objection"],
    } as const;

    const orgAInitial = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgA, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "shared-idempotency-key" },
        body: JSON.stringify(decisionBody),
      })
    );
    expect(orgAInitial.status).toBe(200);
    const orgAInitialPayload = (await orgAInitial.json()) as {
      data: { decision: { allowed: boolean }; sendEvent: { id: string } };
    };
    expect(orgAInitialPayload.data.decision.allowed).toBe(true);

    const orgAReplay = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgA, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "shared-idempotency-key" },
        body: JSON.stringify(decisionBody),
      })
    );
    expect(orgAReplay.status).toBe(200);
    const orgAReplayPayload = (await orgAReplay.json()) as {
      data: { sendEvent: { id: string } };
    };
    expect(orgAReplayPayload.data.sendEvent.id).toBe(orgAInitialPayload.data.sendEvent.id);

    const orgBInitial = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgB, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "shared-idempotency-key" },
        body: JSON.stringify(decisionBody),
      })
    );
    expect(orgBInitial.status).toBe(200);
    const orgBInitialPayload = (await orgBInitial.json()) as {
      data: { decision: { allowed: boolean }; sendEvent: { id: string } };
    };
    expect(orgBInitialPayload.data.decision.allowed).toBe(true);
    expect(orgBInitialPayload.data.sendEvent.id).not.toBe(orgAInitialPayload.data.sendEvent.id);

    const noHeaderFirst = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...decisionBody,
          workspaceId: "workspace-no-header",
          recipient: "buyer-no-header@example.com",
        }),
      })
    );
    expect(noHeaderFirst.status).toBe(200);
    const noHeaderFirstPayload = (await noHeaderFirst.json()) as {
      data: { sendEvent: { id: string } };
    };

    const noHeaderSecond = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...decisionBody,
          workspaceId: "workspace-no-header",
          recipient: "buyer-no-header@example.com",
        }),
      })
    );
    expect(noHeaderSecond.status).toBe(200);
    const noHeaderSecondPayload = (await noHeaderSecond.json()) as {
      data: { sendEvent: { id: string } };
    };
    expect(noHeaderSecondPayload.data.sendEvent.id).not.toBe(noHeaderFirstPayload.data.sendEvent.id);
  });
});
