import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as listPolicies } from "@/app/api/policies/route";
import { PATCH as patchPolicy } from "@/app/api/policies/[id]/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function request(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", "test-org-001");
  return new NextRequest(url, { ...init, headers });
}

describe("policy review endpoints", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("patches extracted policy status", async () => {
    const form = new FormData();
    form.set("title", "Manual Policy Patch");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "price is too high. based on what you shared. price is too high.");

    await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));

    const policyRes = await listPolicies(request("http://localhost/api/policies"));
    const policyPayload = (await policyRes.json()) as { data: Array<{ id: string; status: string }> };
    expect(policyPayload.data.length).toBeGreaterThan(0);

    const policyId = policyPayload.data[0].id;
    const patchRes = await patchPolicy(
      request(`http://localhost/api/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: policyId }) }
    );

    expect(patchRes.status).toBe(200);
    const patchPayload = (await patchRes.json()) as { data: { status: string } };
    expect(patchPayload.data.status).toBe("approved");
  });
});