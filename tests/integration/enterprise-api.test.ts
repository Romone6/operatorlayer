import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as getEnterpriseStatus } from "@/app/api/enterprise/status/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as createApprovalRule } from "@/app/api/approval-rules/route";
import { GET as listApprovalPolicies } from "@/app/api/approval-policies/route";
import { PATCH as patchBilling } from "@/app/api/billing/entitlements/route";
import { GET as getEffectiveEntitlement } from "@/app/api/billing/entitlements/effective/route";
import { GET as getReadiness } from "@/app/api/enterprise/readiness/route";
import { POST as reconcileBilling } from "@/app/api/billing/reconcile/route";
import { POST as reconcileBillingEvent } from "@/app/api/billing/reconcile/[providerEventId]/route";
import { POST as decideAutoSend } from "@/app/api/auto-send/decide/route";
import { GET as getSendEvents } from "@/app/api/send-events/route";
import { GET as getSendEventById } from "@/app/api/send-events/[id]/route";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { POST as createConnector, GET as listConnectors } from "@/app/api/connectors/route";
import { POST as syncConnector } from "@/app/api/connectors/[provider]/sync/route";
import { GET as getConnectorHealth } from "@/app/api/connectors/[provider]/health/route";
import { GET as getConnectorSyncRuns } from "@/app/api/connectors/[provider]/sync-runs/route";
import { POST as backfillConnector } from "@/app/api/connectors/[provider]/backfill/route";
import { POST as runJobsWorker } from "@/app/api/jobs/worker/route";
import { GET as startConnectorOauth } from "@/app/api/connectors/[provider]/oauth/start/route";
import { GET as connectorOauthCallback } from "@/app/api/connectors/[provider]/oauth/callback/route";
import { POST as createApiKey } from "@/app/api/api-keys/route";
import { GET as getV1Evaluations } from "@/app/api/v1/evaluations/route";
import { GET as getOpenApi } from "@/app/api/v1/openapi/route";
import { POST as createWebhook } from "@/app/api/webhooks/route";
import { POST as rotateWebhook } from "@/app/api/webhooks/[id]/rotate/route";
import { POST as dispatchWebhook } from "@/app/api/webhooks/dispatch/route";
import { GET as getWebhookReplayHistory, POST as replayWebhook } from "@/app/api/webhooks/[id]/replay/route";
import { PATCH as patchSsoConfig } from "@/app/api/sso/config/route";
import { PATCH as patchGovernance } from "@/app/api/data-governance/policies/route";
import { POST as createDeletionRequest } from "@/app/api/data-governance/deletion-requests/route";
import { POST as completeDeletionRequest } from "@/app/api/data-governance/deletion-requests/[id]/complete/route";
import { POST as scimProvision } from "@/app/api/scim/provision/route";
import { POST as createScimGroup, GET as listScimGroups } from "@/app/api/scim/v2/Groups/route";
import { POST as scimBulk } from "@/app/api/scim/v2/Bulk/route";
import { GET as getSamlMetadata } from "@/app/api/saml/metadata/route";
import { GET as getMcpAudit } from "@/app/api/mcp/audit/route";
import { POST as simulateAutoSend } from "@/app/api/auto-send/simulate/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-001",
    },
    body: JSON.stringify({ name: "Enterprise Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("enterprise APIs", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-supabase-anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-supabase-service-role";
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
    process.env.OPERATORLAYER_SCIM_TOKEN = "test-scim-token";
    process.env.STRIPE_SECRET_KEY = "test-stripe-secret";
    process.env.STRIPE_WEBHOOK_SECRET = "test-stripe-webhook-secret";
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY = "test-secret-encryption-key";
    process.env.OPERATORLAYER_OAUTH_STATE_SECRET = "test-oauth-state-secret";
  });

  it("supports enterprise governance, connectors, auto-send, API keys, and deletion workflow", async () => {
    const orgId = await createOrg();

    const statusResponse = await getEnterpriseStatus(authedRequest("http://localhost/api/enterprise/status", orgId));
    expect(statusResponse.status).toBe(200);

    for (const key of ["connector_gmail", "auto_send", "scim_write", "mcp_actions"] as const) {
      const flagResponse = await patchFeatureFlags(
        authedRequest("http://localhost/api/feature-flags", orgId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, enabled: true, rolloutPercent: 100 }),
        })
      );
      expect(flagResponse.status).toBe(200);
    }

    const startOauthResponse = await startConnectorOauth(
      authedRequest(
        `http://localhost/api/connectors/gmail/oauth/start?redirectUri=${encodeURIComponent("http://localhost/callback")}`,
        orgId
      ),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(startOauthResponse.status).toBe(200);
    const startOauthPayload = (await startOauthResponse.json()) as { data: { state: string } };

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          access_token: "access-token-123",
          refresh_token: "refresh-token-123",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;
    const callbackResponse = await connectorOauthCallback(
      authedRequest(
        `http://localhost/api/connectors/gmail/oauth/callback?code=test-code&state=${encodeURIComponent(startOauthPayload.data.state)}`,
        orgId
      ),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    global.fetch = originalFetch;
    expect(callbackResponse.status).toBe(200);

    const connectorCreateResponse = await createConnector(
      authedRequest("http://localhost/api/connectors", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gmail",
          displayName: "Gmail Primary",
          scopes: ["gmail.readonly"],
          sourceSelection: ["inbox"],
          syncSchedule: "hourly",
          tokenRef: "vault://gmail-token",
        }),
      })
    );
    expect(connectorCreateResponse.status).toBe(201);

    const refreshOauthStartResponse = await startConnectorOauth(
      authedRequest(
        `http://localhost/api/connectors/gmail/oauth/start?redirectUri=${encodeURIComponent("http://localhost/callback")}`,
        orgId
      ),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(refreshOauthStartResponse.status).toBe(200);
    const refreshOauthStartPayload = (await refreshOauthStartResponse.json()) as { data: { state: string } };

    const originalRefreshFetch = global.fetch;
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          access_token: "access-token-refresh-123",
          refresh_token: "refresh-token-refresh-123",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;
    const refreshCallbackResponse = await connectorOauthCallback(
      authedRequest(
        `http://localhost/api/connectors/gmail/oauth/callback?code=refresh-code&state=${encodeURIComponent(refreshOauthStartPayload.data.state)}`,
        orgId
      ),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    global.fetch = originalRefreshFetch;
    expect(refreshCallbackResponse.status).toBe(200);

    const syncResponse = await syncConnector(
      authedRequest(`http://localhost/api/connectors/gmail/sync`, orgId, {
        method: "POST",
        headers: { "idempotency-key": "connector-sync-idempotency-001" },
      }),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(syncResponse.status).toBe(200);
    const syncPayload = (await syncResponse.json()) as { data: { jobId: string } };

    const syncReplayResponse = await syncConnector(
      authedRequest(`http://localhost/api/connectors/gmail/sync`, orgId, {
        method: "POST",
        headers: { "idempotency-key": "connector-sync-idempotency-001" },
      }),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(syncReplayResponse.status).toBe(200);
    const syncReplayPayload = (await syncReplayResponse.json()) as { data: { jobId: string } };
    expect(syncReplayPayload.data.jobId).toBe(syncPayload.data.jobId);

    const backfillResponse = await backfillConnector(
      authedRequest(`http://localhost/api/connectors/gmail/backfill`, orgId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": "connector-backfill-idempotency-001",
        },
        body: JSON.stringify({ days: 14 }),
      }),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(backfillResponse.status).toBe(200);
    const backfillPayload = (await backfillResponse.json()) as { data: { jobId: string } };

    const backfillReplayResponse = await backfillConnector(
      authedRequest(`http://localhost/api/connectors/gmail/backfill`, orgId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": "connector-backfill-idempotency-001",
        },
        body: JSON.stringify({ days: 14 }),
      }),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(backfillReplayResponse.status).toBe(200);
    const backfillReplayPayload = (await backfillReplayResponse.json()) as { data: { jobId: string } };
    expect(backfillReplayPayload.data.jobId).toBe(backfillPayload.data.jobId);

    const connectorHealthResponse = await getConnectorHealth(
      authedRequest("http://localhost/api/connectors/gmail/health", orgId),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(connectorHealthResponse.status).toBe(200);
    const connectorHealthPayload = (await connectorHealthResponse.json()) as {
      data: { provider: string; connected: boolean };
    };
    expect(connectorHealthPayload.data.provider).toBe("gmail");
    expect(connectorHealthPayload.data.connected).toBe(true);

    const connectorRunsResponse = await getConnectorSyncRuns(
      authedRequest(`http://localhost/api/connectors/gmail/sync-runs`, orgId),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(connectorRunsResponse.status).toBe(200);
    const connectorRunsPayloadBeforeWorker = (await connectorRunsResponse.json()) as {
      data: {
        provider: string;
        runs: Array<{ syncStatus: string }>;
        jobs: Array<{ jobId: string; status: string }>;
      };
    };
    expect(connectorRunsPayloadBeforeWorker.data.provider).toBe("gmail");
    expect(connectorRunsPayloadBeforeWorker.data.runs).toHaveLength(0);
    expect(
      connectorRunsPayloadBeforeWorker.data.jobs.some(
        (item) => item.jobId === syncPayload.data.jobId && item.status === "queued"
      )
    ).toBe(true);

    const originalConnectorFetch = global.fetch;
    global.fetch = (async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("gmail.googleapis.com/gmail/v1/users/me/messages?")) {
        return new Response(JSON.stringify({ messages: [{ id: "msg-1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("gmail.googleapis.com/gmail/v1/users/me/messages/msg-1?format=metadata")) {
        return new Response(
          JSON.stringify({
            payload: {
              headers: [{ name: "Subject", value: "Connector Sync Proof Message" }],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return new Response(JSON.stringify({ error: "unexpected_connector_fetch_url", url }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const workerResponse = await runJobsWorker(
        authedRequest("http://localhost/api/jobs/worker?max=1", orgId, {
          method: "POST",
        })
      );
      expect(workerResponse.status).toBe(200);
      const workerPayload = (await workerResponse.json()) as {
        data: { processedCount: number };
      };
      expect(workerPayload.data.processedCount).toBe(1);
    } finally {
      global.fetch = originalConnectorFetch;
    }

    const connectorRunsAfterWorkerResponse = await getConnectorSyncRuns(
      authedRequest(`http://localhost/api/connectors/gmail/sync-runs`, orgId),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(connectorRunsAfterWorkerResponse.status).toBe(200);
    const connectorRunsPayloadAfterWorker = (await connectorRunsAfterWorkerResponse.json()) as {
      data: {
        provider: string;
        runs: Array<{ syncStatus: string }>;
        jobs: Array<{ jobId: string; status: string }>;
      };
    };
    expect(connectorRunsPayloadAfterWorker.data.provider).toBe("gmail");
    expect(connectorRunsPayloadAfterWorker.data.runs[0]?.syncStatus).toBe("succeeded");
    expect(
      connectorRunsPayloadAfterWorker.data.jobs.some(
        (item) => item.jobId === syncPayload.data.jobId && item.status === "succeeded"
      )
    ).toBe(true);

    const connectorsResponse = await listConnectors(authedRequest("http://localhost/api/connectors", orgId));
    expect(connectorsResponse.status).toBe(200);

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
    const approvalPoliciesResponse = await listApprovalPolicies(
      authedRequest("http://localhost/api/approval-policies", orgId)
    );
    expect(approvalPoliciesResponse.status).toBe(200);

    const entitlementResponse = await patchBilling(
      authedRequest("http://localhost/api/billing/entitlements", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "enterprise",
          autoSendEnabled: true,
          apiAccessEnabled: true,
          mcpAccessEnabled: true,
        }),
      })
    );
    expect(entitlementResponse.status).toBe(200);
    const effectiveEntitlementResponse = await getEffectiveEntitlement(
      authedRequest("http://localhost/api/billing/entitlements/effective", orgId)
    );
    expect(effectiveEntitlementResponse.status).toBe(200);

    const decisionResponse = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "auto-send-decide-001" },
        body: JSON.stringify({
          score: 94,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          draft: "Completely understand the concern on price. A scoped pilot may make sense.",
          recipient: "buyer@example.com",
          evidence: ["policy:pricing_objection"],
        }),
      })
    );
    expect(decisionResponse.status).toBe(200);
    const decisionPayload = (await decisionResponse.json()) as {
      data: { decision: { allowed: boolean }; sendEvent: { id: string } };
    };
    expect(decisionPayload.data.decision.allowed).toBe(true);
    const decisionReplayResponse = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "auto-send-decide-001" },
        body: JSON.stringify({
          score: 94,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          draft: "Completely understand the concern on price. A scoped pilot may make sense.",
          recipient: "buyer@example.com",
          evidence: ["policy:pricing_objection"],
        }),
      })
    );
    expect(decisionReplayResponse.status).toBe(200);
    const decisionReplayPayload = (await decisionReplayResponse.json()) as {
      data: { decision: { allowed: boolean }; sendEvent: { id: string } };
    };
    expect(decisionReplayPayload.data.decision.allowed).toBe(true);
    expect(decisionReplayPayload.data.sendEvent.id).toBe(decisionPayload.data.sendEvent.id);
    const simulateDecisionResponse = await simulateAutoSend(
      authedRequest("http://localhost/api/auto-send/simulate", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: 94,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          draft: "Completely understand the concern on price. A scoped pilot may make sense.",
          recipient: "buyer@example.com",
          evidence: ["policy:pricing_objection"],
        }),
      })
    );
    expect(simulateDecisionResponse.status).toBe(200);

    const sendEventsResponse = await getSendEvents(authedRequest("http://localhost/api/send-events", orgId));
    expect(sendEventsResponse.status).toBe(200);
    const sendEventsPayload = (await sendEventsResponse.json()) as {
      data: Array<{
        id: string;
        status: string;
        decisionSnapshot: { allowed: boolean; approvalDecisionStatus: string };
        reviewState: { status: string };
        riskState: { score: number; riskLevel: string };
        connectorTarget: { channel: string; recipient: string };
        delivery: { state: string; queuedAt: string };
      }>;
    };
    const firstSendEventId = sendEventsPayload.data[0]?.id;
    expect(firstSendEventId).toBeTruthy();
    expect(firstSendEventId).toBe(decisionPayload.data.sendEvent.id);
    expect(sendEventsPayload.data.filter((item) => item.id === firstSendEventId)).toHaveLength(1);
    expect(sendEventsPayload.data[0]?.status).toBe("queued");
    expect(sendEventsPayload.data[0]?.decisionSnapshot.allowed).toBe(true);
    expect(sendEventsPayload.data[0]?.decisionSnapshot.approvalDecisionStatus).toBe("approved");
    expect(sendEventsPayload.data[0]?.reviewState.status).toBe("not_required");
    expect(sendEventsPayload.data[0]?.riskState.score).toBe(94);
    expect(sendEventsPayload.data[0]?.riskState.riskLevel).toBe("low");
    expect(sendEventsPayload.data[0]?.connectorTarget.channel).toBe("email");
    expect(sendEventsPayload.data[0]?.connectorTarget.recipient).toBe("buyer@example.com");
    expect(sendEventsPayload.data[0]?.delivery.state).toBe("attempted");
    expect(sendEventsPayload.data[0]?.delivery.queuedAt).toBeTruthy();

    const sendEventDetailResponse = await getSendEventById(
      authedRequest(`http://localhost/api/send-events/${firstSendEventId}`, orgId),
      { params: Promise.resolve({ id: String(firstSendEventId) }) }
    );
    expect(sendEventDetailResponse.status).toBe(200);
    const sendEventDetailPayload = (await sendEventDetailResponse.json()) as {
      data: {
        id: string;
        decisionSnapshot: { reason: string; approvalDecisionReason: string };
        delivery: { state: string };
      };
    };
    expect(sendEventDetailPayload.data.id).toBe(firstSendEventId);
    expect(sendEventDetailPayload.data.delivery.state).toBe("attempted");
    expect(sendEventDetailPayload.data.decisionSnapshot.reason).toBeTruthy();
    expect(sendEventDetailPayload.data.decisionSnapshot.approvalDecisionReason).toBeTruthy();

    const apiKeyResponse = await createApiKey(
      authedRequest("http://localhost/api/api-keys", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Enterprise Eval Key",
          scopes: ["evaluation.read"],
        }),
      })
    );
    expect(apiKeyResponse.status).toBe(201);
    const apiKeyPayload = (await apiKeyResponse.json()) as { data: { rawKey: string } };
    const apiResponse = await getV1Evaluations(
      new NextRequest("http://localhost/api/v1/evaluations", {
        headers: {
          "x-ol-api-key": apiKeyPayload.data.rawKey,
          "x-ol-org-id": orgId,
        },
      })
    );
    expect(apiResponse.status).toBe(200);
    const openApiResponse = await getOpenApi();
    expect(openApiResponse.status).toBe(200);

    const webhookResponse = await createWebhook(
      authedRequest("http://localhost/api/webhooks", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://example.com/webhooks/operatorlayer",
          events: ["evaluation.created", "send_event.created"],
        }),
      })
    );
    expect(webhookResponse.status).toBe(201);
    const webhookPayload = (await webhookResponse.json()) as { data: { webhook: { id: string } } };
    const rotateResponse = await rotateWebhook(
      authedRequest(`http://localhost/api/webhooks/${webhookPayload.data.webhook.id}/rotate`, orgId, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: webhookPayload.data.webhook.id }) }
    );
    expect(rotateResponse.status).toBe(200);

    const dispatchResponse = await dispatchWebhook(
      authedRequest("http://localhost/api/webhooks/dispatch", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "webhook-dispatch-idempotency-001" },
        body: JSON.stringify({
          eventType: "evaluation.created",
          payload: { id: "eval-001" },
        }),
      })
    );
    expect(dispatchResponse.status).toBe(200);
    const dispatchPayload = (await dispatchResponse.json()) as { data: { queuedJobs: string[] } };

    const dispatchReplayResponse = await dispatchWebhook(
      authedRequest("http://localhost/api/webhooks/dispatch", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "webhook-dispatch-idempotency-001" },
        body: JSON.stringify({
          eventType: "evaluation.created",
          payload: { id: "eval-001" },
        }),
      })
    );
    expect(dispatchReplayResponse.status).toBe(200);
    const dispatchReplayPayload = (await dispatchReplayResponse.json()) as { data: { queuedJobs: string[] } };
    expect(dispatchReplayPayload.data.queuedJobs).toEqual(dispatchPayload.data.queuedJobs);

    const replayHistoryResponse = await getWebhookReplayHistory(
      authedRequest(`http://localhost/api/webhooks/${webhookPayload.data.webhook.id}/replay`, orgId),
      { params: Promise.resolve({ id: webhookPayload.data.webhook.id }) }
    );
    expect(replayHistoryResponse.status).toBe(200);
    const replayHistoryPayload = (await replayHistoryResponse.json()) as {
      data: { replayable: Array<{ jobId: string }> };
    };
    const replaySourceJobId = replayHistoryPayload.data.replayable[0]?.jobId;
    expect(replaySourceJobId).toBeTruthy();

    const replayResponse = await replayWebhook(
      authedRequest(`http://localhost/api/webhooks/${webhookPayload.data.webhook.id}/replay`, orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "webhook-replay-idempotency-001" },
        body: JSON.stringify({ jobId: replaySourceJobId }),
      }),
      { params: Promise.resolve({ id: webhookPayload.data.webhook.id }) }
    );
    expect(replayResponse.status).toBe(200);
    const replayPayload = (await replayResponse.json()) as { data: { replayJobId: string } };

    const replayAgainResponse = await replayWebhook(
      authedRequest(`http://localhost/api/webhooks/${webhookPayload.data.webhook.id}/replay`, orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "webhook-replay-idempotency-001" },
        body: JSON.stringify({ jobId: replaySourceJobId }),
      }),
      { params: Promise.resolve({ id: webhookPayload.data.webhook.id }) }
    );
    expect(replayAgainResponse.status).toBe(200);
    const replayAgainPayload = (await replayAgainResponse.json()) as { data: { replayJobId: string } };
    expect(replayAgainPayload.data.replayJobId).toBe(replayPayload.data.replayJobId);

    const ssoResponse = await patchSsoConfig(
      authedRequest("http://localhost/api/sso/config", orgId, {
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
    expect(ssoResponse.status).toBe(200);

    const governanceResponse = await patchGovernance(
      authedRequest("http://localhost/api/data-governance/policies", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: 730,
          legalHoldEnabled: false,
          deletionRequiresApproval: true,
          invitePolicy: "open",
          sessionDurationMinutes: 480,
          enforcedMfa: true,
          breakGlassAdminEnabled: true,
        }),
      })
    );
    expect(governanceResponse.status).toBe(200);

    const deletionResponse = await createDeletionRequest(
      authedRequest("http://localhost/api/data-governance/deletion-requests", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Customer requested GDPR erase flow.",
          target: "sources_only",
        }),
      })
    );
    expect(deletionResponse.status).toBe(201);
    const deletionPayload = (await deletionResponse.json()) as { data: { id: string } };

    const completeResponse = await completeDeletionRequest(
      authedRequest(
        `http://localhost/api/data-governance/deletion-requests/${deletionPayload.data.id}/complete`,
        orgId,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvalTicketRef: "INC-ERASE-001",
            executionMode: "anonymize",
            proofRecordId: "proof-enterprise-api-001",
            deletedObjectCounts: {
              sources: 1,
              evaluations: 0,
              exports: 0,
              jobs: 0,
            },
            dependentArtifactsHandled: [],
            notes: "Enterprise API test completion.",
          }),
        }
      ),
      { params: Promise.resolve({ id: deletionPayload.data.id }) }
    );
    expect(completeResponse.status).toBe(200);

    const scimResponse = await scimProvision(
      new NextRequest("http://localhost/api/scim/provision", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
          "x-user-id": "test-user-001",
          "x-org-id": orgId,
          "x-user-role": "owner",
        },
        body: JSON.stringify({
          action: "provision_user",
          userId: "user-scim-001",
          email: "scim-user@example.com",
          role: "member",
        }),
      })
    );
    expect(scimResponse.status).toBe(200);

    const createGroupResponse = await createScimGroup(
      new NextRequest("http://localhost/api/scim/v2/Groups", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "Sales Team",
          members: [{ value: "user-scim-001" }],
        }),
      })
    );
    expect(createGroupResponse.status).toBe(201);

    const listGroupsResponse = await listScimGroups(
      new NextRequest("http://localhost/api/scim/v2/Groups", {
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
        },
      })
    );
    expect(listGroupsResponse.status).toBe(200);

    const scimBulkResponse = await scimBulk(
      new NextRequest("http://localhost/api/scim/v2/Bulk", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
          Operations: [
            {
              method: "POST",
              path: "/Users",
              bulkId: "bulk-user-1",
              data: {
                emails: [{ value: "bulk-user@example.com" }],
                roles: [{ value: "member" }],
              },
            },
            {
              method: "POST",
              path: "/Groups",
              bulkId: "bulk-group-1",
              data: {
                displayName: "Bulk Group",
                members: [{ value: "user-scim-001" }],
              },
            },
          ],
        }),
      })
    );
    expect(scimBulkResponse.status).toBe(200);

    const readinessResponse = await getReadiness(
      authedRequest("http://localhost/api/enterprise/readiness", orgId)
    );
    expect(readinessResponse.status).toBe(200);

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: { events: Array<{ action: string }> };
    };
    expect(auditPayload.data.events.length).toBeGreaterThan(0);
    expect(
      auditPayload.data.events.some((event) => event.action.includes("enterprise:connector_upsert"))
    ).toBe(true);
    expect(
      auditPayload.data.events.some((event) => event.action.includes("enterprise:connector_sync_result"))
    ).toBe(true);

    const samlMetadataResponse = await getSamlMetadata();
    expect(samlMetadataResponse.status).toBe(200);
    const samlMetadataXml = await samlMetadataResponse.text();
    expect(samlMetadataXml).toContain("EntityDescriptor");
    expect(samlMetadataXml).toContain("AssertionConsumerService");

    const reconcileResponse = await reconcileBilling(
      authedRequest("http://localhost/api/billing/reconcile?apply=1", orgId, {
        method: "POST",
      })
    );
    expect(reconcileResponse.status).toBe(200);

    const reconcileEventResponse = await reconcileBillingEvent(
      authedRequest("http://localhost/api/billing/reconcile/evt_test_001", orgId, {
        method: "POST",
      }),
      { params: Promise.resolve({ providerEventId: "evt_test_001" }) }
    );
    expect(reconcileEventResponse.status).toBe(200);

    const mcpAuditResponse = await getMcpAudit(
      authedRequest("http://localhost/api/mcp/audit", orgId)
    );
    expect(mcpAuditResponse.status).toBe(200);
  });
});
