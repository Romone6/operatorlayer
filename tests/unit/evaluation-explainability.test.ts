import { describe, expect, it } from "vitest";

import { buildEvaluationExplainabilityPack } from "@/lib/enterprise/evaluation-explainability";
import type { EvaluationRecord } from "@/lib/types";

function record(input: Partial<EvaluationRecord> = {}): EvaluationRecord {
  return {
    id: "eval-001",
    organisationId: "org-001",
    scenarioId: "scenario-001",
    inputMessage: "Customer asks for discount",
    originalDraft: "We can offer an immediate contract discount.",
    repairedDraft: "Thanks for raising this. We can review options and align next steps.",
    detectedPhrases: ["discount"],
    missingRequiredElements: ["acknowledge_concern"],
    policyViolations: ["Forbidden phrase detected: immediate contract discount"],
    scores: {
      total: 72,
      policyCompliance: 60,
      scenarioFlow: 70,
      approvedTerminology: 40,
      forbiddenPhraseAvoidance: 55,
      toneMatch: 85,
      clarityNextStep: 70,
      riskOverride: "discount",
    },
    approvalRequired: true,
    repairRequired: true,
    createdAt: "2026-05-18T00:00:00.000Z",
    ...input,
  };
}

describe("buildEvaluationExplainabilityPack", () => {
  it("builds scoring/violations/evidence and repair diff", () => {
    const pack = buildEvaluationExplainabilityPack(record());
    expect(pack.evaluationId).toBe("eval-001");
    expect(pack.scoringBreakdown.total).toBe(72);
    expect(pack.violatedRules.some((item) => item.category === "forbidden_phrase")).toBe(true);
    expect(pack.missingFlowSteps).toContain("acknowledge_concern");
    expect(pack.riskOverrides).toContain("discount");
    expect(pack.repairTraceability.diff.length).toBeGreaterThan(0);
  });
});
