import { requestJson } from "@/lib/llm";
import type { OperatorRepository } from "@/lib/repository/interface";
import type { SourceChunk } from "@/lib/types";
import {
  conflictSchema,
  scenarioSchema,
  structuredPolicySchema,
  type StructuredConflict,
  type StructuredPolicy,
  type StructuredScenario,
} from "@/lib/validation";

function deterministicMode() {
  return process.env.NODE_ENV === "test" && process.env.OPERATORLAYER_PROCESSING_MODE === "deterministic";
}

type IntelligenceContext = {
  repository?: OperatorRepository;
  organisationId?: string;
};

async function shouldUseDeterministicFallback(context?: IntelligenceContext) {
  void context;
  return deterministicMode();
}

export async function extractPolicyFromManual(rawText: string, context?: IntelligenceContext): Promise<StructuredPolicy[]> {
  if (await shouldUseDeterministicFallback(context)) {
    const text = rawText.toLowerCase();
    const pricing = text.includes("price") || text.includes("discount");
    return [
      structuredPolicySchema.parse({
        rule_id: pricing ? "sales_pricing_objection_001" : "communication_policy_001",
        rule_type: "scenario_response_flow",
        scenario: pricing ? "pricing_objection" : "general_inquiry",
        severity: "medium",
        status: "suggested",
        rule: pricing
          ? "When a prospect raises price concerns, acknowledge budget pressure, connect to customer pain, avoid discount promises, offer a scoped pilot, and ask for a clear next step."
          : "When responding to customers, acknowledge their request, restate context, provide policy-aligned next actions, and finish with a clear next-step question.",
        required_sequence: pricing
          ? ["acknowledge_budget_concern", "reference_customer_pain_point", "reframe_around_value", "offer_scoped_pilot", "ask_clear_next_step_question"]
          : ["acknowledge_request", "restate_context", "give_policy_aligned_next_action", "ask_next_step_question"],
        approved_phrases: pricing
          ? ["Completely understand the concern on price.", "Based on what you shared...", "A scoped pilot may make more sense."]
          : ["Thanks for outlining the context.", "Based on your goals...", "Would this next step work for you?"],
        forbidden_phrases: ["We can definitely discount that.", "This will guarantee ROI.", "No risk at all."],
        human_review_conditions: ["legal threats", "contract changes", "refunds above threshold"],
        confidence: 0.81,
      }),
    ];
  }

  const payload = await requestJson<{ rules: StructuredPolicy[] }>(
    "operatorlayer_policy_extraction",
    "Extract communication rules with approved and forbidden phrases.",
    [
      {
        role: "system",
        content:
          "You extract specific policy rules from communication manuals. Never output vague guidance. Return JSON { rules: StructuredPolicy[] }.",
      },
      {
        role: "user",
        content: rawText.slice(0, 16000),
      },
    ],
    context
  );

  return (payload.rules ?? []).map((rule) => structuredPolicySchema.parse(rule));
}

export async function extractScenariosFromExamples(examples: string, context?: IntelligenceContext): Promise<StructuredScenario[]> {
  if (await shouldUseDeterministicFallback(context)) {
    const scenarios: StructuredScenario[] = [
      {
        name: "Pricing objection",
        category: "sales",
        description: "Handle pricing concerns with value framing and no unauthorized discounting.",
        risk_level: "medium",
        trigger_phrases: ["price is too high", "too expensive", "discount"],
        response_flow: ["acknowledge_budget_concern", "reference_customer_pain_point", "reframe_around_value", "offer_scoped_pilot", "ask_clear_next_step_question"],
        approved_terminology: ["scoped pilot", "based on what you shared"],
        forbidden_terminology: ["guarantee", "definitely discount"],
        examples: ["Completely understand the concern on price. Based on what you shared, a scoped pilot may be a better first step."],
        bad_examples: ["No risk at all. We can definitely discount this immediately."],
        approval_rules: ["Escalate pricing exceptions to manager approval."],
        evaluation_rubric: { compliance: 30, flow: 25, terminology: 20, tone: 15, clarity: 10 },
      },
    ];
    return scenarios.map((scenario) => scenarioSchema.parse(scenario));
  }

  const payload = await requestJson<{ scenarios: StructuredScenario[] }>(
    "operatorlayer_scenario_extraction",
    "Extract scenario playbooks with trigger phrases and response flow.",
    [
      {
        role: "system",
        content:
          "You extract scenario playbooks from examples and manuals. Return JSON { scenarios: StructuredScenario[] }.",
      },
      {
        role: "user",
        content: examples.slice(0, 16000),
      },
    ],
    context
  );

  return (payload.scenarios ?? []).map((scenario) => scenarioSchema.parse(scenario));
}

export async function detectPolicyConflicts(
  manualRules: StructuredPolicy[],
  historicalPatterns: Array<{ phrase: string; frequency: number }>,
  context?: IntelligenceContext
): Promise<StructuredConflict[]> {
  if (await shouldUseDeterministicFallback(context)) {
    const risky = historicalPatterns.find((item) => item.phrase.includes("definitely discount"));
    if (!risky) {
      return [];
    }
    return [
      conflictSchema.parse({
        conflict_type: "discount_without_approval",
        severity: "high",
        manual_rule: manualRules[0]?.rule ?? "No unauthorized discounting.",
        historical_pattern: `Phrase "${risky.phrase}" appears ${risky.frequency} times.`,
        recommended_resolution: "Enforce manager approval before discount language and retrain examples.",
        evidence: [{ source_id: "historical", details: risky.phrase }],
      }),
    ];
  }

  const payload = await requestJson<{ conflicts: StructuredConflict[] }>(
    "operatorlayer_conflict_detection",
    "Detect conflicts between manual rules and historical communication patterns.",
    [
      {
        role: "system",
        content:
          "You detect policy conflicts. Return JSON { conflicts: StructuredConflict[] }. Only emit conflicts with actionable evidence.",
      },
      {
        role: "user",
        content: JSON.stringify({ manualRules, historicalPatterns }).slice(0, 16000),
      },
    ],
    context
  );

  return (payload.conflicts ?? []).map((conflict) => conflictSchema.parse(conflict));
}

export async function extractTerminologyPatterns(chunks: SourceChunk[], context?: IntelligenceContext) {
  if (await shouldUseDeterministicFallback(context)) {
    const topText = chunks.map((chunk) => chunk.chunkText.toLowerCase()).join(" ");
    return [
      {
        phrase: "based on what you shared",
        recommendation: "Keep as approved value-framing language.",
        status: "approved" as const,
        scenario: topText.includes("price") ? "pricing_objection" : "general_inquiry",
      },
    ];
  }

  const text = chunks.map((chunk) => chunk.chunkText).join("\n\n");
  const payload = await requestJson<{
    terminology: Array<{
      phrase: string;
      recommendation: string;
      status: "approved" | "weak" | "blocked" | "needs_review" | "suggested";
      scenario: string | null;
    }>;
  }>(
    "operatorlayer_terminology_classification",
    "Classify repeated communication phrases by safety and quality.",
    [
      {
        role: "system",
        content:
          "You classify phrase quality. Return JSON with terminology[] including phrase, recommendation, status, scenario.",
      },
      {
        role: "user",
        content: text.slice(0, 16000),
      },
    ],
    context
  );

  return payload.terminology ?? [];
}
