import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as listPolicies } from "@/app/api/policies/route";
import { PATCH as patchPolicy } from "@/app/api/policies/[id]/route";
import { POST as createExport } from "@/app/api/exports/route";
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

  it("blocks exports until a human approves extracted policy", async () => {
    const form = new FormData();
    form.set("title", "Export review gate");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "price is too high. based on what you shared. price is too high.");
    const upload = await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));
    expect(upload.status).toBe(201);

    const blocked = await createExport(
      request("http://localhost/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: "full_pack" }),
      })
    );
    expect(blocked.status).toBe(409);

    const policies = await listPolicies(request("http://localhost/api/policies"));
    const { data } = (await policies.json()) as { data: Array<{ id: string }> };
    await patchPolicy(
      request(`http://localhost/api/policies/${data[0].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: Promise.resolve({ id: data[0].id }) }
    );

    const created = await createExport(
      request("http://localhost/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: "full_pack" }),
      })
    );
    expect(created.status).toBe(201);
    const payload = (await created.json()) as { data: { artifacts: Array<{ name: string }> } };
    expect(payload.data.artifacts.map((artifact) => artifact.name).sort()).toEqual([
      "agent_prompt_pack.md",
      "approval_rules.json",
      "approved_examples.jsonl",
      "communication_policy.json",
      "company_voice.md",
      "evaluation_rubric.json",
      "forbidden_phrases.json",
      "phrase_library.json",
      "policy_version_manifest.json",
      "rejected_examples.jsonl",
      "scenario_playbooks.json",
    ]);
  });
});
