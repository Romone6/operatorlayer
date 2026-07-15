import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";
import type { ApprovalDecision, ApprovalRule, SendDecision } from "@/lib/types";
import { getMissingEnterpriseEnv } from "@/lib/enterprise/config";
import {
  resolveFeatureFlags,
  resolveApprovalRules,
  resolveAutoSendKillSwitchState,
  resolveBillingEntitlement,
} from "@/lib/enterprise/store";

type SendDecisionInput = {
  organisationId: string;
  score: number;
  riskLevel: string;
  scenarioId?: string;
  workspaceId?: string;
  channel: string;
  customerType: string;
};

function blockedDecision(
  reason: string,
  matchedRuleId: string | null,
  runtimeUnavailable: Extract<SendDecision, { allowed: false }>["runtimeUnavailable"] = null
): SendDecision {
  const approvalDecision: ApprovalDecision = {
    status: "review_required",
    reason,
    matchedRuleId,
    approvalRequired: true,
  };
  return {
    allowed: false,
    state: "blocked",
    reason,
    matchedRuleId,
    approvalRequired: true,
    approvalDecision,
    runtimeUnavailable,
  };
}

function isLowRisk(riskLevel: string) {
  const normalized = riskLevel.trim().toLowerCase();
  return normalized === "low";
}

function ruleMatches(input: SendDecisionInput, rule: ApprovalRule) {
  if (!rule.enabled) return false;
  if (input.score < rule.minScore) return false;
  if (!rule.riskLevels.map((item) => item.toLowerCase()).includes(input.riskLevel.toLowerCase())) return false;
  if (rule.channelAllowlist.length > 0 && !rule.channelAllowlist.includes(input.channel)) return false;
  if (rule.customerTypeAllowlist.length > 0 && !rule.customerTypeAllowlist.includes(input.customerType)) return false;
  return true;
}

export async function decideAutoSend(
  repository: OperatorRepository,
  input: SendDecisionInput
): Promise<SendDecision> {
  const killSwitch = await resolveAutoSendKillSwitchState(repository, input.organisationId);
  if (killSwitch.global.active) {
    return blockedDecision(`Global auto-send kill switch active: ${killSwitch.global.reason}`, null);
  }
  if (input.workspaceId) {
    const scoped = killSwitch.workspaces.find((item) => item.workspaceId === input.workspaceId);
    if (scoped?.active) {
      return blockedDecision(
        `Workspace auto-send kill switch active for ${input.workspaceId}: ${scoped.reason}`,
        null
      );
    }
  }

  const featureFlags = await resolveFeatureFlags(repository, input.organisationId);
  const autoSendFlag = featureFlags.find((item) => item.key === "auto_send");
  if (!autoSendFlag || !autoSendFlag.enabled) {
    return blockedDecision("Auto-send unavailable because auto_send is not fully enabled.", null, {
      capabilityId: "auto_send",
      reason: "feature_flag_disabled",
    });
  }
  if (autoSendFlag.rolloutPercent < 100) {
    return blockedDecision("Auto-send unavailable because auto_send is not fully enabled.", null, {
      capabilityId: "auto_send",
      reason: "feature_flag_partial_rollout",
    });
  }

  if (!isLowRisk(input.riskLevel)) {
    return blockedDecision(`Risk level ${input.riskLevel} is outside low-risk auto-send policy.`, null);
  }

  const entitlement = await resolveBillingEntitlement(repository, input.organisationId);
  if (entitlement.status !== "active") {
    return blockedDecision("Auto-send unavailable because billing entitlement is not active.", null, {
      capabilityId: "auto_send",
      reason: "billing_not_active",
    });
  }
  if (!entitlement.autoSendEnabled) {
    return blockedDecision("Auto-send unavailable because billing entitlement has autoSend disabled.", null, {
      capabilityId: "auto_send",
      reason: "entitlement_disabled",
    });
  }

  const missingEnterpriseEnv = getMissingEnterpriseEnv();
  if (missingEnterpriseEnv.length > 0) {
    return blockedDecision(
      `Auto-send unavailable because enterprise env is missing: ${missingEnterpriseEnv.join(", ")}.`,
      null,
      {
        capabilityId: "auto_send",
        reason: "enterprise_env_missing",
      }
    );
  }

  const rules = await resolveApprovalRules(repository, input.organisationId);
  const matched = rules.find((rule) => ruleMatches(input, rule));
  if (!matched) {
    return blockedDecision("No enabled approval rule matched this draft.", null);
  }

  if (matched.requiresHumanApproval) {
    return blockedDecision("Matched rule still requires human approval.", matched.id);
  }

  if (input.score < 90) {
    return blockedDecision("Auto-send requires score >= 90 for low-risk policy.", matched.id);
  }

  const approvalDecision: ApprovalDecision = {
    status: "approved",
    reason: "Allowed by low-risk auto-send policy and matched approval rule.",
    matchedRuleId: matched.id,
    approvalRequired: false,
  };
  return {
    allowed: true,
    state: "allowed",
    reason: approvalDecision.reason,
    matchedRuleId: matched.id,
    approvalRequired: false,
    approvalDecision,
    runtimeUnavailable: null,
  };
}

export async function assertCanAutoSend(
  repository: OperatorRepository,
  input: SendDecisionInput
) {
  const decision = await decideAutoSend(repository, input);
  if (!decision.allowed) {
    throw new AppError(403, "auto_send_blocked", decision.reason, {
      matchedRuleId: decision.matchedRuleId,
      approvalRequired: decision.approvalRequired,
    });
  }
  return decision;
}
