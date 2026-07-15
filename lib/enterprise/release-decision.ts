import type {
  ConnectorRecord,
  EnterpriseClosureAudit,
  EnterpriseClosureEvidenceQuality,
  EnterpriseClosureRequirementAuditItem,
  EnterpriseClosureRequirementStatus,
  EnterpriseCompliancePosture,
  EnterpriseObjectiveCoverageItem,
  EnterpriseObjectiveCoverageScope,
  EnterpriseReleaseEvidenceSignals,
  EnterpriseOnboardingChecklist,
  EnterpriseProcurementDocsPresence,
  EnterpriseReleaseDomainAssessment,
  EnterpriseReleaseDecision,
  ReadinessBoard,
} from "@/lib/types";
import type { EnterpriseCapabilityStatus } from "@/lib/enterprise/capability-status";

function unique(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.length > 0)));
}

function hasBlockedCapability(
  capabilityStatus: EnterpriseCapabilityStatus,
  matcher: (capabilityId: string) => boolean
) {
  return capabilityStatus.capabilityStates.some((item) => item.state === "unavailable" && matcher(item.id));
}

function buildDomainAssessments(input: {
  board: ReadinessBoard;
  checklist: EnterpriseOnboardingChecklist;
  capabilityStatus: EnterpriseCapabilityStatus;
  evidenceSignals: EnterpriseReleaseEvidenceSignals;
  connectors: ConnectorRecord[];
  developerDocs: {
    apiV1: boolean;
    mcpV1: boolean;
  };
  operationsDocs: {
    sloTargets: boolean;
    incidentResponseRunbook: boolean;
    backupRestoreDrill: boolean;
    queueReplayDisasterExercise: boolean;
    providerOutageChaosExercise: boolean;
  };
}): EnterpriseReleaseDomainAssessment[] {
  const { board, checklist, capabilityStatus, evidenceSignals, connectors, developerDocs, operationsDocs } = input;
  const blockers = board.blockers;
  const unavailable = capabilityStatus.capabilityStates.filter((item) => item.state === "unavailable");
  const checklistById = new Map(checklist.steps.map((step) => [step.id, step] as const));

  const connectorChecklistCommands = unique([
    ...(checklistById.get("connector_provider_env")?.nextCommands ?? []),
    ...(checklistById.get("connector_connections")?.nextCommands ?? []),
    ...(checklistById.get("connector_feature_flags")?.nextCommands ?? []),
  ]);

  const queueCommands = checklistById.get("queue_replay_health")?.nextCommands ?? [];
  const envCommands = checklistById.get("core_runtime_env")?.nextCommands ?? [];
  const identityCommands = checklistById.get("identity_sso")?.nextCommands ?? [];
  const billingCommands = checklistById.get("billing_api_access")?.nextCommands ?? [];

  const connectorBlocked =
    blockers.some((item) => item.category === "connector" || item.code === "missing_connector_env") ||
    hasBlockedCapability(capabilityStatus, (id) => id.startsWith("connector_"));
  const iamBlocked =
    blockers.some((item) => item.category === "identity") ||
    hasBlockedCapability(capabilityStatus, (id) => id === "saml_sso" || id === "scim_write");
  const iamEvidenceMissing = [
    evidenceSignals.auditEvents.security === 0 ? "iam_security_audit_evidence_missing" : "",
    evidenceSignals.iamLifecycles.ssoConfigEvents === 0 ? "sso_config_lifecycle_evidence_missing" : "",
    evidenceSignals.iamLifecycles.scimBulkOperationEvents === 0
      ? "scim_bulk_operation_lifecycle_evidence_missing"
      : "",
    evidenceSignals.iamLifecycles.scimUserStatusEvents === 0 ? "scim_user_status_lifecycle_evidence_missing" : "",
    evidenceSignals.iamLifecycles.scimDriftReconcileEvents === 0
      ? "scim_drift_reconcile_lifecycle_evidence_missing"
      : "",
    evidenceSignals.iamLifecycles.rbacRoleChangeEvents === 0 ? "rbac_role_change_lifecycle_evidence_missing" : "",
    evidenceSignals.iamLifecycles.memberInviteLifecycleEvents === 0
      ? "member_invite_lifecycle_evidence_missing"
      : "",
  ].filter((item) => item.length > 0);
  const billingBlocked =
    blockers.some((item) => item.category === "billing") ||
    unavailable.some(
      (item) =>
        (item.id === "mcp_actions" || item.id === "auto_send") &&
        (item.reason === "billing_not_active" || item.reason === "entitlement_disabled")
    );
  const billingEvidenceMissingCodes = [
    evidenceSignals.auditEvents.billing === 0 ? "billing_lifecycle_evidence_missing" : "",
  ].filter((item) => item.length > 0);
  const mcpBlocked = unavailable.some((item) => item.id === "mcp_actions");
  const mcpEvidenceMissingCodes = [
    evidenceSignals.auditEvents.mcp === 0 ? "mcp_lifecycle_evidence_missing" : "",
  ].filter((item) => item.length > 0);
  const apiMcpDocsMissingCodes = [
    developerDocs.apiV1 ? "" : "api_v1_docs_missing",
    developerDocs.mcpV1 ? "" : "mcp_v1_docs_missing",
  ].filter((item) => item.length > 0);
  const autoSendBlocked = unavailable.some((item) => item.id === "auto_send");
  const runtimeBlocked = blockers.some((item) => item.category === "queue" || item.category === "configuration");
  const sourceUploadedEvents = evidenceSignals.permissionedIngestionLifecycles.sourceUploadedEvents;
  const sourceProcessRequestedEvents =
    evidenceSignals.permissionedIngestionLifecycles.sourceProcessRequestedEvents;
  const sourceReprocessRequestedEvents =
    evidenceSignals.permissionedIngestionLifecycles.sourceReprocessRequestedEvents;
  const reliabilityEvidenceMissing = [
    sourceUploadedEvents === 0 ? "source_upload_lifecycle_evidence_missing" : "",
    sourceProcessRequestedEvents === 0 && sourceReprocessRequestedEvents === 0
      ? "source_processing_lifecycle_evidence_missing"
      : "",
  ].filter((item) => item.length > 0);
  const intelligenceSignalsMissing = [
    evidenceSignals.intelligence.evaluations === 0 ? "evaluations" : "",
    evidenceSignals.intelligence.reviewEvents === 0 ? "review_events" : "",
    evidenceSignals.intelligence.policies === 0 ? "policies" : "",
    evidenceSignals.intelligence.scenarios === 0 ? "scenarios" : "",
  ].filter((item) => item.length > 0);
  const governanceSignalsMissing = [
    evidenceSignals.governanceLifecycles.legalHoldEvents === 0 ? "legal_hold_lifecycle" : "",
    evidenceSignals.governanceLifecycles.breakGlassEvents === 0 ? "break_glass_lifecycle" : "",
    evidenceSignals.governanceLifecycles.deletionEvents === 0 ? "deletion_lifecycle" : "",
    evidenceSignals.governanceLifecycles.deletionProofEvents === 0 ? "deletion_proof_lifecycle" : "",
    evidenceSignals.auditEvents.security === 0 ? "security_audit_events" : "",
  ].filter((item) => item.length > 0);
  const autoSendEvidenceMissing = [
    evidenceSignals.autoSend.approvalRuleEvents === 0 ? "approval_rule_lifecycle_events" : "",
    evidenceSignals.autoSend.decisionEvents === 0 ? "auto_send_decision_events" : "",
    evidenceSignals.autoSend.sendEventsCreated === 0 ? "send_event_created" : "",
    evidenceSignals.autoSend.sendEventsDelivered === 0 ? "send_event_delivery_confirmed" : "",
  ].filter((item) => item.length > 0);
  const runtimeBlockers = blockers.filter(
    (item) => item.category === "queue" || item.category === "configuration"
  );
  const identityBlockers = blockers.filter((item) => item.category === "identity");
  const connectorBlockers = blockers.filter(
    (item) => item.category === "connector" || item.code === "missing_connector_env"
  );
  const billingBlockers = blockers.filter((item) => item.category === "billing");
  const highOrCriticalBlockers = blockers.filter(
    (item) => item.severity === "high" || item.severity === "critical"
  );
  const unavailableConnectorCapabilities = unavailable.filter((item) => item.id.startsWith("connector_"));
  const availableConnectorCapabilities = capabilityStatus.capabilityStates
    .filter((item) => item.id.startsWith("connector_") && item.state === "available")
    .map((item) => `${item.id}:${item.state}:${item.reason}`);
  const providersMissingSyncProof = connectors
    .filter((item) => item.status === "connected")
    .filter((item) => item.lastSyncStatus !== "succeeded" || item.lastSyncAt === null)
    .map((item) => item.provider);
  const connectorSyncProofMissingCodes = unique(
    providersMissingSyncProof.map((provider) => `connector_sync_proof_missing_${provider}`)
  );
  const connectorSyncProofEvidence = connectors
    .filter((item) => item.status === "connected")
    .map((item) => `${item.provider}:last_sync_status=${item.lastSyncStatus}:last_sync_at=${item.lastSyncAt ?? "never"}`);
  const unavailableIdentityCapabilities = unavailable.filter(
    (item) => item.id === "saml_sso" || item.id === "scim_write"
  );
  const unavailableMcpCapabilities = unavailable.filter((item) => item.id === "mcp_actions");
  const unavailableBillingCapabilities = unavailable.filter(
    (item) => item.id === "mcp_actions" || item.id === "auto_send"
  );
  const operationalSeverityEvidence = highOrCriticalBlockers.map((item) => item.evidence).flat();
  const operationalBlockingCodes = highOrCriticalBlockers.map((item) => item.code);
  const missingOperationalDocs = [
    operationsDocs.sloTargets ? "" : "ops_doc_missing_slo_targets",
    operationsDocs.incidentResponseRunbook ? "" : "ops_doc_missing_incident_response_runbook",
    operationsDocs.backupRestoreDrill ? "" : "ops_doc_missing_backup_restore_drill",
    operationsDocs.queueReplayDisasterExercise ? "" : "ops_doc_missing_queue_replay_disaster_exercise",
    operationsDocs.providerOutageChaosExercise ? "" : "ops_doc_missing_provider_outage_chaos_exercise",
  ].filter((item) => item.length > 0);

  return [
    {
      id: "reliability_control_plane",
      title: "Reliability and control-plane maturity",
      status: runtimeBlocked ? "blocked" : reliabilityEvidenceMissing.length > 0 ? "verification_gap" : "ready",
      reason: runtimeBlocked
        ? "Runtime environment or queue reliability blockers are still open."
        : reliabilityEvidenceMissing.length > 0
          ? "Runtime blockers are clear, but source ingestion-processing reliability evidence is incomplete."
          : "No runtime/queue blockers are open and source ingestion-processing reliability evidence is present.",
      evidence: unique(
        runtimeBlocked
          ? runtimeBlockers.flatMap((item) => item.evidence)
          : [
              "no_runtime_or_queue_blockers_open",
              `source_uploaded_events=${sourceUploadedEvents}`,
              `source_process_requested_events=${sourceProcessRequestedEvents}`,
              `source_reprocess_requested_events=${sourceReprocessRequestedEvents}`,
            ]
      ),
      blockingCodes: unique([...runtimeBlockers.map((item) => item.code), ...reliabilityEvidenceMissing]),
      nextActions: runtimeBlocked
        ? unique([...envCommands, ...queueCommands])
        : reliabilityEvidenceMissing.length > 0
          ? ["npm.cmd run test:integration -- tests/integration/sources-api.test.ts", "npm.cmd run test:smoke:job-idempotency"]
          : [],
    },
    {
      id: "iam_saml_scim_rbac_audit",
      title: "IAM (SAML, SCIM, RBAC, audit)",
      status: iamBlocked ? "blocked" : iamEvidenceMissing.length > 0 ? "verification_gap" : "ready",
      reason: iamBlocked
        ? "Identity lifecycle prerequisites are incomplete (SSO/SCIM still unavailable)."
        : iamEvidenceMissing.length > 0
          ? `Identity capabilities are available, but IAM lifecycle evidence is incomplete: ${iamEvidenceMissing.join(", ")}.`
          : "Identity lifecycle capabilities and evidence are available.",
      evidence: unique(
        iamBlocked
          ? [
              ...identityBlockers.flatMap((item) => item.evidence),
              ...unavailableIdentityCapabilities.map((item) => item.message),
            ]
          : [
              `iam_security_audit_events=${evidenceSignals.auditEvents.security}`,
              "identity_capabilities_available:saml_sso,scim_write",
              `sso_config_events=${evidenceSignals.iamLifecycles.ssoConfigEvents}`,
              `scim_bulk_operation_events=${evidenceSignals.iamLifecycles.scimBulkOperationEvents}`,
              `scim_user_status_events=${evidenceSignals.iamLifecycles.scimUserStatusEvents}`,
              `scim_drift_reconcile_events=${evidenceSignals.iamLifecycles.scimDriftReconcileEvents}`,
              `rbac_role_change_events=${evidenceSignals.iamLifecycles.rbacRoleChangeEvents}`,
              `member_invite_lifecycle_events=${evidenceSignals.iamLifecycles.memberInviteLifecycleEvents}`,
              ...capabilityStatus.capabilityStates
                .filter((item) => item.id === "saml_sso" || item.id === "scim_write")
                .map((item) => `${item.id}:${item.state}:${item.reason}`),
            ]
      ),
      blockingCodes: unique([
        ...identityBlockers.map((item) => item.code),
        ...unavailableIdentityCapabilities.map((item) => item.id),
        ...iamEvidenceMissing,
      ]),
      nextActions: iamBlocked
        ? unique(identityCommands)
        : iamEvidenceMissing.length > 0
          ? [
              "npm.cmd run test:smoke:scim-drift-reconcile",
              "npm.cmd run test:smoke:saml-metadata-ingestion",
              "npm.cmd run test:integration -- tests/integration/member-invites-api.test.ts",
              "npm.cmd run test:integration -- tests/integration/authorization-members-api.test.ts",
            ]
          : [],
    },
    {
      id: "provider_deep_connectors",
      title: "Provider-deep connectors",
      status: connectorBlocked ? "blocked" : connectorSyncProofMissingCodes.length > 0 ? "verification_gap" : "ready",
      reason: connectorBlocked
        ? "One or more connector providers remain unavailable."
        : connectorSyncProofMissingCodes.length > 0
          ? "Connector prerequisites are satisfied, but successful sync evidence is missing for one or more connected providers."
          : "Connector prerequisites are satisfied and successful sync evidence is present across connected providers.",
      evidence: unique(
        connectorBlocked
          ? [
              ...connectorBlockers.flatMap((item) => item.evidence),
              ...unavailableConnectorCapabilities.map((item) => item.message),
            ]
          : [
              "all_connector_capabilities_available",
              ...availableConnectorCapabilities,
              ...connectorSyncProofEvidence,
            ]
      ),
      blockingCodes: unique([
        ...connectorBlockers.map((item) => item.code),
        ...unavailableConnectorCapabilities.map((item) => item.id),
        ...connectorSyncProofMissingCodes,
      ]),
      nextActions: connectorBlocked
        ? connectorChecklistCommands
        : connectorSyncProofMissingCodes.length > 0
          ? ["npm.cmd run test:smoke:connector-providers", "npm.cmd run test:smoke:ops-readiness"]
          : [],
    },
    {
      id: "intelligence_hardening",
      title: "Intelligence hardening",
      status: intelligenceSignalsMissing.length === 0 ? "ready" : "verification_gap",
      reason:
        intelligenceSignalsMissing.length === 0
          ? "Runtime intelligence evidence signals are present."
          : `Intelligence hardening evidence is incomplete: ${intelligenceSignalsMissing.join(", ")}.`,
      evidence: [
        `evaluations=${evidenceSignals.intelligence.evaluations}`,
        `review_events=${evidenceSignals.intelligence.reviewEvents}`,
        `policies=${evidenceSignals.intelligence.policies}`,
        `scenarios=${evidenceSignals.intelligence.scenarios}`,
        `conflicts=${evidenceSignals.intelligence.conflicts}`,
      ],
      blockingCodes: intelligenceSignalsMissing,
      nextActions:
        intelligenceSignalsMissing.length === 0
          ? []
          : ["npm.cmd run test:integration -- tests/integration/evaluation-explainability-api.test.ts"],
    },
    {
      id: "approval_auto_send_governance",
      title: "Approval and controlled auto-send governance",
      status: autoSendBlocked ? "blocked" : autoSendEvidenceMissing.length > 0 ? "verification_gap" : "ready",
      reason: autoSendBlocked
        ? "Auto-send remains unavailable due to explicit runtime prerequisites."
        : autoSendEvidenceMissing.length > 0
          ? `Auto-send evidence is incomplete: ${autoSendEvidenceMissing.join(", ")}.`
          : "Auto-send governance lifecycle evidence is present.",
      evidence: unique([
        ...unavailable.filter((item) => item.id === "auto_send").map((item) => item.message),
        `approval_rule_events=${evidenceSignals.autoSend.approvalRuleEvents}`,
        `auto_send_decision_events=${evidenceSignals.autoSend.decisionEvents}`,
        `send_events_created=${evidenceSignals.autoSend.sendEventsCreated}`,
        `send_events_delivered=${evidenceSignals.autoSend.sendEventsDelivered}`,
        `send_events_blocked_or_failed=${evidenceSignals.autoSend.sendEventsBlockedOrFailed}`,
      ]),
      blockingCodes: unique([
        ...unavailable.filter((item) => item.id === "auto_send").map((item) => item.id),
        ...autoSendEvidenceMissing,
      ]),
      nextActions: autoSendBlocked
        ? unique([...billingCommands, ...envCommands])
        : autoSendEvidenceMissing.length > 0
          ? [
              "npm.cmd run test:integration -- tests/integration/enterprise-api.test.ts",
              "npm.cmd run test:smoke:auto-send-kill-switch",
            ]
          : [],
    },
    {
      id: "billing_entitlements",
      title: "Billing and entitlements",
      status: billingBlocked ? "blocked" : billingEvidenceMissingCodes.length > 0 ? "verification_gap" : "ready",
      reason: billingBlocked
        ? "Billing entitlement or feature entitlement preconditions are still unmet."
        : billingEvidenceMissingCodes.length > 0
          ? "Billing prerequisites are satisfied, but billing lifecycle evidence is missing."
          : "Billing and entitlement gates are currently satisfied with lifecycle evidence.",
      evidence: unique(
        billingBlocked
          ? [
              ...billingBlockers.flatMap((item) => item.evidence),
              ...unavailableBillingCapabilities.map((item) => item.message),
            ]
          : [
              "billing_entitlements_active_for_enterprise_capabilities",
              `billing_audit_events=${evidenceSignals.auditEvents.billing}`,
            ]
      ),
      blockingCodes: unique([
        ...billingBlockers.map((item) => item.code),
        ...unavailableBillingCapabilities
          .filter((item) => item.reason === "billing_not_active" || item.reason === "entitlement_disabled")
          .map((item) => item.id),
        ...billingEvidenceMissingCodes,
      ]),
      nextActions: billingBlocked
        ? unique(billingCommands)
        : billingEvidenceMissingCodes.length > 0
          ? ["npm.cmd run test:integration -- tests/integration/billing-api.test.ts", "npm.cmd run test:smoke:ops-readiness"]
          : [],
    },
    {
      id: "api_mcp_ga",
      title: "API and MCP GA",
      status:
        mcpBlocked
          ? "blocked"
          : mcpEvidenceMissingCodes.length > 0 || apiMcpDocsMissingCodes.length > 0
            ? "verification_gap"
            : "ready",
      reason: mcpBlocked
        ? "MCP actions remain unavailable behind flags or entitlement gates."
        : mcpEvidenceMissingCodes.length > 0
          ? "MCP capabilities are available, but MCP lifecycle evidence is missing."
          : apiMcpDocsMissingCodes.length > 0
            ? "MCP capabilities are available, but API/MCP developer documentation evidence is incomplete."
          : "MCP actions are available with lifecycle evidence under current runtime prerequisites.",
      evidence: unique(
        mcpBlocked
          ? unavailableMcpCapabilities.map((item) => item.message)
          : [
              ...capabilityStatus.capabilityStates
                .filter((item) => item.id === "mcp_actions")
                .map((item) => `${item.id}:${item.state}:${item.reason}`),
              `mcp_audit_events=${evidenceSignals.auditEvents.mcp}`,
              `api_v1_docs_present=${developerDocs.apiV1}`,
              `mcp_v1_docs_present=${developerDocs.mcpV1}`,
            ]
      ),
      blockingCodes: unique([
        ...unavailableMcpCapabilities.map((item) => item.id),
        ...mcpEvidenceMissingCodes,
        ...apiMcpDocsMissingCodes,
      ]),
      nextActions: mcpBlocked
        ? unique([...billingCommands, ...envCommands])
        : mcpEvidenceMissingCodes.length > 0 || apiMcpDocsMissingCodes.length > 0
          ? ["npm.cmd run test:smoke:mcp-conformance", "npm.cmd run test:smoke:api-mcp-docs"]
          : [],
    },
    {
      id: "data_governance_security_ops",
      title: "Data governance and security operations",
      status: governanceSignalsMissing.length === 0 ? "ready" : "verification_gap",
      reason:
        governanceSignalsMissing.length === 0
          ? "Governance and security lifecycle evidence signals are present."
          : `Governance/security evidence is incomplete: ${governanceSignalsMissing.join(", ")}.`,
      evidence: [
        `legal_hold_events=${evidenceSignals.governanceLifecycles.legalHoldEvents}`,
        `break_glass_events=${evidenceSignals.governanceLifecycles.breakGlassEvents}`,
        `deletion_events=${evidenceSignals.governanceLifecycles.deletionEvents}`,
        `deletion_proof_events=${evidenceSignals.governanceLifecycles.deletionProofEvents}`,
        `security_audit_events=${evidenceSignals.auditEvents.security}`,
      ],
      blockingCodes: governanceSignalsMissing,
      nextActions:
        governanceSignalsMissing.length === 0
          ? []
          : ["npm.cmd run test:smoke:governance-controls", "npm.cmd run test:smoke:provider-outage-chaos"],
    },
    {
      id: "enterprise_ux",
      title: "Enterprise UX and trust-state coverage",
      status: checklist.readinessMeter.completionPct === 100 ? "ready" : "blocked",
      reason:
        checklist.readinessMeter.completionPct === 100
          ? "All onboarding readiness steps are complete."
          : "Enterprise onboarding readiness steps are incomplete.",
      evidence: [
        `Onboarding readiness completion: ${checklist.readinessMeter.completionPct}% (${checklist.readinessMeter.completed}/${checklist.readinessMeter.total}).`,
      ],
      blockingCodes: checklist.steps.filter((step) => !step.complete).map((step) => step.id),
      nextActions: unique(checklist.steps.filter((step) => !step.complete).flatMap((step) => step.nextCommands)),
    },
    {
      id: "operational_readiness",
      title: "Operational readiness",
      status: board.goNoGo === "go" ? (missingOperationalDocs.length > 0 ? "verification_gap" : "ready") : "blocked",
      reason:
        board.goNoGo === "go"
          ? missingOperationalDocs.length > 0
            ? `No high/critical blockers are open, but operational evidence docs are incomplete: ${missingOperationalDocs.join(", ")}.`
            : "No high/critical operational blockers are open."
          : "Operational go/no-go remains blocked by open high/critical blockers.",
      evidence:
        board.goNoGo === "go"
          ? [
              "operational_hard_blockers=0",
              `ops_doc_slo_targets=${operationsDocs.sloTargets}`,
              `ops_doc_incident_response_runbook=${operationsDocs.incidentResponseRunbook}`,
              `ops_doc_backup_restore_drill=${operationsDocs.backupRestoreDrill}`,
              `ops_doc_queue_replay_disaster_exercise=${operationsDocs.queueReplayDisasterExercise}`,
              `ops_doc_provider_outage_chaos_exercise=${operationsDocs.providerOutageChaosExercise}`,
            ]
          : operationalSeverityEvidence,
      blockingCodes: board.goNoGo === "go" ? missingOperationalDocs : operationalBlockingCodes,
      nextActions:
        board.goNoGo === "go"
          ? missingOperationalDocs.length > 0
            ? ["npm.cmd run test:smoke:ops-drill-scripts", "npm.cmd run test:smoke:ops-readiness"]
            : []
          : unique(blockers.map((item) => item.nextCommand)),
    },
  ];
}

function buildCompliancePosture(input: {
  evidenceSignals: EnterpriseReleaseEvidenceSignals;
  procurementDocs: EnterpriseProcurementDocsPresence;
}): EnterpriseCompliancePosture {
  const { evidenceSignals, procurementDocs } = input;
  const missingEvidence = [
    procurementDocs.architectureBrief ? "" : "procurement_architecture_brief_missing",
    procurementDocs.securityQuestionnaireBaseline ? "" : "procurement_security_questionnaire_missing",
    procurementDocs.connectorScopeMatrix ? "" : "procurement_connector_scope_matrix_missing",
    procurementDocs.governanceWalkthrough ? "" : "procurement_governance_walkthrough_missing",
    evidenceSignals.auditEvents.security > 0 ? "" : "security_audit_events_missing",
    evidenceSignals.auditEvents.governance > 0 ? "" : "governance_audit_events_missing",
    evidenceSignals.governanceLifecycles.legalHoldEvents > 0 ? "" : "legal_hold_lifecycle_evidence_missing",
    evidenceSignals.governanceLifecycles.breakGlassEvents > 0 ? "" : "break_glass_lifecycle_evidence_missing",
    evidenceSignals.governanceLifecycles.deletionEvents > 0 ? "" : "deletion_lifecycle_evidence_missing",
  ].filter((item) => item.length > 0);

  return {
    certificationClaim: "not_claimed",
    soc2ReadinessStatus: missingEvidence.length === 0 ? "controls_evidenced" : "evidence_incomplete",
    message:
      missingEvidence.length === 0
        ? "SOC2-ready evidence posture is present for tracked controls; no certification claim is asserted."
        : `SOC2-ready evidence posture is incomplete for tracked controls: ${missingEvidence.join(", ")}.`,
    procurementDocs,
    evidence: {
      securityAuditEvents: evidenceSignals.auditEvents.security,
      governanceAuditEvents: evidenceSignals.auditEvents.governance,
      legalHoldLifecycleEvents: evidenceSignals.governanceLifecycles.legalHoldEvents,
      breakGlassLifecycleEvents: evidenceSignals.governanceLifecycles.breakGlassEvents,
      deletionLifecycleEvents: evidenceSignals.governanceLifecycles.deletionEvents,
    },
    missingEvidence,
  };
}

function mapDomainStatusToRequirementStatus(
  status: EnterpriseReleaseDomainAssessment["status"]
): EnterpriseClosureRequirementStatus {
  if (status === "ready") return "proved";
  if (status === "blocked") return "blocked";
  return "incomplete";
}

function inferEvidenceQuality(input: {
  status: EnterpriseClosureRequirementStatus;
  evidenceSources: string[];
  directProof: boolean;
}): EnterpriseClosureEvidenceQuality {
  const hasEvidence = input.evidenceSources.some((item) => item.length > 0);
  if (!hasEvidence) {
    return "missing";
  }
  if (input.directProof && input.status === "proved") {
    return "direct";
  }
  return "indirect";
}

function buildClosureAudit(input: {
  generatedAt: string;
  domainAssessments: EnterpriseReleaseDomainAssessment[];
  compliancePosture: EnterpriseCompliancePosture;
  capabilityStatus: EnterpriseCapabilityStatus;
  evidenceSignals: EnterpriseReleaseEvidenceSignals;
}): EnterpriseClosureAudit {
  const requirementItems: EnterpriseClosureRequirementAuditItem[] = input.domainAssessments.map((domain) => {
    const status = mapDomainStatusToRequirementStatus(domain.status);
    const evidenceSources = domain.evidence;
    return {
      id: domain.id,
      title: domain.title,
      status,
      evidenceQuality: inferEvidenceQuality({
        status,
        evidenceSources,
        directProof: true,
      }),
      evidenceSources,
      gaps: domain.blockingCodes,
      nextActions: domain.nextActions,
    };
  });

  const soc2Status: EnterpriseClosureRequirementStatus =
    input.compliancePosture.soc2ReadinessStatus === "controls_evidenced" ? "proved" : "incomplete";
  const soc2EvidenceSources = [
    `security_audit_events=${input.compliancePosture.evidence.securityAuditEvents}`,
    `governance_audit_events=${input.compliancePosture.evidence.governanceAuditEvents}`,
    `legal_hold_events=${input.compliancePosture.evidence.legalHoldLifecycleEvents}`,
    `break_glass_events=${input.compliancePosture.evidence.breakGlassLifecycleEvents}`,
    `deletion_events=${input.compliancePosture.evidence.deletionLifecycleEvents}`,
  ];
  requirementItems.push({
    id: "soc2_ready_architecture_evidence",
    title: "SOC2-ready architecture and evidence posture (without certification claim)",
    status: soc2Status,
    evidenceQuality: inferEvidenceQuality({
      status: soc2Status,
      evidenceSources: soc2EvidenceSources,
      directProof: true,
    }),
    evidenceSources: soc2EvidenceSources,
    gaps: input.compliancePosture.missingEvidence,
    nextActions:
      input.compliancePosture.soc2ReadinessStatus === "controls_evidenced"
        ? []
        : ["npm.cmd run test:smoke:governance-controls", "npm.cmd run test:smoke:ops-readiness"],
  });

  const noUnsupportedClaimStatus: EnterpriseClosureRequirementStatus =
    input.compliancePosture.certificationClaim === "not_claimed" ? "proved" : "blocked";
  const noUnsupportedClaimEvidenceSources = [
    `certification_claim=${input.compliancePosture.certificationClaim}`,
  ];
  requirementItems.push({
    id: "no_unsupported_certification_claims",
    title: "No unsupported certification claims",
    status: noUnsupportedClaimStatus,
    evidenceQuality: inferEvidenceQuality({
      status: noUnsupportedClaimStatus,
      evidenceSources: noUnsupportedClaimEvidenceSources,
      directProof: true,
    }),
    evidenceSources: noUnsupportedClaimEvidenceSources,
    gaps: input.compliancePosture.certificationClaim === "not_claimed" ? [] : ["unsupported_certification_claim"],
    nextActions: [],
  });

  const unavailableConnectorCapabilities = input.capabilityStatus.capabilityStates.filter(
    (item) => item.id.startsWith("connector_") && item.state === "unavailable"
  );
  const unavailableMcpCapabilities = input.capabilityStatus.capabilityStates.filter(
    (item) => item.id === "mcp_actions" && item.state === "unavailable"
  );
  const unavailableAutoSendCapabilities = input.capabilityStatus.capabilityStates.filter(
    (item) => item.id === "auto_send" && item.state === "unavailable"
  );
  const unavailableScimCapabilities = input.capabilityStatus.capabilityStates.filter(
    (item) => item.id === "scim_write" && item.state === "unavailable"
  );
  const unavailableSamlCapabilities = input.capabilityStatus.capabilityStates.filter(
    (item) => item.id === "saml_sso" && item.state === "unavailable"
  );
  const connectorRuntimeDenials = input.evidenceSignals.runtimeDenials?.connectorUnavailable ?? 0;
  const mcpRuntimeDenials = input.evidenceSignals.runtimeDenials?.mcpUnavailable ?? 0;
  const autoSendRuntimeDenials = input.evidenceSignals.runtimeDenials?.autoSendUnavailable ?? 0;
  const scimRuntimeDenials = input.evidenceSignals.runtimeDenials?.scimWriteUnavailable ?? 0;
  const samlRuntimeDenials = input.evidenceSignals.runtimeDenials?.samlSsoUnavailable ?? 0;
  const runtimeDeniedCapabilityIds = new Set(input.evidenceSignals.runtimeDenials?.capabilityIds ?? []);
  const runtimeDeniedReasonsByCapability = new Map<string, Set<string>>();
  for (const entry of input.evidenceSignals.runtimeDenials?.entries ?? []) {
    if (entry.reason === null) {
      continue;
    }
    const existing = runtimeDeniedReasonsByCapability.get(entry.capabilityId) ?? new Set<string>();
    existing.add(entry.reason);
    runtimeDeniedReasonsByCapability.set(entry.capabilityId, existing);
  }
  const missingRuntimeDenialProofConnectorIds = unavailableConnectorCapabilities
    .map((item) => item.id)
    .filter((id) => !runtimeDeniedCapabilityIds.has(id));
  const missingRuntimeDenialProofMcpIds = unavailableMcpCapabilities
    .map((item) => item.id)
    .filter((id) => !runtimeDeniedCapabilityIds.has(id));
  const missingRuntimeDenialProofAutoSendIds = unavailableAutoSendCapabilities
    .map((item) => item.id)
    .filter((id) => !runtimeDeniedCapabilityIds.has(id));
  const missingRuntimeDenialProofScimIds = unavailableScimCapabilities
    .map((item) => item.id)
    .filter((id) => !runtimeDeniedCapabilityIds.has(id));
  const missingRuntimeDenialProofSamlIds = unavailableSamlCapabilities
    .map((item) => item.id)
    .filter((id) => !runtimeDeniedCapabilityIds.has(id));
  const missingRuntimeDenialReasonProofConnectorIds = unavailableConnectorCapabilities
    .filter((item) => !runtimeDeniedReasonsByCapability.get(item.id)?.has(item.reason))
    .map((item) => item.id);
  const missingRuntimeDenialReasonProofMcpIds = unavailableMcpCapabilities
    .filter((item) => !runtimeDeniedReasonsByCapability.get(item.id)?.has(item.reason))
    .map((item) => item.id);
  const missingRuntimeDenialReasonProofAutoSendIds = unavailableAutoSendCapabilities
    .filter((item) => !runtimeDeniedReasonsByCapability.get(item.id)?.has(item.reason))
    .map((item) => item.id);
  const missingRuntimeDenialReasonProofScimIds = unavailableScimCapabilities
    .filter((item) => !runtimeDeniedReasonsByCapability.get(item.id)?.has(item.reason))
    .map((item) => item.id);
  const missingRuntimeDenialReasonProofSamlIds = unavailableSamlCapabilities
    .filter((item) => !runtimeDeniedReasonsByCapability.get(item.id)?.has(item.reason))
    .map((item) => item.id);
  const unsupportedCapabilityLabelingComplete = input.capabilityStatus.capabilityStates.every(
    (item) => item.reason.length > 0 && item.message.length > 0
  );
  const runtimeDisableProofForUnavailableConnectors =
    missingRuntimeDenialProofConnectorIds.length === 0 && missingRuntimeDenialReasonProofConnectorIds.length === 0;
  const runtimeDisableProofForUnavailableMcp =
    missingRuntimeDenialProofMcpIds.length === 0 && missingRuntimeDenialReasonProofMcpIds.length === 0;
  const runtimeDisableProofForUnavailableAutoSend =
    missingRuntimeDenialProofAutoSendIds.length === 0 && missingRuntimeDenialReasonProofAutoSendIds.length === 0;
  const runtimeDisableProofForUnavailableScim =
    missingRuntimeDenialProofScimIds.length === 0 && missingRuntimeDenialReasonProofScimIds.length === 0;
  const runtimeDisableProofForUnavailableSaml =
    missingRuntimeDenialProofSamlIds.length === 0 && missingRuntimeDenialReasonProofSamlIds.length === 0;
  const runtimeDisabledUnsupportedCapabilitiesProved =
    unsupportedCapabilityLabelingComplete &&
    runtimeDisableProofForUnavailableConnectors &&
    runtimeDisableProofForUnavailableMcp &&
    runtimeDisableProofForUnavailableAutoSend &&
    runtimeDisableProofForUnavailableScim &&
    runtimeDisableProofForUnavailableSaml;

  const runtimeDisabledUnsupportedCapabilitiesStatus: EnterpriseClosureRequirementStatus =
    runtimeDisabledUnsupportedCapabilitiesProved ? "proved" : "incomplete";
  const runtimeDisabledUnsupportedCapabilitiesEvidenceSources = input.capabilityStatus.capabilityStates.map(
    (item) => `${item.id}:${item.state}:${item.reason}`
  );
  requirementItems.push({
    id: "runtime_disabled_unsupported_capabilities",
    title: "Unsupported capabilities are runtime-disabled and labeled unavailable",
    status: runtimeDisabledUnsupportedCapabilitiesStatus,
    evidenceQuality: inferEvidenceQuality({
      status: runtimeDisabledUnsupportedCapabilitiesStatus,
      evidenceSources: runtimeDisabledUnsupportedCapabilitiesEvidenceSources,
      directProof: true,
    }),
    evidenceSources: [
      ...runtimeDisabledUnsupportedCapabilitiesEvidenceSources,
      `connector_unavailable_capabilities=${unavailableConnectorCapabilities.length}`,
      `connector_runtime_denials=${connectorRuntimeDenials}`,
      `mcp_unavailable_capabilities=${unavailableMcpCapabilities.length}`,
      `mcp_runtime_denials=${mcpRuntimeDenials}`,
      `auto_send_unavailable_capabilities=${unavailableAutoSendCapabilities.length}`,
      `auto_send_runtime_denials=${autoSendRuntimeDenials}`,
      `scim_unavailable_capabilities=${unavailableScimCapabilities.length}`,
      `scim_runtime_denials=${scimRuntimeDenials}`,
      `saml_unavailable_capabilities=${unavailableSamlCapabilities.length}`,
      `saml_runtime_denials=${samlRuntimeDenials}`,
      `runtime_denial_capability_ids=${Array.from(runtimeDeniedCapabilityIds).sort().join(",") || "none"}`,
      `runtime_denial_reason_entries=${Array.from(runtimeDeniedReasonsByCapability.entries())
        .map(([capabilityId, reasons]) => `${capabilityId}:${Array.from(reasons).sort().join("&")}`)
        .sort()
        .join(",") || "none"}`,
    ],
    gaps: runtimeDisabledUnsupportedCapabilitiesProved
      ? []
      : [
          ...(unsupportedCapabilityLabelingComplete ? [] : ["capability_reason_or_message_missing"]),
          ...(runtimeDisableProofForUnavailableConnectors
            ? []
            : [
                "connector_runtime_disable_proof_missing",
                ...unique(
                  missingRuntimeDenialProofConnectorIds.map((id) => `connector_runtime_disable_proof_missing_${id}`)
                ),
                ...(missingRuntimeDenialReasonProofConnectorIds.length === 0
                  ? []
                  : [
                      "connector_runtime_disable_reason_mismatch",
                      ...unique(
                        missingRuntimeDenialReasonProofConnectorIds.map(
                          (id) => `connector_runtime_disable_reason_mismatch_${id}`
                        )
                      ),
                    ]),
              ]),
          ...(runtimeDisableProofForUnavailableMcp
            ? []
            : [
                "mcp_runtime_disable_proof_missing",
                ...unique(missingRuntimeDenialProofMcpIds.map((id) => `mcp_runtime_disable_proof_missing_${id}`)),
                ...(missingRuntimeDenialReasonProofMcpIds.length === 0
                  ? []
                  : [
                      "mcp_runtime_disable_reason_mismatch",
                      ...unique(
                        missingRuntimeDenialReasonProofMcpIds.map((id) => `mcp_runtime_disable_reason_mismatch_${id}`)
                      ),
                    ]),
              ]),
          ...(runtimeDisableProofForUnavailableAutoSend
            ? []
            : [
                "auto_send_runtime_disable_proof_missing",
                ...unique(
                  missingRuntimeDenialProofAutoSendIds.map((id) => `auto_send_runtime_disable_proof_missing_${id}`)
                ),
                ...(missingRuntimeDenialReasonProofAutoSendIds.length === 0
                  ? []
                  : [
                      "auto_send_runtime_disable_reason_mismatch",
                      ...unique(
                        missingRuntimeDenialReasonProofAutoSendIds.map(
                          (id) => `auto_send_runtime_disable_reason_mismatch_${id}`
                        )
                      ),
                    ]),
              ]),
          ...(runtimeDisableProofForUnavailableScim
            ? []
            : [
                "scim_runtime_disable_proof_missing",
                ...unique(missingRuntimeDenialProofScimIds.map((id) => `scim_runtime_disable_proof_missing_${id}`)),
                ...(missingRuntimeDenialReasonProofScimIds.length === 0
                  ? []
                  : [
                      "scim_runtime_disable_reason_mismatch",
                      ...unique(
                        missingRuntimeDenialReasonProofScimIds.map((id) => `scim_runtime_disable_reason_mismatch_${id}`)
                      ),
                    ]),
              ]),
          ...(runtimeDisableProofForUnavailableSaml
            ? []
            : [
                "saml_runtime_disable_proof_missing",
                ...unique(missingRuntimeDenialProofSamlIds.map((id) => `saml_runtime_disable_proof_missing_${id}`)),
                ...(missingRuntimeDenialReasonProofSamlIds.length === 0
                  ? []
                  : [
                      "saml_runtime_disable_reason_mismatch",
                      ...unique(
                        missingRuntimeDenialReasonProofSamlIds.map((id) => `saml_runtime_disable_reason_mismatch_${id}`)
                      ),
                    ]),
              ]),
        ],
    nextActions: runtimeDisabledUnsupportedCapabilitiesProved
      ? []
      : [
          "npm.cmd run test:integration -- tests/integration/enterprise-status-capabilities.test.ts",
          "npm.cmd run test:integration -- tests/integration/scim-bulk-audit.test.ts",
          "npm.cmd run test:integration -- tests/integration/saml-auth-lifecycle.test.ts",
          "npm.cmd run test:smoke:mcp-conformance",
          "npm.cmd run test:integration -- tests/integration/enterprise-release-decision.test.ts",
        ],
  });

  const hasConnectorUnavailabilityLabeling = input.capabilityStatus.capabilityStates
    .filter((item) => item.id.startsWith("connector_"))
    .every((item) => item.reason.length > 0 && item.message.length > 0);
  const connectorCapabilityTruthful = input.capabilityStatus.capabilityStates
    .filter((item) => item.id.startsWith("connector_"))
    .every((item) => {
      if (item.state === "available") {
        return item.reason === "enabled";
      }
      return item.reason !== "enabled";
    });
  const noFakeDataIntegrationsProved =
    hasConnectorUnavailabilityLabeling && connectorCapabilityTruthful;
  const governanceControlsEvidenced = input.compliancePosture.soc2ReadinessStatus === "controls_evidenced";

  const noFakeDataStatus: EnterpriseClosureRequirementStatus = noFakeDataIntegrationsProved
    ? "proved"
    : "blocked";
  const noFakeDataEvidenceSources = [
    "Connector capability states include explicit unavailable reasons/messages.",
    "Connector capability states fail closed unless runtime prerequisites are met.",
    ...input.capabilityStatus.capabilityStates
      .filter((item) => item.id.startsWith("connector_"))
      .map((item) => `${item.id}:${item.state}:${item.reason}`),
  ];
  requirementItems.push({
    id: "non_negotiable_no_fake_data_integrations",
    title: "Non-negotiable: no fake data or fake integrations",
    status: noFakeDataStatus,
    evidenceQuality: inferEvidenceQuality({
      status: noFakeDataStatus,
      evidenceSources: noFakeDataEvidenceSources,
      directProof: true,
    }),
    evidenceSources: noFakeDataEvidenceSources,
    gaps: noFakeDataIntegrationsProved
      ? []
      : [
          ...(hasConnectorUnavailabilityLabeling
            ? []
            : ["connector_unavailability_labeling_incomplete"]),
          ...(connectorCapabilityTruthful
            ? []
            : ["connector_capability_truthfulness_violation"]),
        ],
    nextActions: noFakeDataIntegrationsProved
      ? []
      : ["npm.cmd run test:smoke:connector-providers", "npm.cmd run test:smoke:ops-readiness"],
  });

  const hasGovernanceLifecycleEvidence =
    input.compliancePosture.evidence.legalHoldLifecycleEvents > 0 &&
    input.compliancePosture.evidence.breakGlassLifecycleEvents > 0 &&
    input.compliancePosture.evidence.deletionLifecycleEvents > 0;
  const hasDeletionProofEvidence = input.evidenceSignals.governanceLifecycles.deletionProofEvents > 0;
  const sourceUploadedEvents = input.evidenceSignals.permissionedIngestionLifecycles.sourceUploadedEvents;
  const sourceProcessRequestedEvents =
    input.evidenceSignals.permissionedIngestionLifecycles.sourceProcessRequestedEvents;
  const sourceReprocessRequestedEvents =
    input.evidenceSignals.permissionedIngestionLifecycles.sourceReprocessRequestedEvents;
  const hasSourceLifecycleEvidence =
    sourceUploadedEvents > 0 && (sourceProcessRequestedEvents > 0 || sourceReprocessRequestedEvents > 0);
  const permissionedIngestionProved =
    governanceControlsEvidenced &&
    hasGovernanceLifecycleEvidence &&
    connectorCapabilityTruthful &&
    hasSourceLifecycleEvidence;
  const permissionedIngestionStatus: EnterpriseClosureRequirementStatus = permissionedIngestionProved
    ? "proved"
    : hasGovernanceLifecycleEvidence || hasSourceLifecycleEvidence
      ? "incomplete"
      : "blocked";
  const permissionedIngestionEvidenceSources = [
    `legal_hold_events=${input.compliancePosture.evidence.legalHoldLifecycleEvents}`,
    `break_glass_events=${input.compliancePosture.evidence.breakGlassLifecycleEvents}`,
    `deletion_events=${input.compliancePosture.evidence.deletionLifecycleEvents}`,
    `source_uploaded_events=${sourceUploadedEvents}`,
    `source_process_requested_events=${sourceProcessRequestedEvents}`,
    `source_reprocess_requested_events=${sourceReprocessRequestedEvents}`,
    "Governance and deletion APIs are present and exercised in smoke/integration tests.",
  ];
  requirementItems.push({
    id: "non_negotiable_permissioned_ingestion",
    title: "Non-negotiable: permissioned ingestion and authorized source access",
    status: permissionedIngestionStatus,
    evidenceQuality: inferEvidenceQuality({
      status: permissionedIngestionStatus,
      evidenceSources: permissionedIngestionEvidenceSources,
      directProof: true,
    }),
    evidenceSources: permissionedIngestionEvidenceSources,
    gaps: permissionedIngestionProved
      ? []
      : [
          ...(hasGovernanceLifecycleEvidence ? [] : ["governance_lifecycle_evidence_missing"]),
          ...(governanceControlsEvidenced ? [] : ["soc2_controls_evidence_missing"]),
          ...(connectorCapabilityTruthful ? [] : ["connector_truthfulness_incomplete"]),
          ...(sourceUploadedEvents > 0 ? [] : ["source_upload_lifecycle_evidence_missing"]),
          ...(sourceProcessRequestedEvents > 0 || sourceReprocessRequestedEvents > 0
            ? []
            : ["source_processing_lifecycle_evidence_missing"]),
        ],
    nextActions: permissionedIngestionProved
      ? []
      : [
          "npm.cmd run test:smoke:governance-controls",
          "npm.cmd run test:integration -- tests/integration/phase2-product-depth-api.test.ts",
          "npm.cmd run test:integration -- tests/integration/sources-api.test.ts",
        ],
  });

  const humanGovernanceSignalsPresent =
    input.compliancePosture.evidence.legalHoldLifecycleEvents > 0 ||
    input.compliancePosture.evidence.breakGlassLifecycleEvents > 0 ||
    input.compliancePosture.evidence.deletionLifecycleEvents > 0;
  const autoSendCapabilityExplicit = input.capabilityStatus.capabilityStates.some(
    (item) => item.id === "auto_send" && item.reason.length > 0 && item.message.length > 0
  );
  const approvalBoundaryEvidencePresent =
    input.evidenceSignals.autoSend.approvalRuleEvents > 0 &&
    input.evidenceSignals.autoSend.decisionEvents > 0;
  const humanGovernanceProved =
    humanGovernanceSignalsPresent && autoSendCapabilityExplicit && approvalBoundaryEvidencePresent;
  const humanGovernanceStatus: EnterpriseClosureRequirementStatus = humanGovernanceProved
    ? "proved"
    : humanGovernanceSignalsPresent || autoSendCapabilityExplicit
      ? "incomplete"
      : "blocked";
  const humanGovernanceEvidenceSources = [
    `legal_hold_events=${input.compliancePosture.evidence.legalHoldLifecycleEvents}`,
    `break_glass_events=${input.compliancePosture.evidence.breakGlassLifecycleEvents}`,
    `deletion_events=${input.compliancePosture.evidence.deletionLifecycleEvents}`,
    `approval_rule_events=${input.evidenceSignals.autoSend.approvalRuleEvents}`,
    `auto_send_decision_events=${input.domainAssessments.find((item) => item.id === "approval_auto_send_governance")?.evidence.find((entry) => entry.startsWith("auto_send_decision_events=")) ?? "auto_send_decision_events=0"}`,
  ];
  requirementItems.push({
    id: "non_negotiable_human_governance",
    title: "Non-negotiable: human governance and approval boundaries",
    status: humanGovernanceStatus,
    evidenceQuality: inferEvidenceQuality({
      status: humanGovernanceStatus,
      evidenceSources: humanGovernanceEvidenceSources,
      directProof: true,
    }),
    evidenceSources: humanGovernanceEvidenceSources,
    gaps: humanGovernanceProved
      ? []
      : humanGovernanceSignalsPresent
        ? approvalBoundaryEvidencePresent
          ? ["live_approval_workflow_evidence_missing"]
          : ["approval_boundary_lifecycle_evidence_missing"]
        : autoSendCapabilityExplicit
          ? ["governance_lifecycle_evidence_missing"]
          : ["human_governance_event_evidence_missing"],
    nextActions: humanGovernanceProved
      ? []
      : ["npm.cmd run test:smoke:auto-send-kill-switch", "npm.cmd run test:smoke:governance-controls"],
  });

  const customerOwnedDataPostureProved = governanceControlsEvidenced && hasGovernanceLifecycleEvidence;
  const customerOwnedDataPostureWithProofProved =
    customerOwnedDataPostureProved && hasDeletionProofEvidence;
  const customerOwnedDataPostureStatus: EnterpriseClosureRequirementStatus = customerOwnedDataPostureProved
    ? customerOwnedDataPostureWithProofProved
      ? "proved"
      : "incomplete"
    : governanceControlsEvidenced || hasGovernanceLifecycleEvidence
      ? "incomplete"
      : "blocked";
  const customerOwnedDataPostureEvidenceSources = [
    ...input.compliancePosture.missingEvidence.map((item) => `missing:${item}`),
    `deletion_proof_events=${input.evidenceSignals.governanceLifecycles.deletionProofEvents}`,
    "Deletion/legal-hold lifecycle APIs and audit-event logging are implemented.",
  ];
  requirementItems.push({
    id: "non_negotiable_customer_owned_data_posture",
    title: "Non-negotiable: customer-owned data posture and deletion controls",
    status: customerOwnedDataPostureStatus,
    evidenceQuality: inferEvidenceQuality({
      status: customerOwnedDataPostureStatus,
      evidenceSources: customerOwnedDataPostureEvidenceSources,
      directProof: true,
    }),
    evidenceSources: customerOwnedDataPostureEvidenceSources,
    gaps: customerOwnedDataPostureWithProofProved
      ? []
      : governanceControlsEvidenced
        ? hasDeletionProofEvidence
          ? ["customer_runtime_data_isolation_proof_missing"]
          : ["deletion_proof_evidence_missing"]
        : hasGovernanceLifecycleEvidence
          ? ["soc2_control_evidence_incomplete"]
          : ["soc2_control_evidence_incomplete"],
    nextActions: customerOwnedDataPostureProved
      ? []
      : ["npm.cmd run test:smoke:governance-controls", "npm.cmd run test:smoke:ops-readiness"],
  });

  const domainsMissingEvidence = input.domainAssessments
    .filter((item) => item.evidence.length === 0)
    .map((item) => item.id);
  const nonReadyDomainsMissingBlockingCodes = input.domainAssessments
    .filter((item) => item.status !== "ready" && item.blockingCodes.length === 0)
    .map((item) => item.id);
  const nonReadyDomainsMissingNextActions = input.domainAssessments
    .filter((item) => item.status !== "ready" && item.nextActions.length === 0)
    .map((item) => item.id);
  const requirementsMissingEvidence = requirementItems
    .filter((item) => item.evidenceSources.length === 0)
    .map((item) => item.id);
  const nonProvedRequirementsMissingGaps = requirementItems
    .filter((item) => item.status !== "proved" && item.gaps.length === 0)
    .map((item) => item.id);
  const nonProvedRequirementsMissingNextActions = requirementItems
    .filter((item) => item.status !== "proved" && item.nextActions.length === 0)
    .map((item) => item.id);
  const evidenceFirstOutputsProved =
    domainsMissingEvidence.length === 0 &&
    nonReadyDomainsMissingBlockingCodes.length === 0 &&
    nonReadyDomainsMissingNextActions.length === 0 &&
    requirementsMissingEvidence.length === 0 &&
    nonProvedRequirementsMissingGaps.length === 0 &&
    nonProvedRequirementsMissingNextActions.length === 0;
  const evidenceFirstOutputStatus: EnterpriseClosureRequirementStatus = evidenceFirstOutputsProved
    ? "proved"
    : "incomplete";

  requirementItems.push({
    id: "non_negotiable_evidence_first_outputs",
    title: "Non-negotiable: evidence-first outputs with explicit gaps and next actions",
    status: evidenceFirstOutputStatus,
    evidenceQuality: inferEvidenceQuality({
      status: evidenceFirstOutputStatus,
      evidenceSources: [
        `domain_count=${input.domainAssessments.length}`,
        `closure_requirement_count_before_evidence_check=${requirementItems.length}`,
      ],
      directProof: true,
    }),
    evidenceSources: [
      `domain_count=${input.domainAssessments.length}`,
      `closure_requirement_count_before_evidence_check=${requirementItems.length}`,
      `domains_missing_evidence=${domainsMissingEvidence.length}`,
      `non_ready_domains_missing_blocking_codes=${nonReadyDomainsMissingBlockingCodes.length}`,
      `non_ready_domains_missing_next_actions=${nonReadyDomainsMissingNextActions.length}`,
      `requirements_missing_evidence=${requirementsMissingEvidence.length}`,
      `non_proved_requirements_missing_gaps=${nonProvedRequirementsMissingGaps.length}`,
      `non_proved_requirements_missing_next_actions=${nonProvedRequirementsMissingNextActions.length}`,
    ],
    gaps: evidenceFirstOutputsProved
      ? []
      : [
          ...unique(domainsMissingEvidence.map((id) => `domain_evidence_missing_${id}`)),
          ...(nonReadyDomainsMissingBlockingCodes.length === 0
            ? []
            : [
                "domain_blocking_codes_missing",
                ...unique(
                  nonReadyDomainsMissingBlockingCodes.map((id) => `domain_blocking_codes_missing_${id}`)
                ),
              ]),
          ...(nonReadyDomainsMissingNextActions.length === 0
            ? []
            : [
                "domain_next_actions_missing",
                ...unique(nonReadyDomainsMissingNextActions.map((id) => `domain_next_actions_missing_${id}`)),
              ]),
          ...unique(requirementsMissingEvidence.map((id) => `requirement_evidence_missing_${id}`)),
          ...(nonProvedRequirementsMissingGaps.length === 0
            ? []
            : [
                "requirement_gaps_missing",
                ...unique(nonProvedRequirementsMissingGaps.map((id) => `requirement_gaps_missing_${id}`)),
              ]),
          ...(nonProvedRequirementsMissingNextActions.length === 0
            ? []
            : [
                "requirement_next_actions_missing",
                ...unique(
                  nonProvedRequirementsMissingNextActions.map((id) => `requirement_next_actions_missing_${id}`)
                ),
              ]),
        ],
    nextActions: evidenceFirstOutputsProved
      ? []
      : [
          "npm.cmd run test -- tests/unit/release-decision.test.ts",
          "npm.cmd run test:integration -- tests/integration/enterprise-release-decision.test.ts",
          "npm.cmd run test:smoke:release-decision-completion-audit",
        ],
  });

  return {
    generatedAt: input.generatedAt,
    summary: {
      total: requirementItems.length,
      proved: requirementItems.filter((item) => item.status === "proved").length,
      blocked: requirementItems.filter((item) => item.status === "blocked").length,
      incomplete: requirementItems.filter((item) => item.status === "incomplete").length,
    },
    requirements: requirementItems,
  };
}

function objectiveCoverageScopeForRequirement(
  requirementId: EnterpriseClosureRequirementAuditItem["id"]
): EnterpriseObjectiveCoverageScope {
  const domainRequirementIds = new Set<EnterpriseReleaseDomainAssessment["id"]>([
    "reliability_control_plane",
    "iam_saml_scim_rbac_audit",
    "provider_deep_connectors",
    "intelligence_hardening",
    "approval_auto_send_governance",
    "billing_entitlements",
    "api_mcp_ga",
    "data_governance_security_ops",
    "enterprise_ux",
    "operational_readiness",
  ]);
  if (domainRequirementIds.has(requirementId as EnterpriseReleaseDomainAssessment["id"])) {
    return "domain";
  }
  if (
    requirementId === "soc2_ready_architecture_evidence" ||
    requirementId === "no_unsupported_certification_claims"
  ) {
    return "compliance";
  }
  if (requirementId === "runtime_disabled_unsupported_capabilities") {
    return "runtime_safety";
  }
  return "non_negotiable";
}

function buildObjectiveCoverage(closureAudit: EnterpriseClosureAudit): EnterpriseObjectiveCoverageItem[] {
  return closureAudit.requirements.map((requirement) => ({
    id: requirement.id,
    title: requirement.title,
    scope: objectiveCoverageScopeForRequirement(requirement.id),
    status: requirement.status,
    evidenceSources: requirement.evidenceSources,
    gaps: requirement.gaps,
    nextActions: requirement.nextActions,
  }));
}

export function buildEnterpriseReleaseDecision(input: {
  board: ReadinessBoard;
  checklist: EnterpriseOnboardingChecklist;
  capabilityStatus: EnterpriseCapabilityStatus;
  evidenceSignals: EnterpriseReleaseEvidenceSignals;
  procurementDocs: EnterpriseProcurementDocsPresence;
  connectors: ConnectorRecord[];
  developerDocs: {
    apiV1: boolean;
    mcpV1: boolean;
  };
  operationsDocs: {
    sloTargets: boolean;
    incidentResponseRunbook: boolean;
    backupRestoreDrill: boolean;
    queueReplayDisasterExercise: boolean;
    providerOutageChaosExercise: boolean;
  };
}): EnterpriseReleaseDecision {
  const { board, checklist, capabilityStatus, evidenceSignals } = input;
  const unavailableCapabilities = capabilityStatus.capabilityStates.filter((item) => item.state === "unavailable");
  const domainAssessments = buildDomainAssessments(input);
  const compliancePosture = buildCompliancePosture(input);
  const closureAudit = buildClosureAudit({
    generatedAt: board.generatedAt,
    domainAssessments,
    compliancePosture,
    capabilityStatus,
    evidenceSignals,
  });
  const objectiveCoverage = buildObjectiveCoverage(closureAudit);
  const decision: ReadinessBoard["goNoGo"] =
    board.goNoGo === "go" &&
    closureAudit.summary.blocked === 0 &&
    closureAudit.summary.incomplete === 0
      ? "go"
      : "no_go";
  const aggregatedNextActions = unique([
    ...board.blockers.map((item) => item.nextCommand),
    ...checklist.steps.flatMap((step) => step.nextCommands),
    ...domainAssessments.flatMap((item) => item.nextActions),
  ]);

  return {
    generatedAt: board.generatedAt,
    decision,
    summary: {
      hardBlockerCount: board.hardBlockerCount,
      blockerCount: board.blockers.length,
      readinessCompletionPct: checklist.readinessMeter.completionPct,
      unavailableCapabilityCount: unavailableCapabilities.length,
      blockedDomainCount: domainAssessments.filter((item) => item.status === "blocked").length,
      verificationGapDomainCount: domainAssessments.filter((item) => item.status === "verification_gap").length,
    },
    nextActions: decision === "go" ? [] : aggregatedNextActions,
    evidenceSignals,
    compliancePosture,
    closureAudit,
    objectiveCoverage,
    readinessBoard: board,
    onboardingChecklist: checklist,
    capabilityStatus,
    unavailableCapabilities: unavailableCapabilities.map((item) => ({
      id: item.id,
      reason: item.reason,
      message: item.message,
    })),
    domainAssessments,
  };
}
