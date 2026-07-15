import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as listLlmProviders, POST as createLlmProvider } from "@/app/api/llm/providers/route";
import { POST as revokeLlmProvider } from "@/app/api/llm/providers/[id]/revoke/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

type Role = "owner" | "admin" | "member";

function authedRequest(
  url: string,
  orgId: string,
  role: Role = "owner",
  init: RequestInit = {},
  capabilities?: string[]
) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", role === "owner" ? "owner-user-llm-001" : "admin-user-llm-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  headers.set("x-user-email", `${role}@example.com`);
  if (capabilities !== undefined) {
    headers.set("x-user-capabilities", capabilities.join(","));
  }
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "owner-user-llm-001",
        "x-user-email": "owner@example.com",
      },
      body: JSON.stringify({ name: "LLM Routing Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("LLM provider key APIs", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY = "test-secret-encryption-key";
  });

  it("stores client BYOK provider keys without returning raw or encrypted secrets", async () => {
    const orgId = await createOrg();

    const denied = await createLlmProvider(
      authedRequest(
        "http://localhost/api/llm/providers",
        orgId,
        "admin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "openai",
            displayName: "Primary OpenAI",
            model: "gpt-4.1-mini",
            apiKey: "sk-denied-client-secret",
          }),
        },
        []
      )
    );
    expect(denied.status).toBe(403);

    const created = await createLlmProvider(
      authedRequest(
        "http://localhost/api/llm/providers",
        orgId,
        "admin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "openai",
            displayName: "Primary OpenAI",
            model: "gpt-4.1-mini",
            apiKey: "sk-live-client-secret-001",
            setActive: true,
          }),
        },
        ["api-admin"]
      )
    );
    expect(created.status).toBe(201);
    const createdPayload = (await created.json()) as {
      data: { credential: { id: string; keyPreview: string; active: boolean } };
    };
    expect(createdPayload.data.credential.active).toBe(true);
    expect(createdPayload.data.credential.keyPreview).toBe("sk-...-001");
    expect(JSON.stringify(createdPayload)).not.toContain("sk-live-client-secret-001");
    expect(JSON.stringify(createdPayload)).not.toContain("secretEncrypted");

    const listed = await listLlmProviders(
      authedRequest("http://localhost/api/llm/providers", orgId, "owner", {}, ["api-admin"])
    );
    expect(listed.status).toBe(200);
    const listedPayload = (await listed.json()) as {
      data: { providers: Array<{ id: string; status: string; active: boolean }> };
    };
    expect(listedPayload.data.providers).toEqual([
      expect.objectContaining({
        id: createdPayload.data.credential.id,
        status: "active",
        active: true,
      }),
    ]);
    expect(JSON.stringify(listedPayload)).not.toContain("sk-live-client-secret-001");
    expect(JSON.stringify(listedPayload)).not.toContain("secretEncrypted");

    const audit = await getAuditEvents(authedRequest("http://localhost/api/audit/events", orgId));
    expect(audit.status).toBe(200);
    const auditPayload = await audit.json();
    const auditText = JSON.stringify(auditPayload);
    expect(auditText).toContain("enterprise:llm_provider_key_upsert");
    expect(auditText).not.toContain("sk-live-client-secret-001");
    expect(auditText).toContain('"secretEncrypted":"[redacted]"');

    const revoked = await revokeLlmProvider(
      authedRequest(
        `http://localhost/api/llm/providers/${createdPayload.data.credential.id}/revoke`,
        orgId,
        "owner",
        { method: "POST" },
        ["api-admin"]
      ),
      { params: Promise.resolve({ id: createdPayload.data.credential.id }) }
    );
    expect(revoked.status).toBe(200);

    const afterRevoke = await listLlmProviders(
      authedRequest("http://localhost/api/llm/providers", orgId, "owner", {}, ["api-admin"])
    );
    const afterPayload = (await afterRevoke.json()) as {
      data: { providers: Array<{ id: string; status: string; active: boolean }> };
    };
    expect(afterPayload.data.providers[0]).toEqual(
      expect.objectContaining({ status: "revoked", active: false })
    );
  });
});
