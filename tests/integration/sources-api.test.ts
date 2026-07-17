import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listSources } from "@/app/api/sources/route";
import { DELETE as deleteSource } from "@/app/api/sources/[id]/route";
import { POST as reprocessSource } from "@/app/api/sources/[id]/reprocess/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { POST as processSource } from "@/app/api/sources/[id]/process/route";
import * as parsers from "@/lib/parsers";
import { resetMemoryRepository } from "@/lib/repository/memory";
import { getRepository } from "@/lib/repository";

vi.mock("@/lib/intelligence", () => ({
  extractPolicyFromManual: vi.fn(async () => [
    {
      rule_id: "pricing_001",
      rule_type: "scenario_response_flow",
      scenario: "pricing_objection",
      severity: "medium",
      status: "suggested",
      rule: "When price objection appears, acknowledge concern and offer scoped pilot without discounts.",
      required_sequence: ["acknowledge", "reframe", "pilot", "next_step"],
      approved_phrases: ["Completely understand the concern on price."],
      forbidden_phrases: ["We can definitely discount that."],
      human_review_conditions: ["contract changes"],
      confidence: 0.91,
    },
  ]),
  extractScenariosFromExamples: vi.fn(async () => [
    {
      name: "Pricing objection",
      category: "sales",
      description: "Handle pricing objections while preserving policy boundaries.",
      risk_level: "medium",
      trigger_phrases: ["price is too high"],
      response_flow: ["acknowledge", "reframe", "pilot", "next_step"],
      approved_terminology: ["scoped pilot"],
      forbidden_terminology: ["guaranteed ROI"],
      examples: ["We can start with a pilot tied to your adoption goals."],
      bad_examples: ["No risk at all."],
      approval_rules: ["Escalate discounts to manager."],
      evaluation_rubric: { compliance: 30, flow: 30, tone: 20, clarity: 20 },
    },
  ]),
  detectPolicyConflicts: vi.fn(async () => []),
  extractTerminologyPatterns: vi.fn(async () => [
    {
      phrase: "price is too",
      recommendation: "Use approved pricing playbook",
      status: "approved",
      scenario: "pricing_objection",
    },
  ]),
}));

import { extractPolicyFromManual } from "@/lib/intelligence";

function request(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", "test-org-001");
  return new NextRequest(url, { ...init, headers });
}

describe("sources API integration", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("enforces org scoping", async () => {
    const form = new FormData();
    form.set("title", "Policy manual");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "price is too high. price is too high. price is too high.");

    await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));

    const resOtherOrg = await listSources(
      new NextRequest("http://localhost/api/sources", {
        headers: { "x-user-id": "another", "x-org-id": "other-org" },
      })
    );

    const payload = (await resOtherOrg.json()) as { data: unknown[] };
    expect(payload.data).toHaveLength(0);
  });

  it("persists records after upload and processing", async () => {
    const form = new FormData();
    form.set("title", "Manual A");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "price is too high. price is too high. based on what you shared.");

    const uploadRes = await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));
    expect(uploadRes.status).toBe(201);

    const listRes = await listSources(request("http://localhost/api/sources"));
    const listPayload = (await listRes.json()) as { data: Array<{ processingStatus: string; policyCount: number }> };

    expect(listPayload.data).toHaveLength(1);
    expect(listPayload.data[0].processingStatus).toBe("extracted");
    expect(listPayload.data[0].policyCount).toBeGreaterThan(0);
  });

  it("preserves scenarios from earlier sources when another source is processed", async () => {
    for (const [title, pastedText] of [
      ["Manual one", "price is too high. based on what you shared."],
      ["Manual two", "discount requests need a manager review."],
    ]) {
      const form = new FormData();
      form.set("title", title);
      form.set("sourceType", "pasted_text");
      form.set("authorityLevel", "standard");
      form.set("pastedText", pastedText);
      const response = await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));
      expect(response.status).toBe(201);
    }

    expect(await getRepository().listScenarios("test-org-001")).toHaveLength(2);
  });

  it("marks failed when model extraction fails", async () => {
    vi.mocked(extractPolicyFromManual).mockRejectedValueOnce(new Error("model failure"));

    const form = new FormData();
    form.set("title", "Manual B");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "price is too high. price is too high.");

    const res = await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));
    expect(res.status).toBe(500);

    const listRes = await listSources(request("http://localhost/api/sources"));
    const payload = (await listRes.json()) as { data: Array<{ processingStatus: string; metadata: { error?: string } }> };

    expect(payload.data[0].processingStatus).toBe("failed");
    expect(payload.data[0].metadata.error).toContain("model failure");
  });

  it("marks failed when parser fails", async () => {
    vi.spyOn(parsers, "extractTextFromSource").mockRejectedValueOnce(new Error("parser failure"));

    const form = new FormData();
    form.set("title", "Broken PDF");
    form.set("sourceType", "pdf");
    form.set("authorityLevel", "standard");
    form.set("file", new File([Buffer.from("not-a-valid-pdf")], "broken.pdf", { type: "application/pdf" }));

    const res = await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));
    expect(res.status).toBe(500);

    const listRes = await listSources(request("http://localhost/api/sources"));
    const payload = (await listRes.json()) as {
      data: Array<{ processingStatus: string; metadata: { error?: string } }>;
    };
    expect(payload.data[0].processingStatus).toBe("failed");
    expect(payload.data[0].metadata.error).toContain("parser failure");
  });

  it("rejects source files larger than the supported upload limit", async () => {
    vi.spyOn(parsers, "extractTextFromSource").mockResolvedValueOnce("policy text");

    const form = new FormData();
    form.set("title", "Oversized manual");
    form.set("sourceType", "txt");
    form.set("authorityLevel", "standard");
    form.set("file", new File([Buffer.alloc(10 * 1024 * 1024 + 1)], "manual.txt", { type: "text/plain" }));

    const response = await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));
    expect(response.status).toBe(400);
  });

  it("supports process, reprocess, and delete endpoints", async () => {
    const form = new FormData();
    form.set("title", "Manual C");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "price is too high. based on what you shared.");

    const uploadRes = await uploadSource(request("http://localhost/api/sources/upload", { method: "POST", body: form }));
    const uploadPayload = (await uploadRes.json()) as { data: { id: string } };
    const sourceId = uploadPayload.data.id;

    const processRes = await processSource(
      request(`http://localhost/api/sources/${sourceId}/process`, {
        method: "POST",
        headers: { "idempotency-key": "process-source-idempotent" },
      }),
      {
        params: Promise.resolve({ id: sourceId }),
      }
    );
    expect(processRes.status).toBe(200);
    const processPayload = (await processRes.json()) as { data: { jobId: string } };

    const processResReplay = await processSource(
      request(`http://localhost/api/sources/${sourceId}/process`, {
        method: "POST",
        headers: { "idempotency-key": "process-source-idempotent" },
      }),
      {
        params: Promise.resolve({ id: sourceId }),
      }
    );
    expect(processResReplay.status).toBe(200);
    const processReplayPayload = (await processResReplay.json()) as { data: { jobId: string } };
    expect(processReplayPayload.data.jobId).toBe(processPayload.data.jobId);

    const reprocessRes = await reprocessSource(
      request(`http://localhost/api/sources/${sourceId}/reprocess`, {
        method: "POST",
        headers: { "idempotency-key": "reprocess-source-idempotent" },
      }),
      { params: Promise.resolve({ id: sourceId }) }
    );
    expect(reprocessRes.status).toBe(200);
    const reprocessPayload = (await reprocessRes.json()) as { data: { jobId: string } };

    const reprocessResAgain = await reprocessSource(
      request(`http://localhost/api/sources/${sourceId}/reprocess`, {
        method: "POST",
        headers: { "idempotency-key": "reprocess-source-idempotent" },
      }),
      { params: Promise.resolve({ id: sourceId }) }
    );
    expect(reprocessResAgain.status).toBe(200);
    const reprocessAgainPayload = (await reprocessResAgain.json()) as { data: { jobId: string } };
    expect(reprocessAgainPayload.data.jobId).toBe(reprocessPayload.data.jobId);

    const deleteRes = await deleteSource(request(`http://localhost/api/sources/${sourceId}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: sourceId }),
    });
    expect(deleteRes.status).toBe(200);

    const listRes = await listSources(request("http://localhost/api/sources"));
    const payload = (await listRes.json()) as { data: unknown[] };
    expect(payload.data).toHaveLength(0);
    expect(await getRepository().listScenarios("test-org-001")).toHaveLength(0);
  });
});
