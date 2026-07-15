import crypto from "node:crypto";

import type { OperatorRepository } from "@/lib/repository/interface";
import {
  evaluateDraft,
  generateScenarioGuidance,
  repairDraft,
} from "@/lib/services/playground";

export type RuntimeGovernanceMode =
  | "suggest_only"
  | "human_approval_required"
  | "conditional_approval"
  | "final_authority"
  | "notify_only";

type RuntimeGovernanceInput = {
  organisationId: string;
  agentId: string;
  channel: string;
  useCase: string;
  customerSegment: string;
  governanceMode: RuntimeGovernanceMode;
  inputMessage: string;
  draft: string;
  workspaceId?: string;
  policyPackId?: string;
  scoreThreshold: number;
  riskLevel?: string;
  notificationDestinations: string[];
  actorId: string;
  credentialId: string;
};

function hashText(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeRisk(value: string) {
  return value.trim().toLowerCase();
}

function isLowRisk(value: string) {
  return normalizeRisk(value) === "low";
}

function chooseNotificationIntent(input: {
  approvalRequired: boolean;
  blocked: boolean;
  notifyOnly: boolean;
  scoreBelowThreshold: boolean;
  hasViolations: boolean;
  destinations: string[];
}) {
  if (input.blocked) {
    return {
      state: "required" as const,
      reason: "runtime_blocked",
      destinations: input.destinations,
    };
  }
  if (input.approvalRequired) {
    return {
      state: "required" as const,
      reason: "human_approval_required",
      destinations: input.destinations,
    };
  }
  if (input.notifyOnly && (input.scoreBelowThreshold || input.hasViolations)) {
    return {
      state: "required" as const,
      reason: "notify_only_policy_signal",
      destinations: input.destinations,
    };
  }
  return {
    state: "not_required" as const,
    reason: "no_notification_condition_matched",
    destinations: input.destinations,
  };
}

export async function runRuntimeGovernanceDecision(
  repository: OperatorRepository,
  input: RuntimeGovernanceInput
) {
  const [exports, policies] = await Promise.all([
    repository.listExports(input.organisationId),
    repository.listPolicies(input.organisationId),
  ]);
  const policyPack =
    (input.policyPackId
      ? exports.find((item) => item.id === input.policyPackId)
      : [...exports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]) ?? null;

  const guidance = await generateScenarioGuidance(
    repository,
    input.organisationId,
    input.inputMessage
  );
  const firstEvaluation = await evaluateDraft({
    draft: input.draft,
    guidance,
    policies,
  });

  const repairedDraft = firstEvaluation.repairRequired
    ? await repairDraft({
        repository,
        organisationId: input.organisationId,
        draft: input.draft,
        guidance,
        violations: firstEvaluation.policyViolations,
      })
    : null;
  const finalEvaluation = repairedDraft
    ? await evaluateDraft({
        draft: repairedDraft,
        guidance,
        policies,
      })
    : firstEvaluation;

  const effectiveRiskLevel = input.riskLevel ?? guidance.riskLevel;
  const hasViolations = finalEvaluation.policyViolations.length > 0;
  const scoreBelowThreshold = finalEvaluation.scores.total < input.scoreThreshold;
  const needsHumanReview =
    finalEvaluation.approvalRequired || hasViolations || scoreBelowThreshold || !isLowRisk(effectiveRiskLevel);

  const base = {
    mode: input.governanceMode,
    scoreThreshold: input.scoreThreshold,
    effectiveRiskLevel,
    score: finalEvaluation.scores.total,
  };

  const decision =
    input.governanceMode === "suggest_only"
      ? {
          ...base,
          status: "suggested" as const,
          allowResponse: false,
          humanApprovalRequired: true,
          finalResponseState: "human_sends_final_response" as const,
          reason: "Suggest-only mode never authorizes the agent to send.",
        }
      : input.governanceMode === "human_approval_required"
        ? {
            ...base,
            status: "review_required" as const,
            allowResponse: false,
            humanApprovalRequired: true,
            finalResponseState: "pending_human_approval" as const,
            reason: "Human approval is required by governance mode.",
          }
        : input.governanceMode === "notify_only"
          ? {
              ...base,
              status: "allowed_with_monitoring" as const,
              allowResponse: true,
              humanApprovalRequired: false,
              finalResponseState: "agent_may_respond_monitored" as const,
              reason: "Notify-only mode records and monitors without blocking the agent.",
            }
          : input.governanceMode === "conditional_approval" && !needsHumanReview && !firstEvaluation.repairRequired
            ? {
                ...base,
                status: "approved" as const,
                allowResponse: true,
                humanApprovalRequired: false,
                finalResponseState: "agent_may_respond" as const,
                reason: "Conditional approval criteria passed without repair or review triggers.",
              }
            : input.governanceMode === "final_authority" && !hasViolations && !scoreBelowThreshold
              ? {
                  ...base,
                  status: "approved" as const,
                  allowResponse: true,
                  humanApprovalRequired: false,
                  finalResponseState: repairedDraft ? "repaired_response_approved" as const : "agent_may_respond" as const,
                  reason: "Final-authority mode approved the evaluated response within configured threshold.",
                }
              : {
                  ...base,
                  status: "review_required" as const,
                  allowResponse: false,
                  humanApprovalRequired: true,
                  finalResponseState: "pending_human_approval" as const,
                  reason:
                    input.governanceMode === "conditional_approval"
                      ? "Conditional approval criteria did not pass."
                      : "Final-authority mode blocked the response because runtime criteria did not pass.",
                };

  const notificationIntent = chooseNotificationIntent({
    approvalRequired: decision.humanApprovalRequired,
    blocked: !decision.allowResponse && input.governanceMode === "final_authority",
    notifyOnly: input.governanceMode === "notify_only",
    scoreBelowThreshold,
    hasViolations,
    destinations: input.notificationDestinations,
  });

  const evaluationRecord = await repository.createEvaluation(input.organisationId, {
    scenarioId: guidance.scenarioId,
    inputMessage: input.inputMessage,
    originalDraft: input.draft,
    repairedDraft,
    detectedPhrases: finalEvaluation.detectedPhrases,
    missingRequiredElements: finalEvaluation.missingRequiredElements,
    policyViolations: finalEvaluation.policyViolations,
    scores: finalEvaluation.scores,
    approvalRequired: decision.humanApprovalRequired,
    repairRequired: Boolean(repairedDraft),
  });

  const audit = await repository.createIngestionLog({
    organisationId: input.organisationId,
    sourceId: null,
    action: "enterprise:runtime_governance_decision",
    details: {
      actorId: input.actorId,
      credentialId: input.credentialId,
      agentId: input.agentId,
      channel: input.channel,
      useCase: input.useCase,
      customerSegment: input.customerSegment,
      workspaceId: input.workspaceId ?? null,
      governanceMode: input.governanceMode,
      decisionStatus: decision.status,
      allowResponse: decision.allowResponse,
      humanApprovalRequired: decision.humanApprovalRequired,
      score: finalEvaluation.scores.total,
      riskLevel: effectiveRiskLevel,
      policyPackId: policyPack?.id ?? null,
      policyPackChecksum: policyPack?.manifest.checksum ?? null,
      evaluationId: evaluationRecord.id,
      notificationIntent,
      inputMessageHash: hashText(input.inputMessage),
      draftHash: hashText(input.draft),
      repairedDraftHash: repairedDraft ? hashText(repairedDraft) : null,
      sourceEvidence: guidance.evidence,
      sendState: "not_sent",
    },
  });

  return {
    decisionId: audit.id,
    agent: {
      id: input.agentId,
      channel: input.channel,
      useCase: input.useCase,
      customerSegment: input.customerSegment,
      workspaceId: input.workspaceId ?? null,
    },
    policyPack: policyPack
      ? {
          id: policyPack.id,
          checksum: policyPack.manifest.checksum,
          signature: policyPack.manifest.signature,
          signedAt: policyPack.manifest.signedAt,
        }
      : null,
    guidance,
    evaluation: finalEvaluation,
    evaluationRecord,
    repairedDraft,
    decision,
    notificationIntent,
    audit: {
      eventId: audit.id,
      action: audit.action,
      sendState: "not_sent" as const,
      autoSendAttempted: false,
    },
  };
}
