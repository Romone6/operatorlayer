import type { EvaluationRecord } from "@/lib/types";

type ExplainabilityRule = {
  rule: string;
  category: "forbidden_phrase" | "missing_required_element" | "policy_violation";
  violated: boolean;
};

type ExplainabilityEvidenceRef = {
  sourceType: "policy" | "scenario" | "evaluation";
  reference: string;
};

function buildRepairDiff(original: string, repaired: string | null) {
  if (!repaired || repaired === original) {
    return [];
  }
  const beforeLines = original.split(/\r?\n/);
  const afterLines = repaired.split(/\r?\n/);
  const max = Math.max(beforeLines.length, afterLines.length);
  const diff: Array<{ before: string; after: string }> = [];
  for (let index = 0; index < max; index += 1) {
    const before = beforeLines[index] ?? "";
    const after = afterLines[index] ?? "";
    if (before !== after) {
      diff.push({ before, after });
    }
  }
  return diff;
}

function classifyViolation(violation: string): ExplainabilityRule["category"] {
  if (violation.toLowerCase().includes("forbidden phrase")) return "forbidden_phrase";
  if (violation.toLowerCase().includes("missing required")) return "missing_required_element";
  return "policy_violation";
}

export function buildEvaluationExplainabilityPack(record: EvaluationRecord) {
  const violatedRules: ExplainabilityRule[] = record.policyViolations.map((violation) => ({
    rule: violation,
    category: classifyViolation(violation),
    violated: true,
  }));

  const missingFlowSteps = record.missingRequiredElements;
  const riskOverrides = record.scores.riskOverride ? [record.scores.riskOverride] : [];
  const evidenceReferences: ExplainabilityEvidenceRef[] = [
    {
      sourceType: "evaluation",
      reference: `evaluation:${record.id}`,
    },
    ...record.policyViolations.map((violation) => ({
      sourceType: "policy" as const,
      reference: `policy_violation:${violation}`,
    })),
    ...record.missingRequiredElements.map((step) => ({
      sourceType: "scenario" as const,
      reference: `missing_flow:${step}`,
    })),
  ];

  return {
    evaluationId: record.id,
    scoringBreakdown: record.scores,
    violatedRules,
    missingFlowSteps,
    riskOverrides,
    evidenceReferences,
    repairTraceability: {
      beforeDraft: record.originalDraft,
      afterDraft: record.repairedDraft ?? record.originalDraft,
      diff: buildRepairDiff(record.originalDraft, record.repairedDraft),
      appliedRuleReferences: record.policyViolations,
      rationale:
        record.repairRequired || record.approvalRequired
          ? "Repair or human approval required due to policy/flow/risk conditions."
          : "Draft passed policy and flow checks without repair.",
    },
  };
}
