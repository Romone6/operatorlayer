import type { GovernancePolicy } from "@/lib/types";

type GovernanceSimulationWarningCode =
  | "retention_reduction_requires_review"
  | "deletion_without_approval_risk"
  | "open_invites_without_domain_allowlist"
  | "long_sessions_without_mfa"
  | "break_glass_disabled_with_queue_failures"
  | "legal_hold_release_unblocks_pending_deletions";

type GovernanceSimulationBlockedActionCode = "deletion_requests_blocked_by_legal_hold";

export type GovernanceSimulationWarning = {
  code: GovernanceSimulationWarningCode;
  severity: "medium" | "high";
  message: string;
};

export type GovernanceSimulationBlockedAction = {
  code: GovernanceSimulationBlockedActionCode;
  reason: string;
};

export type GovernancePolicySimulationResult = {
  status: "safe" | "review_required" | "blocked";
  currentPolicy: GovernancePolicy;
  proposedPolicy: GovernancePolicy;
  impact: {
    retentionDeltaDays: number;
    sourceCount: number;
    pendingDeletionRequests: number;
    queueFailures: number;
    queueDeadLetter: number;
  };
  warnings: GovernanceSimulationWarning[];
  blockedActions: GovernanceSimulationBlockedAction[];
};

export function simulateGovernancePolicy(input: {
  currentPolicy: GovernancePolicy;
  proposedPolicy: GovernancePolicy;
  sourceCount: number;
  pendingDeletionRequests: number;
  queueFailures: number;
  queueDeadLetter: number;
  ssoDomainAllowlistCount: number;
}): GovernancePolicySimulationResult {
  const warnings: GovernanceSimulationWarning[] = [];
  const blockedActions: GovernanceSimulationBlockedAction[] = [];

  const retentionDeltaDays = input.proposedPolicy.retentionDays - input.currentPolicy.retentionDays;

  if (retentionDeltaDays < 0 && input.sourceCount > 0) {
    warnings.push({
      code: "retention_reduction_requires_review",
      severity: "high",
      message: `Retention is reduced by ${Math.abs(retentionDeltaDays)} days while ${input.sourceCount} source records exist.`,
    });
  }

  if (!input.proposedPolicy.deletionRequiresApproval) {
    warnings.push({
      code: "deletion_without_approval_risk",
      severity: "high",
      message: "Deletion approval requirement is disabled; destructive requests can auto-complete.",
    });
  }

  if (input.proposedPolicy.invitePolicy === "open" && input.ssoDomainAllowlistCount === 0) {
    warnings.push({
      code: "open_invites_without_domain_allowlist",
      severity: "medium",
      message: "Open invite policy is enabled without a domain allowlist.",
    });
  }

  if (input.proposedPolicy.sessionDurationMinutes > 720 && !input.proposedPolicy.enforcedMfa) {
    warnings.push({
      code: "long_sessions_without_mfa",
      severity: "high",
      message: "Long session duration is configured without enforced MFA.",
    });
  }

  if (
    !input.proposedPolicy.breakGlassAdminEnabled &&
    (input.queueFailures > 0 || input.queueDeadLetter > 0)
  ) {
    warnings.push({
      code: "break_glass_disabled_with_queue_failures",
      severity: "medium",
      message: "Break-glass admin is disabled while failed/dead-letter jobs are present.",
    });
  }

  if (
    input.currentPolicy.legalHoldEnabled &&
    !input.proposedPolicy.legalHoldEnabled &&
    input.pendingDeletionRequests > 0
  ) {
    warnings.push({
      code: "legal_hold_release_unblocks_pending_deletions",
      severity: "medium",
      message: "Disabling legal hold will unblock pending deletion requests.",
    });
  }

  if (input.proposedPolicy.legalHoldEnabled && input.pendingDeletionRequests > 0) {
    blockedActions.push({
      code: "deletion_requests_blocked_by_legal_hold",
      reason: "Deletion requests cannot proceed while legal hold is enabled.",
    });
  }

  const status =
    blockedActions.length > 0 ? "blocked" : warnings.length > 0 ? "review_required" : "safe";

  return {
    status,
    currentPolicy: input.currentPolicy,
    proposedPolicy: input.proposedPolicy,
    impact: {
      retentionDeltaDays,
      sourceCount: input.sourceCount,
      pendingDeletionRequests: input.pendingDeletionRequests,
      queueFailures: input.queueFailures,
      queueDeadLetter: input.queueDeadLetter,
    },
    warnings,
    blockedActions,
  };
}
