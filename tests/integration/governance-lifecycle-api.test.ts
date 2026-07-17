import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { resetMemoryRepository, MemoryRepository } from "@/lib/repository/memory";
import { POST as createExample, GET as listExamples } from "@/app/api/examples/route";
import { GET as currentPolicyPack } from "@/app/api/policy-packs/current/route";
import { GET as diffPolicyPacks } from "@/app/api/policy-packs/diff/route";
import { GET as scorecard } from "@/app/api/scorecard/route";
import { POST as importFeedback } from "@/app/api/feedback/import/route";

function request(url: string, organisationId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "reviewer-a");
  headers.set("x-org-id", organisationId);
  headers.set("x-user-role", "reviewer");
  return new NextRequest(url, { ...init, headers });
}

describe("governance lifecycle records", () => {
  beforeEach(() => resetMemoryRepository());

  it("keeps an approved example inside its organisation with reviewer rationale", async () => {
    const repository = new MemoryRepository();
    const example = await repository.createReviewedExample({
      organisationId: "org-a",
      scenarioId: null,
      evaluationId: null,
      exampleType: "approved",
      inputMessage: "Can you discount this?",
      responseText: "I can outline the approved options.",
      rationale: "Keeps the commercial boundary clear.",
      reviewedBy: "reviewer-a",
    });

    expect(example.rationale).toBe("Keeps the commercial boundary clear.");
    expect((await repository.listReviewedExamples("org-a")).map((item) => item.id)).toEqual([example.id]);
    expect(await repository.listReviewedExamples("org-b")).toEqual([]);
  });

  it("creates and lists reviewed examples through the human-controlled API", async () => {
    const created = await createExample(request("http://localhost/api/examples", "org-a", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exampleType: "approved", inputMessage: "Can you discount this?", responseText: "I can outline approved options.", rationale: "No unauthorised concession." }),
    }));
    expect(created.status).toBe(201);
    const own = await listExamples(request("http://localhost/api/examples", "org-a"));
    const other = await listExamples(request("http://localhost/api/examples", "org-b"));
    expect((await own.json()).data).toHaveLength(1);
    expect((await other.json()).data).toEqual([]);
  });

  it("serves the latest pack and reports changed artifacts between real versions", async () => {
    const repository = new MemoryRepository();
    const first = await repository.createExport("org-a", "full_pack", [{ name: "company_voice.md", contentType: "text/markdown", content: "first", checksum: "one" }], { version: 1, artifactCount: 1, checksum: "first", signature: "first", signedAt: new Date().toISOString() });
    await repository.createExport("org-a", "full_pack", [{ name: "company_voice.md", contentType: "text/markdown", content: "second", checksum: "two" }], { version: 2, artifactCount: 1, checksum: "second", signature: "second", signedAt: new Date().toISOString(), previousExportId: first.id });
    const current = await currentPolicyPack(request("http://localhost/api/policy-packs/current", "org-a"));
    const diff = await diffPolicyPacks(request("http://localhost/api/policy-packs/diff?from=1&to=2", "org-a"));
    expect((await current.json()).data.manifest.version).toBe(2);
    expect((await diff.json()).data.changed).toEqual(["company_voice.md"]);
  });

  it("summarises only persisted evaluation outcomes", async () => {
    const repository = new MemoryRepository();
    await repository.createEvaluation("org-a", { scenarioId: null, inputMessage: "a", originalDraft: "a", repairedDraft: null, detectedPhrases: [], missingRequiredElements: [], policyViolations: [], scores: { total: 80, policyCompliance: 80, scenarioFlow: 80, approvedTerminology: 80, forbiddenPhraseAvoidance: 80, toneMatch: 80, clarityNextStep: 80 }, approvalRequired: false, repairRequired: false });
    await repository.createEvaluation("org-a", { scenarioId: null, inputMessage: "b", originalDraft: "b", repairedDraft: "fixed", detectedPhrases: [], missingRequiredElements: [], policyViolations: ["claim"], scores: { total: 60, policyCompliance: 60, scenarioFlow: 60, approvedTerminology: 60, forbiddenPhraseAvoidance: 60, toneMatch: 60, clarityNextStep: 60 }, approvalRequired: true, repairRequired: true });
    const response = await scorecard(request("http://localhost/api/scorecard", "org-a"));
    expect((await response.json()).data).toMatchObject({ evaluationCount: 2, averageScore: 70, repairRequiredCount: 1, approvalRequiredCount: 1 });
  });

  it("imports a bounded batch of labelled feedback without crossing organisations", async () => {
    const response = await importFeedback(request("http://localhost/api/feedback/import", "org-a", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records: [{ outcome: "edited", rationale: "Reviewer corrected a claim.", correctedDraft: "Corrected." }] }) }));
    expect(response.status).toBe(201);
    expect((await new MemoryRepository().listFeedback("org-a"))).toHaveLength(1);
    expect(await new MemoryRepository().listFeedback("org-b")).toEqual([]);
  });
});
