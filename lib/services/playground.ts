import crypto from "node:crypto";

import { requestJson } from "@/lib/llm";
import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";
import type {
  EvaluationRecord,
  ExportArtifact,
  ExportRecord,
  ExtractedPolicy,
  ScenarioGuidance,
} from "@/lib/types";

function isDeterministicMode() {
  return process.env.NODE_ENV === "test" && process.env.OPERATORLAYER_PROCESSING_MODE === "deterministic";
}

function shouldUseDeterministicFallback() {
  return isDeterministicMode();
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sign(value: string) {
  const key = process.env.OPERATORLAYER_EXPORT_SIGNING_KEY;
  if (!key) {
    return hash(value);
  }
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

export async function generateScenarioGuidance(
  repository: OperatorRepository,
  organisationId: string,
  inputMessage: string
): Promise<ScenarioGuidance> {
  const scenarios = await repository.listScenarios(organisationId);
  const policies = await repository.listPolicies(organisationId);

  const matchedScenario =
    scenarios.find((scenario) =>
      scenario.triggerPhrases.some((trigger) =>
        inputMessage.toLowerCase().includes(trigger.toLowerCase())
      )
    ) ?? scenarios[0] ?? null;

  const relatedPolicies = matchedScenario
    ? policies.filter((policy) =>
        policy.description.toLowerCase().includes(matchedScenario.name.toLowerCase())
      )
    : policies.slice(0, 2);

  if (shouldUseDeterministicFallback()) {
    return {
      scenarioId: matchedScenario?.id ?? null,
      scenarioName: matchedScenario?.name ?? "general_inquiry",
      strategy:
        "Acknowledge the customer concern, map response to approved flow, avoid forbidden claims, and end with one clear next step.",
      requiredElements: matchedScenario?.approvedResponseFlow ?? [
        "acknowledge_concern",
        "reference_customer_context",
        "provide_policy_aligned_next_step",
      ],
      approvedPhrases: relatedPolicies.flatMap((policy) =>
        Array.isArray(policy.structuredRule.approved_phrases)
          ? (policy.structuredRule.approved_phrases as string[])
          : []
      ),
      forbiddenPhrases: relatedPolicies.flatMap((policy) =>
        Array.isArray(policy.structuredRule.forbidden_phrases)
          ? (policy.structuredRule.forbidden_phrases as string[])
          : []
      ),
      riskLevel: matchedScenario?.riskLevel ?? "medium",
      approvalRules: ["Escalate legal threats and pricing exceptions to human review."],
      evidence: [
        ...(matchedScenario
          ? [
              {
                sourceType: "scenario" as const,
                sourceId: matchedScenario.id,
                anchor: `scenario:${matchedScenario.id}`,
              },
            ]
          : []),
        ...relatedPolicies.slice(0, 3).flatMap((policy) =>
          (policy.sourceEvidence.length > 0 ? policy.sourceEvidence : [{ sourceId: policy.id }]).map(
            (evidence) => ({
              sourceType: "policy" as const,
              sourceId: evidence.sourceId,
              chunkIndex: evidence.chunkIndex,
              anchor:
                evidence.chunkIndex === undefined
                  ? `policy:${policy.id}`
                  : `policy:${policy.id}:chunk:${evidence.chunkIndex}`,
            })
          )
        ),
      ],
    };
  }

  const ai = await requestJson<{
    scenario_name: string;
    strategy: string;
    required_elements: string[];
    approved_phrases: string[];
    forbidden_phrases: string[];
    risk_level: string;
    approval_rules: string[];
  }>(
    "operatorlayer_scenario_guidance",
    "Generate scenario strategy from policy context.",
    [
      {
        role: "system",
        content:
          "Return guidance JSON with scenario_name, strategy, required_elements, approved_phrases, forbidden_phrases, risk_level, approval_rules.",
      },
      {
        role: "user",
        content: JSON.stringify({
          inputMessage,
          matchedScenario,
          relatedPolicies,
        }).slice(0, 18000),
      },
    ],
    { repository, organisationId }
  );

  return {
    scenarioId: matchedScenario?.id ?? null,
    scenarioName: ai.scenario_name,
    strategy: ai.strategy,
    requiredElements: ai.required_elements,
    approvedPhrases: ai.approved_phrases,
    forbiddenPhrases: ai.forbidden_phrases,
    riskLevel: ai.risk_level,
    approvalRules: ai.approval_rules,
    evidence: [
      ...(matchedScenario
        ? [
            {
              sourceType: "scenario" as const,
              sourceId: matchedScenario.id,
              anchor: `scenario:${matchedScenario.id}`,
            },
          ]
        : []),
      ...relatedPolicies.slice(0, 3).flatMap((policy) =>
        (policy.sourceEvidence.length > 0 ? policy.sourceEvidence : [{ sourceId: policy.id }]).map(
          (evidence) => ({
            sourceType: "policy" as const,
            sourceId: evidence.sourceId,
            chunkIndex: evidence.chunkIndex,
            anchor:
              evidence.chunkIndex === undefined
                ? `policy:${policy.id}`
                : `policy:${policy.id}:chunk:${evidence.chunkIndex}`,
          })
        )
      ),
    ],
  };
}

export async function generateDraft(params: {
  repository: OperatorRepository;
  organisationId: string;
  inputMessage: string;
  guidance: ScenarioGuidance;
  existingDraft?: string;
}): Promise<string> {
  if (params.existingDraft?.trim()) {
    return params.existingDraft.trim();
  }

  if (shouldUseDeterministicFallback()) {
    return `Thanks for sharing this. ${params.guidance.approvedPhrases[0] ?? "Based on what you shared..."} We can align this to your goals without stepping outside approved policy. Would you be open to a scoped next step this week?`;
  }

  const ai = await requestJson<{ draft: string }>(
    "operatorlayer_generate_draft",
    "Generate compliant draft response.",
    [
      {
        role: "system",
        content:
          "Write one concise business response draft that follows the required elements and avoids forbidden phrases.",
      },
      {
        role: "user",
        content: JSON.stringify(params).slice(0, 18000),
      },
    ],
    { repository: params.repository, organisationId: params.organisationId }
  );
  return ai.draft;
}

function scoreDraft(draft: string, guidance: ScenarioGuidance) {
  const lowerDraft = draft.toLowerCase();
  const forbiddenMatches = guidance.forbiddenPhrases.filter((phrase) =>
    lowerDraft.includes(phrase.toLowerCase())
  );
  const approvedMatches = guidance.approvedPhrases.filter((phrase) =>
    lowerDraft.includes(phrase.toLowerCase())
  );
  const requiredMissing = guidance.requiredElements.filter((element) => !lowerDraft.includes(element.toLowerCase()));

  const policyViolations = [...forbiddenMatches.map((phrase) => `Forbidden phrase detected: ${phrase}`)];
  if (requiredMissing.length > 0) {
    policyViolations.push("Missing required response elements.");
  }

  const policyCompliance = Math.max(0, 100 - forbiddenMatches.length * 30 - requiredMissing.length * 15);
  const scenarioFlow = Math.max(0, 100 - requiredMissing.length * 18);
  const approvedTerminology = Math.min(100, approvedMatches.length * 35);
  const forbiddenPhraseAvoidance = forbiddenMatches.length === 0 ? 100 : Math.max(0, 70 - forbiddenMatches.length * 20);
  const toneMatch = draft.length > 40 ? 85 : 60;
  const clarityNextStep = /\?$/.test(draft.trim()) ? 95 : 70;

  const total = Math.round(
    policyCompliance * 0.3 +
      scenarioFlow * 0.2 +
      approvedTerminology * 0.1 +
      forbiddenPhraseAvoidance * 0.2 +
      toneMatch * 0.1 +
      clarityNextStep * 0.1
  );

  const riskyKeywords = ["legal", "lawsuit", "refund", "contract", "discount"];
  const riskOverride = riskyKeywords.find((keyword) => lowerDraft.includes(keyword));
  const approvalRequired = Boolean(riskOverride);

  const statusBand =
    total >= 90
      ? "ready_to_suggest"
      : total >= 80
        ? "minor_repair_then_suggest"
        : total >= 65
          ? "repair_and_human_review"
          : total >= 40
            ? "block_and_regenerate"
            : "escalate_to_human";

  const detectedPhrases = [...approvedMatches, ...forbiddenMatches];
  return {
    detectedPhrases,
    missingRequiredElements: requiredMissing,
    policyViolations,
    scores: {
      total,
      policyCompliance,
      scenarioFlow,
      approvedTerminology,
      forbiddenPhraseAvoidance,
      toneMatch,
      clarityNextStep,
      riskOverride: riskOverride ?? undefined,
      statusBand,
    },
    approvalRequired,
    repairRequired: total < 90 || forbiddenMatches.length > 0 || requiredMissing.length > 0,
  };
}

export async function evaluateDraft(params: {
  draft: string;
  guidance: ScenarioGuidance;
  policies: ExtractedPolicy[];
}) {
  return scoreDraft(params.draft, params.guidance);
}

export async function repairDraft(params: {
  repository: OperatorRepository;
  organisationId: string;
  draft: string;
  guidance: ScenarioGuidance;
  violations: string[];
}): Promise<string> {
  if (params.violations.length === 0) {
    return params.draft;
  }

  if (shouldUseDeterministicFallback()) {
    return `${params.guidance.approvedPhrases[0] ?? "Thanks for raising this."} Based on what you shared, a scoped pilot approach may make more sense. Would you like me to outline a practical next-step plan?`;
  }

  const ai = await requestJson<{ repaired_draft: string }>(
    "operatorlayer_repair_draft",
    "Repair draft to match policy requirements and remove violations.",
    [
      {
        role: "system",
        content:
          "Rewrite draft using approved policy flow. Remove forbidden phrases. Keep concise and end with a clear next-step question.",
      },
      {
        role: "user",
        content: JSON.stringify(params).slice(0, 18000),
      },
    ],
    { repository: params.repository, organisationId: params.organisationId }
  );
  return ai.repaired_draft;
}

export async function evaluateAndRepairDraft(params: {
  repository: OperatorRepository;
  organisationId: string;
  inputMessage: string;
  channel: string;
  team: string;
  customerType: string;
  context?: string;
  draft?: string;
}) {
  const guidance = await generateScenarioGuidance(params.repository, params.organisationId, params.inputMessage);
  const policies = await params.repository.listPolicies(params.organisationId);
  const draft = await generateDraft({
    repository: params.repository,
    organisationId: params.organisationId,
    inputMessage: params.inputMessage,
    guidance,
    existingDraft: params.draft,
  });

  const firstEvaluation = await evaluateDraft({
    draft,
    guidance,
    policies,
  });

  let repairedDraft: string | null = null;
  let finalEvaluation = firstEvaluation;

  if (firstEvaluation.repairRequired) {
    repairedDraft = await repairDraft({
      repository: params.repository,
      organisationId: params.organisationId,
      draft,
      guidance,
      violations: firstEvaluation.policyViolations,
    });
    finalEvaluation = await evaluateDraft({
      draft: repairedDraft,
      guidance,
      policies,
    });
  }

  const saved = await params.repository.createEvaluation(params.organisationId, {
    scenarioId: guidance.scenarioId,
    inputMessage: params.inputMessage,
    originalDraft: draft,
    repairedDraft,
    detectedPhrases: finalEvaluation.detectedPhrases,
    missingRequiredElements: finalEvaluation.missingRequiredElements,
    policyViolations: finalEvaluation.policyViolations,
    scores: finalEvaluation.scores as EvaluationRecord["scores"],
    approvalRequired: finalEvaluation.approvalRequired,
    repairRequired: finalEvaluation.repairRequired,
  });

  return {
    guidance,
    draft,
    repairedDraft,
    evaluation: finalEvaluation,
    evaluationRecord: saved,
    meta: {
      channel: params.channel,
      team: params.team,
      customerType: params.customerType,
      context: params.context ?? null,
    },
  };
}

function toJsonLines(values: string[]) {
  return values.map((value) => JSON.stringify({ text: value })).join("\n");
}

export async function generateExportPack(
  repository: OperatorRepository,
  organisationId: string
): Promise<ExportRecord> {
  const [loadedPolicies, scenarios, loadedTerminology, evaluations, existingExports] = await Promise.all([
    repository.listPolicies(organisationId),
    repository.listScenarios(organisationId),
    repository.listTerminology(organisationId),
    repository.listEvaluations(organisationId),
    repository.listExports(organisationId),
  ]);
  const policies = loadedPolicies.filter((policy) => policy.status === "approved");
  const terminology = loadedTerminology.filter((term) => term.status === "approved");
  if (policies.length === 0) {
    throw new AppError(
      409,
      "export_review_required",
      "Approve at least one extracted policy before generating an export."
    );
  }
  const previousExport = existingExports[0] ?? null;
  const packVersion = previousExport?.manifest.version ? previousExport.manifest.version + 1 : existingExports.length + 1;
  const generatedAt = new Date().toISOString();

  const approvedExamples = evaluations
    .filter((item) => !item.repairRequired && !item.approvalRequired && item.scores.total >= 90)
    .map((item) => item.repairedDraft ?? item.originalDraft);
  const rejectedExamples = evaluations
    .filter((item) => item.repairRequired || item.approvalRequired || item.scores.total < 65)
    .map((item) => item.originalDraft);

  const policyJson = JSON.stringify(
    policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      rule_type: policy.ruleType,
      description: policy.description,
      severity: policy.severity,
      status: policy.status,
      confidence: policy.confidence,
      structured_rule: policy.structuredRule,
      source_evidence: policy.sourceEvidence,
    })),
    null,
    2
  );

  const scenarioJson = JSON.stringify(
    scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      risk_level: scenario.riskLevel,
      trigger_phrases: scenario.triggerPhrases,
      approved_response_flow: scenario.approvedResponseFlow,
      forbidden_behaviours: scenario.forbiddenBehaviours,
      evaluation_rubric: scenario.evaluationRubric,
    })),
    null,
    2
  );

  const phraseLibraryJson = JSON.stringify(
    terminology.map((term) => ({
      phrase: term.phrase,
      frequency: term.frequency,
      status: term.status,
      recommendation: term.recommendation,
      source_evidence: term.sourceEvidence,
    })),
    null,
    2
  );

  const forbiddenPhraseJson = JSON.stringify(
    policies.flatMap((policy) =>
      Array.isArray(policy.structuredRule.forbidden_phrases)
        ? (policy.structuredRule.forbidden_phrases as string[])
        : []
    ),
    null,
    2
  );

  const approvalRulesJson = JSON.stringify(
    {
      extracted_policy_rules: policies.map((policy) => ({
        policy_id: policy.id,
        conditions: Array.isArray(policy.structuredRule.human_review_conditions)
          ? (policy.structuredRule.human_review_conditions as string[])
          : [],
      })),
    },
    null,
    2
  );

  const rubricJson = JSON.stringify(
    {
      scoring: {
        policy_compliance: "30%",
        scenario_response_flow: "20%",
        approved_terminology_usage: "10%",
        forbidden_phrase_avoidance: "20%",
        tone_match: "10%",
        clarity_next_step: "10%",
      },
      score_actions: {
        "90-100": "Ready to suggest",
        "80-89": "Minor repair then suggest",
        "65-79": "Repair and human review",
        "40-64": "Block and regenerate",
        "<40": "Escalate to human",
      },
    },
    null,
    2
  );

  const voiceMarkdown = `# Company Voice\n\nGenerated from ${policies.length} policies, ${terminology.length} phrases, and ${scenarios.length} scenarios.\n`;
  const promptPackMarkdown = `# Agent Prompt Pack\n\nUse policy constraints, scenario playbooks, and phrase libraries in all drafts.\n\n## Policies\n${policies
    .map((policy) => `- ${policy.name}: ${policy.description}`)
    .join("\n")}\n`;

  const artifacts: ExportArtifact[] = [
    { name: "company_voice.md", contentType: "text/markdown", content: voiceMarkdown, checksum: hash(voiceMarkdown) },
    { name: "communication_policy.json", contentType: "application/json", content: policyJson, checksum: hash(policyJson) },
    { name: "scenario_playbooks.json", contentType: "application/json", content: scenarioJson, checksum: hash(scenarioJson) },
    { name: "phrase_library.json", contentType: "application/json", content: phraseLibraryJson, checksum: hash(phraseLibraryJson) },
    { name: "forbidden_phrases.json", contentType: "application/json", content: forbiddenPhraseJson, checksum: hash(forbiddenPhraseJson) },
    { name: "approval_rules.json", contentType: "application/json", content: approvalRulesJson, checksum: hash(approvalRulesJson) },
    { name: "evaluation_rubric.json", contentType: "application/json", content: rubricJson, checksum: hash(rubricJson) },
    { name: "approved_examples.jsonl", contentType: "application/jsonl", content: toJsonLines(approvedExamples), checksum: hash(toJsonLines(approvedExamples)) },
    { name: "rejected_examples.jsonl", contentType: "application/jsonl", content: toJsonLines(rejectedExamples), checksum: hash(toJsonLines(rejectedExamples)) },
    { name: "agent_prompt_pack.md", contentType: "text/markdown", content: promptPackMarkdown, checksum: hash(promptPackMarkdown) },
  ];

  const orderedArtifacts = [...artifacts].sort((a, b) => a.name.localeCompare(b.name));
  const policyVersionManifest = {
    generated_at: generatedAt,
    pack_version: packVersion,
    previous_export_id: previousExport?.id ?? null,
    previous_manifest_checksum: previousExport?.manifest.checksum ?? null,
    artifact_manifest: orderedArtifacts.map((artifact) => ({
      name: artifact.name,
      content_type: artifact.contentType,
      checksum: artifact.checksum,
    })),
    rollback: {
      previous_export_id: previousExport?.id ?? null,
      previous_checksum: previousExport?.manifest.checksum ?? null,
    },
  };
  const policyVersionManifestJson = JSON.stringify(policyVersionManifest, null, 2);
  orderedArtifacts.push({
    name: "policy_version_manifest.json",
    contentType: "application/json",
    content: policyVersionManifestJson,
    checksum: hash(policyVersionManifestJson),
  });
  orderedArtifacts.sort((a, b) => a.name.localeCompare(b.name));
  const manifestString = JSON.stringify(
    orderedArtifacts.map((artifact) => ({ name: artifact.name, checksum: artifact.checksum }))
  );
  const manifestChecksum = hash(manifestString);
  const manifestSignature = sign(manifestChecksum);

  return repository.createExport(organisationId, "full_pack", orderedArtifacts, {
    version: packVersion,
    previousExportId: previousExport?.id ?? null,
    artifactCount: orderedArtifacts.length,
    artifactNames: orderedArtifacts.map((artifact) => artifact.name),
    checksum: manifestChecksum,
    signature: manifestSignature,
    signedAt: generatedAt,
    rollbackPointer: {
      previousExportId: previousExport?.id ?? null,
      previousChecksum: previousExport?.manifest.checksum ?? null,
    },
  });
}
