import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createApiKey } from "@/app/api/api-keys/route";
import { GET as getAudit } from "@/app/api/mcp/audit/route";
import { POST as invokeMcp } from "@/app/api/mcp/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchBilling } from "@/app/api/billing/entitlements/route";
import { POST as createExport } from "@/app/api/exports/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "mcp-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "owner@example.com");
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "mcp-owner-001",
        "x-user-email": "owner@example.com",
      },
      body: JSON.stringify({ name: "MCP Invocation Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

async function prepareMcpOrg(orgId: string) {
  const enableMcp = await patchFeatureFlags(
    authedRequest("http://localhost/api/feature-flags", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "mcp_actions", enabled: true, rolloutPercent: 100 }),
    })
  );
  expect(enableMcp.status).toBe(200);

  const entitlement = await patchBilling(
    authedRequest("http://localhost/api/billing/entitlements", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: "enterprise",
        status: "active",
        apiAccessEnabled: true,
        mcpAccessEnabled: true,
      }),
    })
  );
  expect(entitlement.status).toBe(200);
}

async function createRawApiKey(orgId: string, scopes: string[]) {
  const response = await createApiKey(
    authedRequest("http://localhost/api/api-keys", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `MCP ${scopes.join(" ")}`, scopes }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { rawKey: string; credential: { id: string } } };
  return payload.data;
}

function externalMcpRequest(orgId: string, rawKey: string, body: unknown) {
  return new NextRequest("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ol-api-key": rawKey,
      "x-ol-org-id": orgId,
    },
    body: JSON.stringify(body),
  });
}

async function createPolicyPack(orgId: string) {
  const form = new FormData();
  form.set("title", "MCP Policy Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    "Price is too high. Based on what you shared, a scoped pilot may fit. Never say no risk at all."
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

describe("MCP invocation API", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_DATA_BACKEND = "memory";
    process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "1";
    process.env.OPERATORLAYER_PROCESSING_MODE = "deterministic";
    delete process.env.OPENAI_API_KEY;
  });

  it("invokes policy-pack fetch, draft evaluate, and draft repair with API-key scopes and audit records", async () => {
    const orgId = await createOrg();
    await prepareMcpOrg(orgId);
    await createPolicyPack(orgId);
    const apiKey = await createRawApiKey(orgId, ["policy.read", "evaluation.write"]);

    const policyPack = await invokeMcp(
      externalMcpRequest(orgId, apiKey.rawKey, {
        toolId: "policy_pack.fetch",
        input: {},
      })
    );
    expect(policyPack.status).toBe(200);
    const policyPackPayload = (await policyPack.json()) as {
      data: { toolId: string; invocationId: string; result: { artifacts: Array<{ name: string }> } };
    };
    expect(policyPackPayload.data.toolId).toBe("policy_pack.fetch");
    expect(policyPackPayload.data.result.artifacts.some((item) => item.name === "agent_prompt_pack.md")).toBe(true);

    const evaluated = await invokeMcp(
      externalMcpRequest(orgId, apiKey.rawKey, {
        toolId: "draft.evaluate",
        input: {
          inputMessage: "Can you discount this?",
          draft: "We can definitely discount this. No risk at all.",
        },
      })
    );
    expect(evaluated.status).toBe(200);
    const evaluatedPayload = (await evaluated.json()) as {
      data: { result: { evaluation: { scores: { total: number }; policyViolations: string[] } } };
    };
    expect(evaluatedPayload.data.result.evaluation.scores.total).toBeLessThan(90);
    expect(evaluatedPayload.data.result.evaluation.policyViolations.length).toBeGreaterThan(0);

    const repaired = await invokeMcp(
      externalMcpRequest(orgId, apiKey.rawKey, {
        toolId: "draft.repair",
        input: {
          inputMessage: "Can you discount this?",
          draft: "We can definitely discount this. No risk at all.",
          channel: "email",
          team: "sales",
          customerType: "prospect",
        },
      })
    );
    expect(repaired.status).toBe(200);
    const repairedPayload = (await repaired.json()) as {
      data: { result: { repairedDraft: string | null; evaluationRecord: { id: string } } };
    };
    expect(repairedPayload.data.result.evaluationRecord.id).toBeTruthy();
    expect(repairedPayload.data.result.repairedDraft).toContain("scoped");

    const audit = await getAudit(authedRequest("http://localhost/api/mcp/audit", orgId));
    expect(audit.status).toBe(200);
    const auditPayload = (await audit.json()) as {
      data: { count: number; entries: Array<{ action: string; details: { status: string; toolId: string } }> };
    };
    expect(auditPayload.data.count).toBeGreaterThanOrEqual(3);
    expect(
      auditPayload.data.entries.filter(
        (item) => item.action === "enterprise:mcp_tool_invocation" && item.details.status === "succeeded"
      )
    ).toHaveLength(3);
  });

  it("fails closed and audits failure when credential scope is missing", async () => {
    const orgId = await createOrg();
    await prepareMcpOrg(orgId);
    const apiKey = await createRawApiKey(orgId, ["policy.read"]);

    const response = await invokeMcp(
      externalMcpRequest(orgId, apiKey.rawKey, {
        toolId: "draft.evaluate",
        input: {
          inputMessage: "Can you discount this?",
          draft: "We can definitely discount this.",
        },
      })
    );
    expect(response.status).toBe(403);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("mcp_scope_forbidden");

    const audit = await getAudit(authedRequest("http://localhost/api/mcp/audit", orgId));
    const auditPayload = (await audit.json()) as {
      data: { entries: Array<{ details: { status: string; errorCode?: string } }> };
    };
    expect(
      auditPayload.data.entries.some(
        (item) => item.details.status === "failed" && item.details.errorCode === "mcp_scope_forbidden"
      )
    ).toBe(true);
  });
});
