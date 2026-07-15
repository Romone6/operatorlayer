import { describe, expect, it } from "vitest";

import { simulateGovernancePolicy } from "@/lib/enterprise/governance-simulation";
import type { GovernancePolicy } from "@/lib/types";

function policy(patch: Partial<GovernancePolicy> = {}): GovernancePolicy {
  return {
    retentionDays: 365,
    legalHoldEnabled: false,
    deletionRequiresApproval: true,
    invitePolicy: "open",
    sessionDurationMinutes: 480,
    enforcedMfa: false,
    breakGlassAdminEnabled: true,
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...patch,
  };
}

describe("simulateGovernancePolicy", () => {
  it("returns safe status when no warnings or blocked actions are present", () => {
    const result = simulateGovernancePolicy({
      currentPolicy: policy(),
      proposedPolicy: policy({ invitePolicy: "domain_allowlist_only", enforcedMfa: true }),
      sourceCount: 0,
      pendingDeletionRequests: 0,
      queueFailures: 0,
      queueDeadLetter: 0,
      ssoDomainAllowlistCount: 1,
    });
    expect(result.status).toBe("safe");
    expect(result.warnings).toHaveLength(0);
    expect(result.blockedActions).toHaveLength(0);
  });

  it("marks blocked when legal hold is enabled with pending deletions", () => {
    const result = simulateGovernancePolicy({
      currentPolicy: policy(),
      proposedPolicy: policy({ legalHoldEnabled: true }),
      sourceCount: 5,
      pendingDeletionRequests: 2,
      queueFailures: 0,
      queueDeadLetter: 0,
      ssoDomainAllowlistCount: 1,
    });
    expect(result.status).toBe("blocked");
    expect(result.blockedActions.some((item) => item.code === "deletion_requests_blocked_by_legal_hold")).toBe(true);
  });
});
