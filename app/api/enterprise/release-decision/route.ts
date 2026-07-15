import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";

import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { buildEnterpriseReleaseDecision } from "@/lib/enterprise/release-decision";
import { resolveEnterpriseCapabilityStatus } from "@/lib/enterprise/capability-status";
import { buildEnterpriseOnboardingChecklist } from "@/lib/enterprise/onboarding-checklist";
import { buildReadinessBoard } from "@/lib/enterprise/readiness-board";
import { resolveEnterpriseReadiness } from "@/lib/enterprise/readiness";
import { resolveConnectors } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { EnterpriseProcurementDocsPresence, EnterpriseReleaseEvidenceSignals } from "@/lib/types";

const procurementDocPaths = {
  architectureBrief: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "procurement",
    "architecture-brief.md"
  ),
  securityQuestionnaireBaseline: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "procurement",
    "security-questionnaire-baseline.md"
  ),
  connectorScopeMatrix: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "procurement",
    "connector-scope-matrix.md"
  ),
  governanceWalkthrough: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "procurement",
    "governance-walkthrough.md"
  ),
} as const;

const operationsDocPaths = {
  sloTargets: join(/* turbopackIgnore: true */ process.cwd(), "docs", "operations", "slo-targets.md"),
  incidentResponseRunbook: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "operations",
    "incident-response-runbook.md"
  ),
  backupRestoreDrill: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "operations",
    "backup-restore-drill.md"
  ),
  queueReplayDisasterExercise: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "operations",
    "queue-replay-disaster-exercise.md"
  ),
  providerOutageChaosExercise: join(
    /* turbopackIgnore: true */ process.cwd(),
    "docs",
    "operations",
    "provider-outage-chaos-exercise.md"
  ),
} as const;

const developerDocPaths = {
  apiV1: join(/* turbopackIgnore: true */ process.cwd(), "docs", "developer", "api-v1.md"),
  mcpV1: join(/* turbopackIgnore: true */ process.cwd(), "docs", "developer", "mcp-v1.md"),
} as const;

function buildEvidenceSignals(input: {
  ingestionLogs: Array<{ action: string; sourceId: string | null; details: Record<string, unknown> }>;
  reviewEventsCount: number;
  evaluationsCount: number;
  policiesCount: number;
  scenariosCount: number;
  conflictsCount: number;
}): EnterpriseReleaseEvidenceSignals {
  const enterpriseLogs = input.ingestionLogs.filter((item) => item.action.startsWith("enterprise:"));
  const connectorEvents = enterpriseLogs.filter((item) => item.action.startsWith("enterprise:connector")).length;
  const billingEvents = enterpriseLogs.filter((item) => item.action.startsWith("enterprise:billing")).length;
  const securityEvents = enterpriseLogs.filter(
    (item) => item.action.startsWith("enterprise:api_key") || item.action.startsWith("enterprise:webhook")
  ).length;
  const governanceEvents = enterpriseLogs.filter(
    (item) =>
      item.action.startsWith("enterprise:governance") ||
      item.action.startsWith("enterprise:legal_hold") ||
      item.action.startsWith("enterprise:break_glass") ||
      item.action.startsWith("enterprise:deletion")
  ).length;
  const mcpEvents = enterpriseLogs.filter((item) => item.action.startsWith("enterprise:mcp_")).length;
  const sourceUploadedEvents = input.ingestionLogs.filter((item) => {
    if (item.action !== "source_uploaded") {
      return false;
    }
    if (!item.sourceId || item.sourceId.trim().length === 0) {
      return false;
    }
    const details = item.details ?? {};
    const sourceType = details.sourceType;
    const title = details.title;
    const authorityLevel = details.authorityLevel;
    return (
      typeof sourceType === "string" &&
      sourceType.trim().length > 0 &&
      typeof title === "string" &&
      title.trim().length > 0 &&
      typeof authorityLevel === "string" &&
      authorityLevel.trim().length > 0
    );
  }).length;
  const sourceProcessRequestedEvents = input.ingestionLogs.filter((item) => {
    if (item.action !== "source_process_requested") {
      return false;
    }
    const details = item.details ?? {};
    const sourceId = details.sourceId;
    const mode = details.mode;
    return (
      typeof sourceId === "string" &&
      sourceId.trim().length > 0 &&
      typeof mode === "string" &&
      mode.trim().length > 0
    );
  }).length;
  const sourceReprocessRequestedEvents = input.ingestionLogs.filter((item) => {
    if (item.action !== "source_reprocess_requested") {
      return false;
    }
    const details = item.details ?? {};
    const sourceId = details.sourceId;
    const mode = details.mode;
    return (
      typeof sourceId === "string" &&
      sourceId.trim().length > 0 &&
      typeof mode === "string" &&
      mode.trim().length > 0
    );
  }).length;

  const legalHoldEvents = enterpriseLogs.filter((item) => item.action.startsWith("enterprise:legal_hold")).length;
  const breakGlassEvents = enterpriseLogs.filter((item) => item.action.startsWith("enterprise:break_glass")).length;
  const deletionEvents = enterpriseLogs.filter((item) => item.action.startsWith("enterprise:deletion")).length;
  const deletionProofEvents = enterpriseLogs.filter((item) => {
    if (item.action !== "enterprise:deletion_completed") {
      return false;
    }
    const completion =
      item.details && typeof item.details === "object"
        ? (item.details as Record<string, unknown>).completion
        : undefined;
    if (!completion || typeof completion !== "object") {
      return false;
    }
    const payload = completion as Record<string, unknown>;
    return (
      typeof payload.completedBy === "string" &&
      payload.completedBy.trim().length > 0 &&
      typeof payload.completedAt === "string" &&
      payload.completedAt.trim().length > 0 &&
      typeof payload.executionMode === "string" &&
      payload.executionMode.trim().length > 0 &&
      typeof payload.deletionEvidenceHash === "string" &&
      payload.deletionEvidenceHash.trim().length > 0
    );
  }).length;
  const ssoConfigEvents = enterpriseLogs.filter((item) => item.action === "enterprise:sso_config_upsert").length;
  const scimBulkOperationEvents = enterpriseLogs.filter(
    (item) => item.action === "enterprise:scim_bulk_operation"
  ).length;
  const scimUserStatusEvents = enterpriseLogs.filter(
    (item) => item.action === "enterprise:scim_user_status_set"
  ).length;
  const scimDriftReconcileEvents = enterpriseLogs.filter(
    (item) => item.action === "enterprise:scim_drift_reconcile_run"
  ).length;
  const rbacRoleChangeEvents = enterpriseLogs.filter((item) => {
    if (item.action === "enterprise:member_role_updated") {
      return true;
    }
    if (item.action !== "enterprise:scim_user_status_set") {
      return false;
    }
    return (
      item.details?.reason === "role_update" ||
      item.details?.reason === "drift_reconciled_deprovision_role_downgrade"
    );
  }).length;
  const memberInviteLifecycleEvents = enterpriseLogs.filter((item) =>
    item.action.startsWith("enterprise:member_invite_")
  ).length;
  const approvalRuleEvents = enterpriseLogs.filter(
    (item) => item.action === "enterprise:approval_rule_upsert"
  ).length;

  const autoSendDecisionEvents = enterpriseLogs.filter(
    (item) => item.action === "enterprise:auto_send_decision_recorded"
  ).length;
  const sendEventCreated = enterpriseLogs.filter((item) => item.action === "enterprise:send_event_created").length;
  const sendEventDelivered = enterpriseLogs.filter(
    (item) => item.action === "enterprise:send_event_delivery_confirmed"
  ).length;
  const sendEventBlockedOrFailed = enterpriseLogs.filter(
    (item) =>
      item.action === "enterprise:send_event_status_updated" &&
      (item.details.status === "blocked" || item.details.status === "failed")
  ).length;
  const runtimeDeniedEntries = enterpriseLogs
    .filter((item) => item.action === "enterprise:capability_runtime_denied")
    .flatMap((item) => {
      const capabilityId =
        item.details && typeof item.details === "object"
          ? (item.details as Record<string, unknown>).capabilityId
          : undefined;
      if (typeof capabilityId !== "string" || capabilityId.trim().length === 0) {
        return [];
      }
      const reason =
        item.details && typeof item.details === "object"
          ? (item.details as Record<string, unknown>).reason
          : undefined;
      return [
        {
          capabilityId,
          reason: typeof reason === "string" && reason.trim().length > 0 ? reason : null,
        },
      ];
    });
  const runtimeDeniedCapabilityIds = Array.from(
    new Set(
      runtimeDeniedEntries.map((item) => item.capabilityId)
    )
  );
  const connectorUnavailableRuntimeDenials = enterpriseLogs.filter((item) => {
    if (item.action !== "enterprise:capability_runtime_denied") {
      return false;
    }
    const capabilityId =
      item.details && typeof item.details === "object"
        ? (item.details as Record<string, unknown>).capabilityId
        : undefined;
    return typeof capabilityId === "string" && capabilityId.startsWith("connector_");
  }).length;
  const mcpUnavailableRuntimeDenials = enterpriseLogs.filter((item) => {
    if (item.action !== "enterprise:capability_runtime_denied") {
      return false;
    }
    const capabilityId =
      item.details && typeof item.details === "object"
        ? (item.details as Record<string, unknown>).capabilityId
        : undefined;
    return capabilityId === "mcp_actions";
  }).length;
  const autoSendUnavailableRuntimeDenials = enterpriseLogs.filter((item) => {
    if (item.action !== "enterprise:capability_runtime_denied") {
      return false;
    }
    const capabilityId =
      item.details && typeof item.details === "object"
        ? (item.details as Record<string, unknown>).capabilityId
        : undefined;
    return capabilityId === "auto_send";
  }).length;
  const scimWriteUnavailableRuntimeDenials = enterpriseLogs.filter((item) => {
    if (item.action !== "enterprise:capability_runtime_denied") {
      return false;
    }
    const capabilityId =
      item.details && typeof item.details === "object"
        ? (item.details as Record<string, unknown>).capabilityId
        : undefined;
    return capabilityId === "scim_write";
  }).length;
  const samlSsoUnavailableRuntimeDenials = enterpriseLogs.filter((item) => {
    if (item.action !== "enterprise:capability_runtime_denied") {
      return false;
    }
    const capabilityId =
      item.details && typeof item.details === "object"
        ? (item.details as Record<string, unknown>).capabilityId
        : undefined;
    return capabilityId === "saml_sso";
  }).length;

  return {
    auditEvents: {
      total: enterpriseLogs.length,
      enterprise: enterpriseLogs.length,
      connector: connectorEvents,
      billing: billingEvents,
      security: securityEvents,
      governance: governanceEvents,
      mcp: mcpEvents,
    },
    intelligence: {
      evaluations: input.evaluationsCount,
      reviewEvents: input.reviewEventsCount,
      policies: input.policiesCount,
      scenarios: input.scenariosCount,
      conflicts: input.conflictsCount,
    },
    governanceLifecycles: {
      legalHoldEvents,
      breakGlassEvents,
      deletionEvents,
      deletionProofEvents,
    },
    iamLifecycles: {
      ssoConfigEvents,
      scimBulkOperationEvents,
      scimUserStatusEvents,
      scimDriftReconcileEvents,
      rbacRoleChangeEvents,
      memberInviteLifecycleEvents,
    },
    permissionedIngestionLifecycles: {
      sourceUploadedEvents,
      sourceProcessRequestedEvents,
      sourceReprocessRequestedEvents,
    },
    autoSend: {
      approvalRuleEvents,
      decisionEvents: autoSendDecisionEvents,
      sendEventsCreated: sendEventCreated,
      sendEventsDelivered: sendEventDelivered,
      sendEventsBlockedOrFailed: sendEventBlockedOrFailed,
    },
    runtimeDenials: {
      connectorUnavailable: connectorUnavailableRuntimeDenials,
      mcpUnavailable: mcpUnavailableRuntimeDenials,
      autoSendUnavailable: autoSendUnavailableRuntimeDenials,
      scimWriteUnavailable: scimWriteUnavailableRuntimeDenials,
      samlSsoUnavailable: samlSsoUnavailableRuntimeDenials,
      capabilityIds: runtimeDeniedCapabilityIds,
      entries: runtimeDeniedEntries,
    },
  };
}

async function hasDoc(absolutePath: string) {
  try {
    await access(absolutePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveProcurementDocsPresence(): Promise<EnterpriseProcurementDocsPresence> {
  const [architectureBrief, securityQuestionnaireBaseline, connectorScopeMatrix, governanceWalkthrough] =
    await Promise.all([
      hasDoc(procurementDocPaths.architectureBrief),
      hasDoc(procurementDocPaths.securityQuestionnaireBaseline),
      hasDoc(procurementDocPaths.connectorScopeMatrix),
      hasDoc(procurementDocPaths.governanceWalkthrough),
    ]);

  return {
    architectureBrief,
    securityQuestionnaireBaseline,
    connectorScopeMatrix,
    governanceWalkthrough,
  };
}

async function resolveOperationsDocsPresence() {
  const [
    sloTargets,
    incidentResponseRunbook,
    backupRestoreDrill,
    queueReplayDisasterExercise,
    providerOutageChaosExercise,
  ] = await Promise.all([
    hasDoc(operationsDocPaths.sloTargets),
    hasDoc(operationsDocPaths.incidentResponseRunbook),
    hasDoc(operationsDocPaths.backupRestoreDrill),
    hasDoc(operationsDocPaths.queueReplayDisasterExercise),
    hasDoc(operationsDocPaths.providerOutageChaosExercise),
  ]);

  return {
    sloTargets,
    incidentResponseRunbook,
    backupRestoreDrill,
    queueReplayDisasterExercise,
    providerOutageChaosExercise,
  };
}

async function resolveDeveloperDocsPresence() {
  const [apiV1, mcpV1] = await Promise.all([hasDoc(developerDocPaths.apiV1), hasDoc(developerDocPaths.mcpV1)]);

  return {
    apiV1,
    mcpV1,
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();

    const [readiness, jobs, capabilityStatus, connectors, ingestionLogs, reviewEvents, evaluations, policies, scenarios, conflicts, procurementDocs, developerDocs, operationsDocs] =
      await Promise.all([
      resolveEnterpriseReadiness(repository, context.organisationId),
      repository.listJobs(context.organisationId),
      resolveEnterpriseCapabilityStatus(repository, context.organisationId),
      resolveConnectors(repository, context.organisationId),
      repository.listIngestionLogs(context.organisationId),
      repository.listReviewEvents(context.organisationId),
      repository.listEvaluations(context.organisationId),
      repository.listPolicies(context.organisationId),
      repository.listScenarios(context.organisationId),
      repository.listConflicts(context.organisationId),
      resolveProcurementDocsPresence(),
      resolveDeveloperDocsPresence(),
      resolveOperationsDocsPresence(),
    ]);
    const board = buildReadinessBoard({
      blockers: readiness.blockers,
      jobs,
      organisationId: context.organisationId,
    });
    const checklist = buildEnterpriseOnboardingChecklist(board);
    const evidenceSignals = buildEvidenceSignals({
      ingestionLogs,
      reviewEventsCount: reviewEvents.length,
      evaluationsCount: evaluations.length,
      policiesCount: policies.length,
      scenariosCount: scenarios.length,
      conflictsCount: conflicts.length,
    });
    const decision = buildEnterpriseReleaseDecision({
      board,
      checklist,
      capabilityStatus,
      evidenceSignals,
      procurementDocs,
      connectors,
      developerDocs,
      operationsDocs,
    });
    return jsonOk(decision);
  } catch (error) {
    return jsonError(error);
  }
}
