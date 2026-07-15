import type { ProcessingJob, ReadinessBlocker, ReadinessBoard, ReadinessBoardBlocker } from "@/lib/types";

const blockerOwnerByCategory: Record<ReadinessBlocker["category"] | "queue", string> = {
  configuration: "platform-oncall",
  identity: "iam-oncall",
  billing: "billing-oncall",
  feature_flag: "release-oncall",
  connector: "connector-oncall",
  queue: "runtime-oncall",
};

const blockerRemediationByCategory: Record<ReadinessBlocker["category"] | "queue", string> = {
  configuration: "Set required environment variables and re-run readiness smoke.",
  identity: "Enable SSO and validate login/ACS flow with a production-like IdP payload.",
  billing: "Restore active billing entitlement and re-run entitlement reconciliation.",
  feature_flag: "Enable required enterprise feature flags for this tenant rollout ring.",
  connector: "Complete OAuth connection and successful sync for the missing provider.",
  queue: "Replay failed/dead-letter jobs and verify workers drain the backlog.",
};

const defaultOpsHeaders =
  "@{ 'Content-Type'='application/json'; 'x-user-id'='owner-001'; 'x-user-role'='owner'; 'x-org-id'='<ORG_ID>' }";

function quoteEnvValue(key: string) {
  return `<set-${key.toLowerCase()}>`;
}

function envSetupCommand(keys: string[]) {
  const unique = Array.from(new Set(keys));
  return unique.map((key) => `$env:${key}='${quoteEnvValue(key)}'`).join("; ");
}

function withOrgHeaders(command: string, organisationId: string) {
  return command.replaceAll("<ORG_ID>", organisationId);
}

function readinessSmokeCommand() {
  return "npm.cmd run test:smoke:prod-readiness";
}

function opsSmokeCommand() {
  return "npm.cmd run test:smoke:ops-readiness";
}

function nextCommandForBlocker(blocker: ReadinessBlocker, organisationId: string) {
  if (blocker.category === "configuration" && blocker.code === "missing_env") {
    return `${envSetupCommand(blocker.details.missingEnv)}; ${readinessSmokeCommand()}`;
  }

  if (blocker.category === "configuration" && blocker.code === "missing_connector_env") {
    return `${envSetupCommand(blocker.details.missingEnv)}; ${readinessSmokeCommand()}`;
  }
  if (blocker.category === "configuration" && blocker.code === "missing_scim_env") {
    return `${envSetupCommand(blocker.details.missingEnv)}; ${readinessSmokeCommand()}`;
  }
  if (blocker.category === "configuration" && blocker.code === "missing_oauth_state_secret") {
    return `${envSetupCommand(blocker.details.missingEnv)}; ${readinessSmokeCommand()}`;
  }

  if (blocker.category === "identity" && blocker.code === "sso_disabled") {
    const command =
      "$body = @{ enabled = $true; idpEntityId = 'https://idp.example.com'; ssoUrl = 'https://idp.example.com/saml'; certificateFingerprint = 'AA:BB:CC:DD:EE:FF:11:22'; domainAllowlist = @('example.com') } | ConvertTo-Json -Depth 6; " +
      `Invoke-RestMethod -Method PATCH -Uri 'http://localhost/api/sso/config' -Headers ${defaultOpsHeaders} -Body $body; ` +
      readinessSmokeCommand();
    return withOrgHeaders(command, organisationId);
  }

  if (blocker.category === "billing" && blocker.code === "billing_not_active") {
    const command =
      "$body = @{ plan = 'enterprise'; status = 'active'; autoSendEnabled = $true; apiAccessEnabled = $true; mcpAccessEnabled = $true } | ConvertTo-Json -Depth 6; " +
      `Invoke-RestMethod -Method PATCH -Uri 'http://localhost/api/billing/entitlements' -Headers ${defaultOpsHeaders} -Body $body; ` +
      readinessSmokeCommand();
    return withOrgHeaders(command, organisationId);
  }

  if (blocker.category === "feature_flag") {
    const command =
      `$body = @{ key = '${blocker.key}'; enabled = $true; rolloutPercent = 100 } | ConvertTo-Json -Depth 6; ` +
      `Invoke-RestMethod -Method PATCH -Uri 'http://localhost/api/feature-flags' -Headers ${defaultOpsHeaders} -Body $body; ` +
      readinessSmokeCommand();
    return withOrgHeaders(command, organisationId);
  }

  if (blocker.category === "connector") {
    const redirectUri = encodeURIComponent("http://localhost:3000/app/settings");
    const command =
      `Invoke-RestMethod -Method GET -Uri 'http://localhost/api/connectors/${blocker.provider}/oauth/start?redirectUri=${redirectUri}' -Headers ${defaultOpsHeaders}; ` +
      "Write-Host 'Complete OAuth in browser, then run sync/backfill.'; " +
      readinessSmokeCommand();
    return withOrgHeaders(command, organisationId);
  }

  return readinessSmokeCommand();
}

function queueNextCommand(organisationId: string) {
  const command =
    `Invoke-RestMethod -Method GET -Uri 'http://localhost/api/jobs' -Headers ${defaultOpsHeaders} | ConvertTo-Json -Depth 6; ` +
    "Write-Host 'Replay failed/dead-letter job ids via /api/jobs/{id}/replay.'; " +
    opsSmokeCommand();
  return withOrgHeaders(command, organisationId);
}

export const defaultSloTargets: ReadinessBoard["sloTargets"] = {
  apiLatencyP95Ms: 400,
  jobCompletionP95Minutes: 15,
  connectorSyncFreshnessMinutes: 60,
  evaluationThroughputPerMinute: 40,
  webhookDeliverySuccessRatePct: 99.5,
};

export const defaultIncidentSeverityPolicy: ReadinessBoard["incidentSeverityPolicy"] = [
  { severity: "sev0", responseSlaMinutes: 5, escalationMinutes: 10, owner: "platform-director" },
  { severity: "sev1", responseSlaMinutes: 15, escalationMinutes: 30, owner: "platform-oncall" },
  { severity: "sev2", responseSlaMinutes: 30, escalationMinutes: 60, owner: "service-owner" },
  { severity: "sev3", responseSlaMinutes: 120, escalationMinutes: 240, owner: "product-owner" },
];

function queueHealth(jobs: ProcessingJob[]) {
  return {
    queued: jobs.filter((job) => job.status === "queued").length,
    running: jobs.filter((job) => job.status === "running").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    deadLetter: jobs.filter((job) => job.status === "dead_letter").length,
  };
}

function readinessBlockerToBoardBlocker(
  blocker: ReadinessBlocker,
  organisationId: string
): ReadinessBoardBlocker {
  return {
    code: blocker.code,
    category: blocker.category,
    severity: blocker.severity,
    owner: blockerOwnerByCategory[blocker.category],
    status: "open",
    remediation: blockerRemediationByCategory[blocker.category],
    nextCommand: nextCommandForBlocker(blocker, organisationId),
    evidence: [blocker.message],
  };
}

export function buildReadinessBoard(input: {
  blockers: ReadinessBlocker[];
  jobs: ProcessingJob[];
  organisationId?: string;
}): ReadinessBoard {
  const organisationId = input.organisationId ?? "<ORG_ID>";
  const queue = queueHealth(input.jobs);
  const queueBlockers: ReadinessBoardBlocker[] = [];

  if (queue.deadLetter > 0) {
    queueBlockers.push({
      code: "queue_dead_letter_backlog",
      category: "queue",
      severity: "critical",
      owner: blockerOwnerByCategory.queue,
      status: "open",
      remediation: blockerRemediationByCategory.queue,
      nextCommand: queueNextCommand(organisationId),
      evidence: [`dead-letter jobs=${queue.deadLetter}`],
    });
  }
  if (queue.failed > 0) {
    queueBlockers.push({
      code: "queue_failed_jobs_present",
      category: "queue",
      severity: "high",
      owner: blockerOwnerByCategory.queue,
      status: "open",
      remediation: blockerRemediationByCategory.queue,
      nextCommand: queueNextCommand(organisationId),
      evidence: [`failed jobs=${queue.failed}`],
    });
  }

  const blockers = input.blockers
    .map((blocker) => readinessBlockerToBoardBlocker(blocker, organisationId))
    .concat(queueBlockers);
  const hardBlockerCount = blockers.filter((item) => item.severity === "critical" || item.severity === "high").length;

  return {
    generatedAt: new Date().toISOString(),
    goNoGo: hardBlockerCount > 0 ? "no_go" : "go",
    hardBlockerCount,
    queueHealth: queue,
    sloTargets: defaultSloTargets,
    incidentSeverityPolicy: defaultIncidentSeverityPolicy,
    blockers,
  };
}
