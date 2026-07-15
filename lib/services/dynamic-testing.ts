import crypto from "node:crypto";

import { AppError } from "@/lib/errors";
import { generateScenarioGuidance, evaluateDraft } from "@/lib/services/playground";
import type { OperatorRepository } from "@/lib/repository/interface";
import type { AppRole, EvaluationRecord, Severity } from "@/lib/types";

type DynamicTestExpectation = {
  shouldPass: boolean;
  minScore: number;
  requiredOutcome: "compliant" | "blocked_or_repaired";
};

export type DynamicTestCase = {
  id: string;
  type: "scenario_flow" | "policy_boundary" | "approved_example" | "rejected_example" | "audit_failure";
  sourceId: string;
  scenarioId: string | null;
  inputMessage: string;
  draft: string;
  expectation: DynamicTestExpectation;
  evidence: Array<{ sourceType: "policy" | "scenario" | "evaluation" | "audit"; sourceId: string; anchor: string }>;
};

export type DynamicTestSuite = {
  id: string;
  generatedAt: string;
  generatedBy: string;
  status: "generated";
  caseCount: number;
  sourceCounts: {
    policies: number;
    scenarios: number;
    evaluations: number;
    auditFailures: number;
  };
  cases: DynamicTestCase[];
};

export type DynamicTestResult = {
  caseId: string;
  passed: boolean;
  expectedPass: boolean;
  score: number;
  violations: string[];
  missingRequiredElements: string[];
  evaluationId: string;
  reason: string;
};

export type DynamicTestRun = {
  id: string;
  suiteId: string;
  startedAt: string;
  completedAt: string;
  status: "passed" | "failed";
  total: number;
  passed: number;
  failed: number;
  results: DynamicTestResult[];
};

export type CalibrationRecommendation = {
  id: string;
  suiteId: string;
  runId: string;
  caseId: string;
  type: "policy_clarification" | "rubric_tightening" | "scenario_repair" | "governance_boundary_review";
  riskLevel: Severity;
  status: "pending_approval" | "staged" | "approved" | "rejected";
  requiresHumanApproval: boolean;
  applied: false;
  summary: string;
  evidence: Array<{ sourceType: "test_case" | "evaluation" | "suite_run"; sourceId: string; anchor: string }>;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

type RecommendationReview = {
  recommendationId: string;
  status: "approved" | "rejected";
  reviewedBy: string;
  reviewerRole: AppRole;
  reviewNote: string | null;
  reviewedAt: string;
};

function id(prefix: string, payload: unknown = crypto.randomUUID()) {
  return `${prefix}_${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function approvedPhraseFromPolicy(policy: { structuredRule: Record<string, unknown> }) {
  return Array.isArray(policy.structuredRule.approved_phrases)
    ? String(policy.structuredRule.approved_phrases[0] ?? "")
    : "";
}

function forbiddenPhraseFromPolicy(policy: { structuredRule: Record<string, unknown> }) {
  return Array.isArray(policy.structuredRule.forbidden_phrases)
    ? String(policy.structuredRule.forbidden_phrases[0] ?? "")
    : "";
}

function draftForScenario(flow: string[], approvedPhrase: string) {
  const flowText = flow.join(" ");
  const phraseText = approvedPhrase || "Based on what you shared, a scoped next step may fit.";
  return `${phraseText} ${flowText} Would you like a policy-aligned next step?`;
}

function failedRuntimeAuditCount(logs: Array<{ action: string; details: Record<string, unknown> }>) {
  return logs.filter(
    (log) =>
      log.action === "enterprise:runtime_governance_decision" &&
      (log.details.decisionStatus === "review_required" || log.details.decisionStatus === "suggested")
  ).length;
}

export async function generateDynamicTestSuite(
  repository: OperatorRepository,
  organisationId: string,
  actorId: string
): Promise<DynamicTestSuite> {
  const [policies, scenarios, evaluations, logs] = await Promise.all([
    repository.listPolicies(organisationId),
    repository.listScenarios(organisationId),
    repository.listEvaluations(organisationId),
    repository.listIngestionLogs(organisationId),
  ]);

  const cases: DynamicTestCase[] = [];
  for (const scenario of scenarios.slice(0, 20)) {
    const relatedPolicy = policies.find((policy) =>
      policy.description.toLowerCase().includes(scenario.name.toLowerCase())
    );
    const draft = draftForScenario(scenario.approvedResponseFlow, relatedPolicy ? approvedPhraseFromPolicy(relatedPolicy) : "");
    cases.push({
      id: id("dtc", { type: "scenario", scenarioId: scenario.id }),
      type: "scenario_flow",
      sourceId: scenario.id,
      scenarioId: scenario.id,
      inputMessage: scenario.triggerPhrases[0] ?? scenario.name,
      draft,
      expectation: {
        shouldPass: true,
        minScore: 80,
        requiredOutcome: "compliant",
      },
      evidence: [{ sourceType: "scenario", sourceId: scenario.id, anchor: `scenario:${scenario.id}` }],
    });
  }

  for (const policy of policies.slice(0, 20)) {
    const forbidden = forbiddenPhraseFromPolicy(policy);
    if (!forbidden) continue;
    const scenario = scenarios.find((item) => item.id === policy.structuredRule.scenario);
    cases.push({
      id: id("dtc", { type: "policy", policyId: policy.id, forbidden }),
      type: "policy_boundary",
      sourceId: policy.id,
      scenarioId: scenario?.id ?? null,
      inputMessage: String(policy.structuredRule.scenario ?? policy.name),
      draft: `We can say ${forbidden}. Would you like me to proceed?`,
      expectation: {
        shouldPass: false,
        minScore: 90,
        requiredOutcome: "blocked_or_repaired",
      },
      evidence: [{ sourceType: "policy", sourceId: policy.id, anchor: `policy:${policy.id}` }],
    });
  }

  for (const evaluation of evaluations.slice(0, 20)) {
    cases.push({
      id: id("dtc", { type: "evaluation", evaluationId: evaluation.id }),
      type: evaluation.scores.total >= 90 && !evaluation.approvalRequired ? "approved_example" : "rejected_example",
      sourceId: evaluation.id,
      scenarioId: evaluation.scenarioId,
      inputMessage: evaluation.inputMessage,
      draft: evaluation.repairedDraft ?? evaluation.originalDraft,
      expectation: {
        shouldPass: evaluation.scores.total >= 90 && !evaluation.approvalRequired,
        minScore: evaluation.scores.total >= 90 ? 85 : 90,
        requiredOutcome: evaluation.scores.total >= 90 && !evaluation.approvalRequired ? "compliant" : "blocked_or_repaired",
      },
      evidence: [{ sourceType: "evaluation", sourceId: evaluation.id, anchor: `evaluation:${evaluation.id}` }],
    });
  }

  const runtimeFailures = logs
    .filter((log) => log.action === "enterprise:runtime_governance_decision" && log.details.evaluationId)
    .filter((log) => log.details.decisionStatus === "review_required" || log.details.decisionStatus === "suggested")
    .slice(0, 10);
  for (const log of runtimeFailures) {
    const evaluation = evaluations.find((item) => item.id === log.details.evaluationId);
    if (!evaluation) continue;
    cases.push({
      id: id("dtc", { type: "audit", logId: log.id }),
      type: "audit_failure",
      sourceId: log.id,
      scenarioId: evaluation.scenarioId,
      inputMessage: evaluation.inputMessage,
      draft: evaluation.originalDraft,
      expectation: {
        shouldPass: false,
        minScore: Number(log.details.score ?? 90),
        requiredOutcome: "blocked_or_repaired",
      },
      evidence: [{ sourceType: "audit", sourceId: log.id, anchor: `audit:${log.id}` }],
    });
  }

  if (cases.length === 0) {
    throw new AppError(
      409,
      "dynamic_test_source_material_missing",
      "Upload and process at least one source with policies or scenarios before generating a dynamic test suite."
    );
  }

  return {
    id: id("dts", { organisationId, actorId, generatedAt: nowIso(), cases: cases.map((item) => item.id) }),
    generatedAt: nowIso(),
    generatedBy: actorId,
    status: "generated",
    caseCount: cases.length,
    sourceCounts: {
      policies: policies.length,
      scenarios: scenarios.length,
      evaluations: evaluations.length,
      auditFailures: failedRuntimeAuditCount(logs),
    },
    cases,
  };
}

export async function persistDynamicTestSuite(
  repository: OperatorRepository,
  organisationId: string,
  actorId: string,
  suite: DynamicTestSuite
) {
  await repository.createIngestionLog({
    organisationId,
    sourceId: null,
    action: "enterprise:dynamic_test_suite_generated",
    details: {
      actorId,
      suite,
      caseCount: suite.caseCount,
      sourceCounts: suite.sourceCounts,
    },
  });
}

export async function listDynamicTestSuites(repository: OperatorRepository, organisationId: string) {
  const logs = await repository.listIngestionLogs(organisationId);
  return logs
    .filter((log) => log.action === "enterprise:dynamic_test_suite_generated")
    .map((log) => log.details.suite as DynamicTestSuite)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function runDynamicTestSuite(
  repository: OperatorRepository,
  organisationId: string,
  actorId: string,
  suiteId: string
) {
  const suites = await listDynamicTestSuites(repository, organisationId);
  const suite = suites.find((item) => item.id === suiteId);
  if (!suite) return null;

  const startedAt = nowIso();
  const policies = await repository.listPolicies(organisationId);
  const results: DynamicTestResult[] = [];
  for (const testCase of suite.cases) {
    const guidance = await generateScenarioGuidance(repository, organisationId, testCase.inputMessage);
    const evaluation = await evaluateDraft({
      draft: testCase.draft,
      guidance,
      policies,
    });
    const expectedPass = testCase.expectation.shouldPass;
    const compliant = evaluation.scores.total >= testCase.expectation.minScore && evaluation.policyViolations.length === 0;
    const blockedOrRepaired =
      evaluation.scores.total < testCase.expectation.minScore ||
      evaluation.policyViolations.length > 0 ||
      evaluation.repairRequired ||
      evaluation.approvalRequired;
    const passed = expectedPass ? compliant : blockedOrRepaired;
    const evaluationRecord: EvaluationRecord = await repository.createEvaluation(organisationId, {
      scenarioId: guidance.scenarioId,
      inputMessage: testCase.inputMessage,
      originalDraft: testCase.draft,
      repairedDraft: null,
      detectedPhrases: evaluation.detectedPhrases,
      missingRequiredElements: evaluation.missingRequiredElements,
      policyViolations: evaluation.policyViolations,
      scores: evaluation.scores,
      approvalRequired: evaluation.approvalRequired,
      repairRequired: evaluation.repairRequired,
    });
    results.push({
      caseId: testCase.id,
      passed,
      expectedPass,
      score: evaluation.scores.total,
      violations: evaluation.policyViolations,
      missingRequiredElements: evaluation.missingRequiredElements,
      evaluationId: evaluationRecord.id,
      reason: passed
        ? "Observed outcome matched generated expectation."
        : "Observed outcome diverged from generated expectation and requires calibration review.",
    });
  }

  const failed = results.filter((result) => !result.passed).length;
  const run: DynamicTestRun = {
    id: id("dtr", { suiteId, startedAt, results }),
    suiteId,
    startedAt,
    completedAt: nowIso(),
    status: failed === 0 ? "passed" : "failed",
    total: results.length,
    passed: results.length - failed,
    failed,
    results,
  };

  await repository.createIngestionLog({
    organisationId,
    sourceId: null,
    action: "enterprise:dynamic_test_run_completed",
    details: {
      actorId,
      suiteId,
      run,
    },
  });

  const recommendations = await createCalibrationRecommendations(repository, organisationId, actorId, suite, run);
  return { suite, run, recommendations };
}

async function createCalibrationRecommendations(
  repository: OperatorRepository,
  organisationId: string,
  actorId: string,
  suite: DynamicTestSuite,
  run: DynamicTestRun
) {
  const recommendations: CalibrationRecommendation[] = [];
  const failedResults = run.results.filter((result) => !result.passed);
  for (const result of failedResults) {
    const testCase = suite.cases.find((item) => item.id === result.caseId);
    const expectedPassFailed = result.expectedPass;
    const riskLevel: Severity = expectedPassFailed ? "high" : "critical";
    const recommendation: CalibrationRecommendation = {
      id: id("cal", { runId: run.id, caseId: result.caseId }),
      suiteId: suite.id,
      runId: run.id,
      caseId: result.caseId,
      type: expectedPassFailed ? "scenario_repair" : "governance_boundary_review",
      riskLevel,
      status: "pending_approval",
      requiresHumanApproval: true,
      applied: false,
      summary: expectedPassFailed
        ? "A generated compliant scenario test failed; review the scenario flow, approved phrases, or scoring rubric."
        : "A generated boundary test passed unexpectedly; review forbidden phrases and governance thresholds before any rollout.",
      evidence: [
        { sourceType: "test_case", sourceId: result.caseId, anchor: `test_case:${result.caseId}` },
        { sourceType: "evaluation", sourceId: result.evaluationId, anchor: `evaluation:${result.evaluationId}` },
        { sourceType: "suite_run", sourceId: run.id, anchor: `dynamic_test_run:${run.id}` },
      ],
      createdAt: nowIso(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    };
    if (testCase) {
      recommendations.push(recommendation);
      await repository.createIngestionLog({
        organisationId,
        sourceId: null,
        action: "enterprise:calibration_recommendation_created",
        details: {
          actorId,
          recommendation,
        },
      });
    }
  }
  return recommendations;
}

export async function listCalibrationRecommendations(repository: OperatorRepository, organisationId: string) {
  const logs = await repository.listIngestionLogs(organisationId);
  const recommendations = new Map<string, CalibrationRecommendation>();
  const reviews: RecommendationReview[] = [];
  for (const log of logs) {
    if (log.action === "enterprise:calibration_recommendation_created") {
      const recommendation = log.details.recommendation as CalibrationRecommendation;
      recommendations.set(recommendation.id, recommendation);
    }
    if (log.action === "enterprise:calibration_recommendation_reviewed") {
      reviews.push(log.details.review as RecommendationReview);
    }
  }

  for (const review of reviews) {
    const recommendation = recommendations.get(review.recommendationId);
    if (!recommendation) continue;
    recommendations.set(review.recommendationId, {
      ...recommendation,
      status: review.status,
      reviewedBy: review.reviewedBy,
      reviewedAt: review.reviewedAt,
      reviewNote: review.reviewNote,
    });
  }

  return Array.from(recommendations.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function reviewCalibrationRecommendation(
  repository: OperatorRepository,
  organisationId: string,
  actorId: string,
  reviewerRole: AppRole,
  recommendationId: string,
  status: "approved" | "rejected",
  reviewNote: string | null
) {
  const recommendations = await listCalibrationRecommendations(repository, organisationId);
  const existing = recommendations.find((item) => item.id === recommendationId);
  if (!existing) return null;

  const review: RecommendationReview = {
    recommendationId,
    status,
    reviewedBy: actorId,
    reviewerRole,
    reviewNote,
    reviewedAt: nowIso(),
  };
  await repository.createIngestionLog({
    organisationId,
    sourceId: null,
    action: "enterprise:calibration_recommendation_reviewed",
    details: {
      actorId,
      review,
      applied: false,
    },
  });
  return {
    ...existing,
    status,
    reviewedBy: actorId,
    reviewedAt: review.reviewedAt,
    reviewNote,
  };
}
