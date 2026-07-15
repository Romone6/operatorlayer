import { detectPolicyConflicts, extractPolicyFromManual, extractScenariosFromExamples, extractTerminologyPatterns } from "@/lib/intelligence";
import { log } from "@/lib/logger";
import { chunkText, extractFrequentPhrases } from "@/lib/text";
import type { OperatorRepository } from "@/lib/repository/interface";
import type { Conflict, ExtractedPolicy, Scenario, Source, SourceChunk, TerminologyPattern } from "@/lib/types";

function now() {
  return new Date().toISOString();
}

function buildChunks(source: Source): SourceChunk[] {
  const chunkList = chunkText(source.rawText ?? "");
  return chunkList.map((chunkTextValue, index) => ({
    id: crypto.randomUUID(),
    organisationId: source.organisationId,
    sourceId: source.id,
    chunkIndex: index,
    chunkText: chunkTextValue,
    chunkType: "text",
    metadata: {},
    createdAt: now(),
  }));
}

export async function processSourceExtraction(repository: OperatorRepository, source: Source): Promise<void> {
  await repository.updateSourceStatus({
    sourceId: source.id,
    organisationId: source.organisationId,
    status: "extracting",
    metadata: { startedAt: now() },
  });

  const chunks = buildChunks(source);
  await repository.replaceSourceChunks(source.organisationId, source.id, chunks);

  const phraseCandidates = extractFrequentPhrases(chunks.map((chunk) => chunk.chunkText), 50);
  const intelligenceContext = { repository, organisationId: source.organisationId };
  const manualRules = await extractPolicyFromManual(source.rawText ?? "", intelligenceContext);
  const scenarios = await extractScenariosFromExamples(source.rawText ?? "", intelligenceContext);
  const terminologyClassification = await extractTerminologyPatterns(chunks, intelligenceContext);
  const conflicts = await detectPolicyConflicts(manualRules, phraseCandidates, intelligenceContext);

  const policies: ExtractedPolicy[] = manualRules.map((rule) => ({
    id: crypto.randomUUID(),
    organisationId: source.organisationId,
    name: `${rule.scenario}: ${rule.rule_type}`,
    ruleType: rule.rule_type,
    description: rule.rule,
    severity: rule.severity,
    status: rule.status,
    structuredRule: {
      ...rule,
      required_sequence: rule.required_sequence,
      approved_phrases: rule.approved_phrases,
      forbidden_phrases: rule.forbidden_phrases,
    },
    sourceEvidence: [{ sourceId: source.id }],
    confidence: rule.confidence,
    createdAt: now(),
    updatedAt: now(),
    reviewedBy: null,
    reviewedAt: null,
  }));

  const termByPhrase = new Map(terminologyClassification.map((item) => [item.phrase.toLowerCase(), item]));
  const terminologyPatterns: TerminologyPattern[] = phraseCandidates.map((phrase) => {
    const modelLabel = termByPhrase.get(phrase.phrase.toLowerCase());
    return {
      id: crypto.randomUUID(),
      organisationId: source.organisationId,
      phrase: phrase.phrase,
      normalisedPhrase: phrase.phrase.toLowerCase(),
      frequency: phrase.frequency,
      scenarioId: null,
      status: (modelLabel?.status ?? "suggested") as TerminologyPattern["status"],
      recommendation: modelLabel?.recommendation ?? "Review for usage policy alignment.",
      sourceEvidence: [{ sourceId: source.id }],
      outcomeSignal: { scenario: modelLabel?.scenario ?? null },
      createdAt: now(),
      updatedAt: now(),
      reviewedBy: null,
      reviewedAt: null,
    };
  });

  const extractedScenarios: Scenario[] = scenarios.map((scenario) => ({
    id: crypto.randomUUID(),
    organisationId: source.organisationId,
    name: scenario.name,
    category: scenario.category,
    description: scenario.description,
    riskLevel: scenario.risk_level,
    triggerPhrases: scenario.trigger_phrases,
    approvedResponseFlow: scenario.response_flow,
    forbiddenBehaviours: scenario.forbidden_terminology,
    evaluationRubric: scenario.evaluation_rubric,
    createdAt: now(),
  }));

  const extractedConflicts: Conflict[] = conflicts.map((conflict) => ({
    id: crypto.randomUUID(),
    organisationId: source.organisationId,
    conflictType: conflict.conflict_type,
    severity: conflict.severity,
    manualRule: conflict.manual_rule,
    historicalPattern: conflict.historical_pattern,
    recommendedResolution: conflict.recommended_resolution,
    status: "needs_review",
    evidence: conflict.evidence.map((item) => ({ sourceId: item.source_id, details: item.details })),
    createdAt: now(),
    updatedAt: now(),
    reviewedBy: null,
    reviewedAt: null,
  }));

  await repository.replaceExtractedData({
    source,
    chunks,
    policies,
    terminologyPatterns,
    scenarios: extractedScenarios,
    conflicts: extractedConflicts,
  });

  await repository.updateSourceStatus({
    sourceId: source.id,
    organisationId: source.organisationId,
    status: "extracted",
    metadata: {
      completedAt: now(),
      chunks: chunks.length,
      policies: policies.length,
      phrases: terminologyPatterns.length,
      scenarios: extractedScenarios.length,
      conflicts: extractedConflicts.length,
    },
  });

  log("info", "source_processed", {
    sourceId: source.id,
    organisationId: source.organisationId,
    policies: policies.length,
    phrases: terminologyPatterns.length,
    scenarios: extractedScenarios.length,
    conflicts: extractedConflicts.length,
  });
}
