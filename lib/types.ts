export type ProcessingStatus = "uploaded" | "extracting" | "extracted" | "failed";
export type ReviewStatus =
  | "suggested"
  | "approved"
  | "rejected"
  | "needs_review"
  | "outdated"
  | "weak"
  | "blocked";
export type Severity = "low" | "medium" | "high" | "critical";
export type JobType =
  | "source_extraction"
  | "draft_evaluation"
  | "export_generation"
  | "invite_delivery"
  | "connector_sync"
  | "webhook_delivery"
  | "auto_send";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "dead_letter";
export type AppRole = "owner" | "admin" | "reviewer" | "analyst" | "member";
export type AdminCapability =
  | "connector-admin"
  | "billing-admin"
  | "compliance-admin"
  | "api-admin";

export type Organisation = {
  id: string;
  name: string;
  industry: string | null;
  riskTolerance: string;
  autoSendAllowed: boolean;
  createdAt: string;
};

export type OrganisationSettings = {
  organisationId: string;
  defaultTone: string;
  pricingApprovalThreshold: number;
  refundApprovalThreshold: number;
  dataRetentionDays: number;
  modelProvider: string;
  createdAt: string;
  updatedAt: string;
};

export type AppUser = {
  id: string;
  organisationId: string;
  email: string;
  name: string | null;
  role: AppRole;
  createdAt: string;
};

export type MemberInvite = {
  id: string;
  organisationId: string;
  email: string;
  role: AppRole;
  inviteToken: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string | null;
  expiresAt: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

export type Source = {
  id: string;
  organisationId: string;
  title: string;
  sourceType: string;
  authorityLevel: string | null;
  fileUrl: string | null;
  rawText: string | null;
  processingStatus: ProcessingStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SourceChunk = {
  id: string;
  organisationId: string;
  sourceId: string;
  chunkIndex: number;
  chunkText: string;
  chunkType: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type TerminologyPattern = {
  id: string;
  organisationId: string;
  phrase: string;
  normalisedPhrase: string;
  frequency: number;
  scenarioId: string | null;
  status: ReviewStatus;
  recommendation: string | null;
  sourceEvidence: Array<{ sourceId: string; chunkIndex?: number }>;
  outcomeSignal: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type ExtractedPolicy = {
  id: string;
  organisationId: string;
  name: string;
  ruleType: string;
  description: string;
  severity: Severity;
  status: ReviewStatus;
  structuredRule: Record<string, unknown>;
  sourceEvidence: Array<{ sourceId: string; chunkIndex?: number }>;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type Scenario = {
  id: string;
  organisationId: string;
  name: string;
  category: string;
  description: string;
  riskLevel: string;
  triggerPhrases: string[];
  approvedResponseFlow: string[];
  forbiddenBehaviours: string[];
  evaluationRubric: Record<string, number>;
  createdAt: string;
};

export type Conflict = {
  id: string;
  organisationId: string;
  conflictType: string;
  severity: Severity;
  manualRule: string;
  historicalPattern: string;
  recommendedResolution: string;
  status: ReviewStatus;
  evidence: Array<{ sourceId: string; details: string }>;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type SourceStats = {
  policyCount: number;
  phraseCount: number;
  scenarioCount: number;
};

export type SourceWithStats = Source & SourceStats;

export type EvaluationRecord = {
  id: string;
  organisationId: string;
  scenarioId: string | null;
  inputMessage: string;
  originalDraft: string;
  repairedDraft: string | null;
  detectedPhrases: string[];
  missingRequiredElements: string[];
  policyViolations: string[];
  scores: {
    total: number;
    policyCompliance: number;
    scenarioFlow: number;
    approvedTerminology: number;
    forbiddenPhraseAvoidance: number;
    toneMatch: number;
    clarityNextStep: number;
    riskOverride?: string;
  };
  approvalRequired: boolean;
  repairRequired: boolean;
  createdAt: string;
};

export type ExportArtifact = {
  name:
    | "company_voice.md"
    | "communication_policy.json"
    | "scenario_playbooks.json"
    | "phrase_library.json"
    | "forbidden_phrases.json"
    | "approval_rules.json"
    | "evaluation_rubric.json"
    | "approved_examples.jsonl"
    | "rejected_examples.jsonl"
    | "agent_prompt_pack.md"
    | "company_identity.json"
    | "knowledge_pack.json"
    | "sales_positioning_pack.json"
    | "support_resolution_pack.json"
    | "escalation_hierarchy.json"
    | "agent_permissions.json"
    | "runtime_governance_policy.json"
    | "test_suite_manifest.json"
    | "agent_alignment_report.json"
    | "policy_version_manifest.json";
  contentType: string;
  content: string;
  checksum: string;
};

export type ExportRecord = {
  id: string;
  organisationId: string;
  exportType: string;
  artifacts: ExportArtifact[];
  manifest: {
    version?: number;
    previousExportId?: string | null;
    artifactCount: number;
    artifactNames?: string[];
    checksum: string;
    signature: string;
    signedAt: string;
    rollbackPointer?: {
      previousExportId: string | null;
      previousChecksum: string | null;
    };
  };
  createdAt: string;
};

export type IngestionLog = {
  id: string;
  organisationId: string;
  sourceId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type ReviewEvent = {
  id: string;
  organisationId: string;
  itemType: "policy" | "terminology" | "conflict";
  itemId: string;
  action: "approve" | "edit" | "reject" | "mark_outdated" | "request_reprocessing";
  actorId: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: string;
};

export type ProcessingJob = {
  id: string;
  organisationId: string;
  sourceId: string | null;
  jobType: JobType;
  status: JobStatus;
  attempts: number;
  payload: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactRequest = {
  id: string;
  name: string;
  workEmail: string;
  company: string;
  role: string;
  companySize: string;
  currentAiTools: string[];
  primaryUseCase: string;
  message: string;
  source: string;
  createdAt: string;
};

export type FeatureFlagKey =
  | "auto_send"
  | "connector_gmail"
  | "connector_slack"
  | "connector_outlook"
  | "connector_hubspot"
  | "connector_salesforce"
  | "connector_intercom"
  | "connector_zendesk"
  | "mcp_actions"
  | "scim_write";

export type FeatureFlag = {
  key: FeatureFlagKey;
  enabled: boolean;
  rolloutPercent: number;
  updatedBy: string;
  updatedAt: string;
};

export type FeatureFlagBlastRadius = "tenant_only" | "cross_tenant_control_plane";

export type FeatureFlagGovernance = {
  key: FeatureFlagKey;
  title: string;
  owner: string;
  blastRadius: FeatureFlagBlastRadius;
  tenantScopedRollout: true;
  rolloutField: "rolloutPercent";
  description: string;
  defaultEnabled: boolean;
  effective: FeatureFlag;
};

export type ConnectorProvider =
  | "gmail"
  | "slack"
  | "outlook"
  | "hubspot"
  | "salesforce"
  | "intercom"
  | "zendesk";

export type ConnectorStatus = "disconnected" | "connected" | "error" | "revoked";

export type ConnectorRecord = {
  id: string;
  organisationId: string;
  provider: ConnectorProvider;
  status: ConnectorStatus;
  displayName: string;
  scopes: string[];
  connectionHealth: "healthy" | "degraded" | "offline";
  sourceSelection: string[];
  syncSchedule: "manual" | "hourly" | "daily";
  lastSyncAt: string | null;
  lastSyncStatus: "succeeded" | "failed" | "never";
  lastSyncError: string | null;
  tokenRef: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRule = {
  id: string;
  organisationId: string;
  name: string;
  scenario: string;
  minScore: number;
  riskLevels: string[];
  channelAllowlist: string[];
  customerTypeAllowlist: string[];
  requiresHumanApproval: boolean;
  enabled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type RuntimeGovernanceMode =
  | "suggest_only"
  | "human_approval_required"
  | "conditional_approval"
  | "final_authority"
  | "notify_only";

export type AgentGovernanceConfig = {
  id: string;
  organisationId: string;
  agentId: string;
  displayName: string;
  channel: string;
  useCase: string;
  customerSegment: string;
  governanceMode: RuntimeGovernanceMode;
  scoreThreshold: number;
  riskLevels: string[];
  notificationDestinations: string[];
  enabled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SendEventStatus = "blocked" | "queued" | "sent" | "failed";

export type SendEventDeliveryState = "not_started" | "attempted" | "confirmed" | "failed";

export type SendEventDecisionSnapshot = {
  allowed: boolean;
  state: "allowed" | "blocked";
  reason: string;
  matchedRuleId: string | null;
  approvalRequired: boolean;
  approvalDecisionStatus: "approved" | "review_required";
  approvalDecisionReason: string;
  approvalDecisionRuleId: string | null;
};

export type SendEvent = {
  id: string;
  organisationId: string;
  evaluationId: string | null;
  scenarioId: string | null;
  workspaceId: string | null;
  channel: string;
  recipient: string;
  draft: string;
  status: SendEventStatus;
  reason: string;
  evidence: string[];
  autoSend: boolean;
  decisionSnapshot: SendEventDecisionSnapshot;
  reviewState: {
    required: boolean;
    status: "not_required" | "pending" | "approved" | "rejected";
    reviewerId: string | null;
    reviewedAt: string | null;
  };
  riskState: {
    score: number;
    riskLevel: string;
    overrideApplied: boolean;
    overrideReason: string | null;
  };
  connectorTarget: {
    channel: string;
    recipient: string;
    workspaceId: string | null;
    providerHint: string | null;
  };
  delivery: {
    state: SendEventDeliveryState;
    queuedAt: string;
    lastAttemptAt: string | null;
    confirmedAt: string | null;
    confirmationSource: "auto_send_worker" | "provider_callback" | "manual_override" | null;
    confirmationId: string | null;
    failureReason: string | null;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiCredential = {
  id: string;
  organisationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "active" | "revoked";
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
};

export type LlmProvider = "openai" | "anthropic" | "google" | "azure_openai" | "custom";

export type LlmProviderCredential = {
  id: string;
  organisationId: string;
  provider: LlmProvider;
  displayName: string;
  model: string;
  baseUrl: string | null;
  keyPreview: string;
  status: "active" | "revoked";
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
};

export type WebhookSubscription = {
  id: string;
  organisationId: string;
  endpoint: string;
  events: string[];
  secretPreview: string;
  status: "active" | "disabled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GovernanceInvitePolicy = "open" | "domain_allowlist_only" | "disabled";

export type GovernancePolicy = {
  retentionDays: number;
  legalHoldEnabled: boolean;
  deletionRequiresApproval: boolean;
  invitePolicy: GovernanceInvitePolicy;
  sessionDurationMinutes: number;
  enforcedMfa: boolean;
  breakGlassAdminEnabled: boolean;
  updatedAt: string;
};

export type DeletionRequestTarget = "all_data" | "sources_only" | "evaluations_only";

export type DeletionRequestStatus =
  | "pending_approval"
  | "approved"
  | "completed"
  | "blocked_legal_hold";

export type DeletionDependentArtifactAction =
  | "deleted"
  | "retained_legal_hold"
  | "anonymized"
  | "superseded"
  | "not_applicable";

export type DeletionDependentArtifact = {
  artifactType: "export_record" | "evaluation_record" | "source_record" | "job_record";
  artifactId: string;
  requiredAction: "review_before_delete" | "delete_or_retain";
  reason: string;
  handled: boolean;
  handledAction: DeletionDependentArtifactAction | null;
  handledReason: string | null;
};

export type DeletionApprovalRecord = {
  approvedBy: string;
  approverRole: AppRole;
  approvedAt: string;
  ticketRef: string;
};

export type DeletionCompletionRecord = {
  completedBy: string;
  completedAt: string;
  executionMode: "soft_delete" | "hard_delete" | "anonymize";
  proofRecordId: string;
  deletionEvidenceHash: string;
  deletedObjectCounts: {
    sources: number;
    evaluations: number;
    exports: number;
    jobs: number;
  };
  notes: string | null;
};

export type DeletionRequestRecord = {
  id: string;
  organisationId: string;
  status: DeletionRequestStatus;
  reason: string;
  target: DeletionRequestTarget;
  requestedBy: string;
  requestedAt: string;
  approval: DeletionApprovalRecord | null;
  completion: DeletionCompletionRecord | null;
  dependentArtifacts: DeletionDependentArtifact[];
};

export type LegalHoldScope = "global" | "sources" | "evaluations" | "exports";

export type LegalHoldStatus = "active" | "released" | "overridden" | "expired";

export type LegalHoldRecord = {
  holdId: string;
  organisationId: string;
  scope: LegalHoldScope;
  reason: string;
  ticketRef: string;
  placedBy: string;
  placedAt: string;
  expiresAt: string | null;
  status: LegalHoldStatus;
  releasedAt: string | null;
  releasedBy: string | null;
  releaseReason: string | null;
  override: {
    overridden: boolean;
    overriddenAt: string | null;
    overriddenBy: string | null;
    overrideReason: string | null;
    overrideTicketRef: string | null;
  };
};

export type LegalHoldState = {
  active: LegalHoldRecord | null;
  history: LegalHoldRecord[];
};

export type BreakGlassInvocationStatus = "active" | "released" | "expired";

export type BreakGlassInvocation = {
  invocationId: string;
  status: BreakGlassInvocationStatus;
  reason: string;
  ticketRef: string | null;
  durationMinutes: number;
  invokedAt: string;
  invokedBy: string;
  expiresAt: string;
  releasedAt: string | null;
  releasedBy: string | null;
  releaseReason: string | null;
};

export type BreakGlassProtocolState = {
  active: BreakGlassInvocation | null;
  history: BreakGlassInvocation[];
};

export type BillingEntitlement = {
  organisationId: string;
  plan: "starter" | "growth" | "enterprise";
  seatsLimit: number;
  evaluationsMonthlyLimit: number;
  sourcesMonthlyLimit: number;
  connectorLimit: number;
  autoSendEnabled: boolean;
  apiAccessEnabled: boolean;
  mcpAccessEnabled: boolean;
  status: "active" | "past_due" | "suspended";
  updatedAt: string;
};

export type McpCapability = {
  id: string;
  title: string;
  description: string;
  requiredFlag: FeatureFlagKey | null;
  requiredScope: string | null;
};

export type ScenarioGuidance = {
  scenarioId: string | null;
  scenarioName: string;
  strategy: string;
  requiredElements: string[];
  approvedPhrases: string[];
  forbiddenPhrases: string[];
  riskLevel: string;
  approvalRules: string[];
  evidence: Array<{
    sourceType: "policy" | "scenario";
    sourceId: string;
    chunkIndex?: number;
    anchor?: string;
  }>;
};

type ReviewItemBase = {
  id: string;
  type: "policy" | "terminology" | "conflict" | "outdated";
  title: string;
  status: ReviewStatus;
  section:
    | "suggested_rules"
    | "low_confidence"
    | "risky_terminology"
    | "conflicts"
    | "outdated_behaviour";
  summary: string;
  evidence: string[];
  sourceId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
};

export type ReviewItem =
  | (ReviewItemBase & {
      kind: "policy";
      entityType: "policy";
      severity: Severity;
      confidence: number;
    })
  | (ReviewItemBase & {
      kind: "terminology";
      entityType: "terminology";
      confidence: number;
    })
  | (ReviewItemBase & {
      kind: "conflict";
      entityType: "conflict";
      severity: Severity;
    });

export type ApprovalDecision =
  | {
      status: "approved";
      reason: string;
      matchedRuleId: string;
      approvalRequired: false;
    }
  | {
      status: "review_required";
      reason: string;
      matchedRuleId: string | null;
      approvalRequired: true;
    };

export type SendDecision =
  | {
      allowed: true;
      state: "allowed";
      reason: string;
      matchedRuleId: string;
      approvalRequired: false;
      approvalDecision: Extract<ApprovalDecision, { status: "approved" }>;
      runtimeUnavailable: null;
    }
  | {
      allowed: false;
      state: "blocked";
      reason: string;
      matchedRuleId: string | null;
      approvalRequired: true;
      approvalDecision: Extract<ApprovalDecision, { status: "review_required" }>;
      runtimeUnavailable:
        | {
            capabilityId: "auto_send";
            reason:
              | "feature_flag_disabled"
              | "feature_flag_partial_rollout"
              | "billing_not_active"
              | "entitlement_disabled"
              | "enterprise_env_missing";
          }
        | null;
    };

type BillingEntitlementStateBase = {
  organisationId: string;
  plan: "starter" | "growth" | "enterprise";
  updatedAt: string;
  limits: {
    seats: number;
    evaluationsMonthly: number;
    sourcesMonthly: number;
    connectors: number;
  };
  capabilities: {
    autoSendEnabled: boolean;
    apiAccessEnabled: boolean;
    mcpAccessEnabled: boolean;
  };
};

export type BillingEntitlementState =
  | (BillingEntitlementStateBase & {
      state: "active";
      status: "active";
      enforcement: "granted";
    })
  | (BillingEntitlementStateBase & {
      state: "past_due";
      status: "past_due";
      enforcement: "payment_required";
    })
  | (BillingEntitlementStateBase & {
      state: "suspended";
      status: "suspended";
      enforcement: "suspended";
    });

export type ConnectorSyncState = {
  provider: ConnectorProvider;
  configured: boolean;
  missingEnv: string[];
  featureEnabled: boolean;
  scopes: string[];
  sourceSelection: string[];
  sync: {
    schedule: "manual" | "hourly" | "daily";
    lastSyncAt: string | null;
    lastSyncStatus: "succeeded" | "failed" | "never";
    lastSyncError: string | null;
    lastSuccessfulSyncAt: string | null;
    syncLagMinutes: number | null;
  };
  health: {
    scopeStatus: "complete" | "partial" | "missing_required" | "unknown";
    tokenExpiry: "valid" | "expiring_soon" | "expired" | "unknown";
    throttlingState: "normal" | "throttled" | "rate_limited" | "backoff" | "unknown";
    failureReasons: string[];
  };
} & (
  | {
      state: "connected";
      connected: true;
      connectionHealth: "healthy" | "degraded";
    }
  | {
      state: "disconnected";
      connected: false;
      connectionHealth: "offline";
    }
);

export type ConnectorAvailabilityReason =
  | "available"
  | "feature_flag_disabled"
  | "env_missing"
  | "not_connected";

export type ConnectorAvailabilityState = {
  provider: ConnectorProvider;
  state: "available" | "unavailable";
  reason: ConnectorAvailabilityReason;
  message: string;
  featureEnabled: boolean;
  missingEnv: string[];
  connected: boolean;
};

export type ReadinessBlocker =
  | {
      category: "configuration";
      code: "missing_env";
      message: string;
      severity: "critical";
      recoverable: false;
      details: { missingEnv: string[] };
    }
  | {
      category: "configuration";
      code: "missing_connector_env";
      provider: ConnectorProvider;
      message: string;
      severity: "high";
      recoverable: true;
      details: { missingEnv: string[] };
    }
  | {
      category: "configuration";
      code: "missing_scim_env";
      message: string;
      severity: "high";
      recoverable: true;
      details: { missingEnv: ["OPERATORLAYER_SCIM_TOKEN"] };
    }
  | {
      category: "configuration";
      code: "missing_oauth_state_secret";
      message: string;
      severity: "high";
      recoverable: true;
      details: { missingEnv: ["OPERATORLAYER_OAUTH_STATE_SECRET"] };
    }
  | {
      category: "identity";
      code: "sso_disabled";
      message: string;
      severity: "high";
      recoverable: true;
    }
  | {
      category: "billing";
      code: "billing_not_active";
      message: string;
      severity: "critical";
      recoverable: false;
    }
  | {
      category: "feature_flag";
      code: `${FeatureFlagKey}_disabled`;
      key: FeatureFlagKey;
      message: string;
      severity: "high";
      recoverable: true;
    }
  | {
      category: "connector";
      code: `${ConnectorProvider}_connector_missing`;
      provider: ConnectorProvider;
      message: string;
      severity: "high";
      recoverable: true;
    };

export type IncidentSeverity = "sev0" | "sev1" | "sev2" | "sev3";

export type IncidentSeverityPolicy = {
  severity: IncidentSeverity;
  responseSlaMinutes: number;
  escalationMinutes: number;
  owner: string;
};

export type OperationalSloTargets = {
  apiLatencyP95Ms: number;
  jobCompletionP95Minutes: number;
  connectorSyncFreshnessMinutes: number;
  evaluationThroughputPerMinute: number;
  webhookDeliverySuccessRatePct: number;
};

export type ReadinessBoardBlocker = {
  code: string;
  category: ReadinessBlocker["category"] | "queue";
  severity: Severity;
  owner: string;
  status: "open" | "mitigating" | "resolved";
  remediation: string;
  nextCommand: string;
  evidence: string[];
};

export type ReadinessBoard = {
  generatedAt: string;
  goNoGo: "go" | "no_go";
  hardBlockerCount: number;
  queueHealth: {
    queued: number;
    running: number;
    failed: number;
    deadLetter: number;
  };
  sloTargets: OperationalSloTargets;
  incidentSeverityPolicy: IncidentSeverityPolicy[];
  blockers: ReadinessBoardBlocker[];
};

export type EnterpriseOnboardingChecklistStepId =
  | "core_runtime_env"
  | "identity_sso"
  | "billing_api_access"
  | "connector_feature_flags"
  | "connector_provider_env"
  | "connector_connections"
  | "queue_replay_health";

export type EnterpriseOnboardingChecklistStep = {
  id: EnterpriseOnboardingChecklistStepId;
  title: string;
  complete: boolean;
  blockerCodes: string[];
  nextCommands: string[];
  evidence: string[];
};

export type EnterpriseOnboardingChecklist = {
  generatedAt: string;
  goNoGo: ReadinessBoard["goNoGo"];
  readinessMeter: {
    completed: number;
    total: number;
    completionPct: number;
  };
  steps: EnterpriseOnboardingChecklistStep[];
};

export type EnterpriseReleaseDomainId =
  | "reliability_control_plane"
  | "iam_saml_scim_rbac_audit"
  | "provider_deep_connectors"
  | "intelligence_hardening"
  | "approval_auto_send_governance"
  | "billing_entitlements"
  | "api_mcp_ga"
  | "data_governance_security_ops"
  | "enterprise_ux"
  | "operational_readiness";

export type EnterpriseReleaseDomainAssessment = {
  id: EnterpriseReleaseDomainId;
  title: string;
  status: "ready" | "blocked" | "verification_gap";
  reason: string;
  evidence: string[];
  blockingCodes: string[];
  nextActions: string[];
};

export type EnterpriseReleaseEvidenceSignals = {
  auditEvents: {
    total: number;
    enterprise: number;
    connector: number;
    billing: number;
    security: number;
    governance: number;
    mcp: number;
  };
  intelligence: {
    evaluations: number;
    reviewEvents: number;
    policies: number;
    scenarios: number;
    conflicts: number;
  };
  governanceLifecycles: {
    legalHoldEvents: number;
    breakGlassEvents: number;
    deletionEvents: number;
    deletionProofEvents: number;
  };
  iamLifecycles: {
    ssoConfigEvents: number;
    scimBulkOperationEvents: number;
    scimUserStatusEvents: number;
    scimDriftReconcileEvents: number;
    rbacRoleChangeEvents: number;
    memberInviteLifecycleEvents: number;
  };
  permissionedIngestionLifecycles: {
    sourceUploadedEvents: number;
    sourceProcessRequestedEvents: number;
    sourceReprocessRequestedEvents: number;
  };
  autoSend: {
    approvalRuleEvents: number;
    decisionEvents: number;
    sendEventsCreated: number;
    sendEventsDelivered: number;
    sendEventsBlockedOrFailed: number;
  };
  runtimeDenials: {
    connectorUnavailable: number;
    mcpUnavailable?: number;
    autoSendUnavailable?: number;
    scimWriteUnavailable?: number;
    samlSsoUnavailable?: number;
    capabilityIds?: string[];
    entries?: Array<{
      capabilityId: string;
      reason: string | null;
    }>;
  };
};

export type EnterpriseProcurementDocsPresence = {
  architectureBrief: boolean;
  securityQuestionnaireBaseline: boolean;
  connectorScopeMatrix: boolean;
  governanceWalkthrough: boolean;
};

export type EnterpriseCompliancePosture = {
  certificationClaim: "not_claimed";
  soc2ReadinessStatus: "controls_evidenced" | "evidence_incomplete";
  message: string;
  procurementDocs: EnterpriseProcurementDocsPresence;
  evidence: {
    securityAuditEvents: number;
    governanceAuditEvents: number;
    legalHoldLifecycleEvents: number;
    breakGlassLifecycleEvents: number;
    deletionLifecycleEvents: number;
  };
  missingEvidence: string[];
};

export type EnterpriseClosureRequirementStatus = "proved" | "blocked" | "incomplete";
export type EnterpriseClosureEvidenceQuality = "direct" | "indirect" | "missing";

export type EnterpriseClosureRequirementAuditItem = {
  id:
    | EnterpriseReleaseDomainId
    | "soc2_ready_architecture_evidence"
    | "no_unsupported_certification_claims"
    | "runtime_disabled_unsupported_capabilities"
    | "non_negotiable_no_fake_data_integrations"
    | "non_negotiable_permissioned_ingestion"
    | "non_negotiable_human_governance"
    | "non_negotiable_customer_owned_data_posture"
    | "non_negotiable_evidence_first_outputs";
  title: string;
  status: EnterpriseClosureRequirementStatus;
  evidenceQuality: EnterpriseClosureEvidenceQuality;
  evidenceSources: string[];
  gaps: string[];
  nextActions: string[];
};

export type EnterpriseClosureAudit = {
  generatedAt: string;
  summary: {
    total: number;
    proved: number;
    blocked: number;
    incomplete: number;
  };
  requirements: EnterpriseClosureRequirementAuditItem[];
};

export type EnterpriseObjectiveCoverageScope =
  | "domain"
  | "compliance"
  | "runtime_safety"
  | "non_negotiable";

export type EnterpriseObjectiveCoverageItem = {
  id: EnterpriseClosureRequirementAuditItem["id"];
  title: string;
  scope: EnterpriseObjectiveCoverageScope;
  status: EnterpriseClosureRequirementStatus;
  evidenceSources: string[];
  gaps: string[];
  nextActions: string[];
};

export type EnterpriseReleaseDecision = {
  generatedAt: string;
  decision: ReadinessBoard["goNoGo"];
  summary: {
    hardBlockerCount: number;
    blockerCount: number;
    readinessCompletionPct: number;
    unavailableCapabilityCount: number;
    blockedDomainCount: number;
    verificationGapDomainCount: number;
  };
  nextActions: string[];
  evidenceSignals: EnterpriseReleaseEvidenceSignals;
  compliancePosture: EnterpriseCompliancePosture;
  closureAudit: EnterpriseClosureAudit;
  objectiveCoverage: EnterpriseObjectiveCoverageItem[];
  readinessBoard: ReadinessBoard;
  onboardingChecklist: EnterpriseOnboardingChecklist;
  capabilityStatus: {
    configured: boolean;
    missingEnvironment: string[];
    connectorReadiness: Record<ConnectorProvider, string[]>;
    featureFlags: FeatureFlag[];
    capabilityStates: Array<{
      id: string;
      state: "available" | "unavailable";
      reason:
        | "enabled"
        | "feature_flag_disabled"
        | "feature_flag_partial_rollout"
        | "entitlement_disabled"
        | "billing_not_active"
        | "enterprise_env_missing"
        | "connector_env_missing"
        | "connector_not_connected"
        | "scim_not_configured"
        | "sso_disabled";
      message: string;
    }>;
  };
  unavailableCapabilities: Array<{
    id: string;
    reason:
      | "enabled"
      | "feature_flag_disabled"
      | "feature_flag_partial_rollout"
      | "entitlement_disabled"
      | "billing_not_active"
      | "enterprise_env_missing"
      | "connector_env_missing"
      | "connector_not_connected"
      | "scim_not_configured"
      | "sso_disabled";
    message: string;
  }>;
  domainAssessments: EnterpriseReleaseDomainAssessment[];
};

export type AuditEventCategory =
  | "ingestion"
  | "review"
  | "enterprise"
  | "connector"
  | "billing"
  | "security"
  | "governance";

type AuditEventBase = {
  id: string;
  organisationId: string;
  action: string;
  actorId: string | null;
  severity: Severity;
  recoverable: boolean;
  traceId: string | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

type AuditEventForCategory<C extends AuditEventCategory> = AuditEventBase & {
  category: C;
};

export type AuditEvent =
  | AuditEventForCategory<"ingestion">
  | AuditEventForCategory<"review">
  | AuditEventForCategory<"enterprise">
  | AuditEventForCategory<"connector">
  | AuditEventForCategory<"billing">
  | AuditEventForCategory<"security">
  | AuditEventForCategory<"governance">;

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    severity: Severity;
    recoverable: boolean;
    traceId: string;
  };
};
