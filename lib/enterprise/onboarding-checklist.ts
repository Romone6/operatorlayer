import type { EnterpriseOnboardingChecklist, EnterpriseOnboardingChecklistStep, ReadinessBoard, ReadinessBoardBlocker } from "@/lib/types";

function matches(blocker: ReadinessBoardBlocker, codes: string[] | ((code: string) => boolean)) {
  if (typeof codes === "function") return codes(blocker.code);
  return codes.includes(blocker.code);
}

function buildStep(input: {
  id: EnterpriseOnboardingChecklistStep["id"];
  title: string;
  blockers: ReadinessBoardBlocker[];
  match: string[] | ((code: string) => boolean);
}): EnterpriseOnboardingChecklistStep {
  const matched = input.blockers.filter((blocker) => matches(blocker, input.match));
  return {
    id: input.id,
    title: input.title,
    complete: matched.length === 0,
    blockerCodes: matched.map((item) => item.code),
    nextCommands: Array.from(new Set(matched.map((item) => item.nextCommand))),
    evidence: matched.flatMap((item) => item.evidence),
  };
}

export function buildEnterpriseOnboardingChecklist(board: ReadinessBoard): EnterpriseOnboardingChecklist {
  const steps: EnterpriseOnboardingChecklistStep[] = [
    buildStep({
      id: "core_runtime_env",
      title: "Configure core enterprise runtime environment variables",
      blockers: board.blockers,
      match: ["missing_env", "missing_scim_env", "missing_oauth_state_secret"],
    }),
    buildStep({
      id: "identity_sso",
      title: "Enable SAML SSO identity lifecycle",
      blockers: board.blockers,
      match: ["sso_disabled"],
    }),
    buildStep({
      id: "billing_api_access",
      title: "Activate billing entitlement for enterprise API access",
      blockers: board.blockers,
      match: ["billing_not_active"],
    }),
    buildStep({
      id: "connector_feature_flags",
      title: "Enable required enterprise feature flags",
      blockers: board.blockers,
      match: (code) =>
        (code.endsWith("_disabled") && code.startsWith("connector_")) ||
        code === "auto_send_disabled" ||
        code === "mcp_actions_disabled" ||
        code === "scim_write_disabled",
    }),
    buildStep({
      id: "connector_provider_env",
      title: "Configure connector provider credential environment variables",
      blockers: board.blockers,
      match: ["missing_connector_env"],
    }),
    buildStep({
      id: "connector_connections",
      title: "Complete provider OAuth connection and sync onboarding",
      blockers: board.blockers,
      match: (code) => code.endsWith("_connector_missing"),
    }),
    buildStep({
      id: "queue_replay_health",
      title: "Resolve queue failure/dead-letter replay backlog",
      blockers: board.blockers,
      match: ["queue_failed_jobs_present", "queue_dead_letter_backlog"],
    }),
  ];

  const completed = steps.filter((step) => step.complete).length;
  const total = steps.length;
  const completionPct = Math.round((completed / total) * 100);

  return {
    generatedAt: board.generatedAt,
    goNoGo: board.goNoGo,
    readinessMeter: {
      completed,
      total,
      completionPct,
    },
    steps,
  };
}
