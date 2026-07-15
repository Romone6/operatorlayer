import { describe, expect, it } from "vitest";

import { buildEnterpriseOnboardingChecklist } from "@/lib/enterprise/onboarding-checklist";
import type { ReadinessBoard } from "@/lib/types";

function createBoard(blockerCodes: string[]): ReadinessBoard {
  return {
    generatedAt: "2026-05-18T00:00:00.000Z",
    goNoGo: "no_go",
    hardBlockerCount: blockerCodes.length,
    queueHealth: {
      queued: 0,
      running: 0,
      failed: blockerCodes.includes("queue_failed_jobs_present") ? 1 : 0,
      deadLetter: blockerCodes.includes("queue_dead_letter_backlog") ? 1 : 0,
    },
    sloTargets: {
      apiLatencyP95Ms: 250,
      jobCompletionP95Minutes: 30,
      connectorSyncFreshnessMinutes: 60,
      evaluationThroughputPerMinute: 40,
      webhookDeliverySuccessRatePct: 99.9,
    },
    incidentSeverityPolicy: [
      { severity: "sev0", responseSlaMinutes: 10, escalationMinutes: 5, owner: "oncall" },
      { severity: "sev1", responseSlaMinutes: 30, escalationMinutes: 15, owner: "platform" },
      { severity: "sev2", responseSlaMinutes: 120, escalationMinutes: 60, owner: "ops" },
      { severity: "sev3", responseSlaMinutes: 480, escalationMinutes: 240, owner: "support" },
    ],
    blockers: blockerCodes.map((code, index) => ({
      code,
      category: code.startsWith("queue_") ? "queue" : "configuration",
      severity: "high",
      owner: "enterprise-platform",
      status: "open",
      remediation: `Resolve ${code}`,
      nextCommand:
        code === "queue_failed_jobs_present"
          ? "Invoke-RetryQueueJob"
          : code === "queue_dead_letter_backlog"
            ? "Invoke-RetryQueueJob"
            : `Resolve-${index}`,
      evidence: [`evidence:${code}`],
    })),
  };
}

describe("buildEnterpriseOnboardingChecklist", () => {
  it("maps blockers into expected onboarding steps and computes readiness totals", () => {
    const checklist = buildEnterpriseOnboardingChecklist(
      createBoard([
        "missing_env",
        "sso_disabled",
        "billing_not_active",
        "connector_gmail_disabled",
        "missing_connector_env",
        "gmail_connector_missing",
      ])
    );

    expect(checklist.steps).toHaveLength(7);
    expect(checklist.readinessMeter.total).toBe(7);
    expect(checklist.readinessMeter.completed).toBe(1);
    expect(checklist.readinessMeter.completionPct).toBe(14);
    expect(checklist.steps.find((step) => step.id === "core_runtime_env")?.complete).toBe(false);
    expect(checklist.steps.find((step) => step.id === "queue_replay_health")?.complete).toBe(true);
  });

  it("deduplicates next commands within a single onboarding step", () => {
    const checklist = buildEnterpriseOnboardingChecklist(
      createBoard(["queue_failed_jobs_present", "queue_dead_letter_backlog"])
    );
    const queueStep = checklist.steps.find((step) => step.id === "queue_replay_health");
    expect(queueStep?.complete).toBe(false);
    expect(queueStep?.nextCommands).toEqual(["Invoke-RetryQueueJob"]);
    expect(queueStep?.blockerCodes).toEqual(["queue_failed_jobs_present", "queue_dead_letter_backlog"]);
  });
});
