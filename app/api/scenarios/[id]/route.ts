import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { ExtractedPolicy } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function pickPolicyScenarioMatch(policies: ExtractedPolicy[], scenarioName: string, scenarioId: string) {
  return policies.filter((policy) => {
    const structuredScenario =
      typeof policy.structuredRule.scenario === "string" ? policy.structuredRule.scenario : "";
    return (
      structuredScenario.toLowerCase() === scenarioName.toLowerCase() ||
      policy.description.toLowerCase().includes(scenarioName.toLowerCase()) ||
      policy.sourceEvidence.some((evidence) => evidence.sourceId === scenarioId)
    );
  });
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    const { id } = await params;
    const repository = getRepository();

    const scenario = await repository.getScenarioById(context.organisationId, id);
    if (!scenario) {
      throw new AppError(404, "scenario_not_found", "Scenario not found.");
    }

    const [policies, terminology, evaluations] = await Promise.all([
      repository.listPolicies(context.organisationId),
      repository.listTerminology(context.organisationId),
      repository.listEvaluations(context.organisationId),
    ]);

    const scenarioPolicies = pickPolicyScenarioMatch(policies, scenario.name, scenario.id);
    const scenarioTerminology = terminology.filter((item) => item.scenarioId === scenario.id);

    const approvedPhrases = [
      ...new Set([
        ...scenarioPolicies.flatMap((policy) =>
          Array.isArray(policy.structuredRule.approved_phrases)
            ? (policy.structuredRule.approved_phrases as string[])
            : []
        ),
        ...scenarioTerminology
          .filter((item) => item.status === "approved")
          .map((item) => item.phrase),
      ]),
    ];

    const forbiddenPhrases = [
      ...new Set([
        ...scenario.forbiddenBehaviours,
        ...scenarioPolicies.flatMap((policy) =>
          Array.isArray(policy.structuredRule.forbidden_phrases)
            ? (policy.structuredRule.forbidden_phrases as string[])
            : []
        ),
        ...scenarioTerminology
          .filter((item) => item.status === "blocked")
          .map((item) => item.phrase),
      ]),
    ];

    const approvalRules = [
      ...new Set(
        scenarioPolicies.flatMap((policy) =>
          Array.isArray(policy.structuredRule.human_review_conditions)
            ? (policy.structuredRule.human_review_conditions as string[])
            : []
        )
      ),
    ];

    const relatedEvaluations = evaluations.filter((item) => item.scenarioId === scenario.id);
    const examples = relatedEvaluations
      .filter((item) => item.scores.total >= 85 && !item.approvalRequired)
      .slice(0, 8)
      .map((item) => item.repairedDraft ?? item.originalDraft);

    const badExamples = relatedEvaluations
      .filter((item) => item.scores.total < 65 || item.approvalRequired)
      .slice(0, 8)
      .map((item) => item.originalDraft);

    return jsonOk({
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      description: scenario.description,
      riskLevel: scenario.riskLevel,
      tabs: {
        overview: scenario.description,
        triggerPhrases: scenario.triggerPhrases,
        responseFlow: scenario.approvedResponseFlow,
        approvedPhrases,
        forbiddenPhrases,
        examples,
        badExamples,
        approvalRules,
        evaluationRubric: scenario.evaluationRubric,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
