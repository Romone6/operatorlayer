import type {
  AppRole,
  AppUser,
  Conflict,
  ContactRequest,
  EvaluationRecord,
  ExportRecord,
  ExtractedPolicy,
  IngestionLog,
  MemberInvite,
  Organisation,
  OrganisationSettings,
  ProcessingJob,
  ReviewEvent,
  ReviewedExample,
  FeedbackRecord,
  Scenario,
  Source,
  SourceChunk,
  SourceWithStats,
  TerminologyPattern,
} from "@/lib/types";

export type CreateOrganisationInput = {
  name: string;
  industry?: string;
  userId: string;
  email: string;
  userName?: string;
};

export type CreateSourceInput = {
  organisationId: string;
  title: string;
  sourceType: string;
  authorityLevel?: string;
  fileUrl?: string;
  rawText?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateSourceStatusInput = {
  sourceId: string;
  organisationId: string;
  status: Source["processingStatus"];
  metadata?: Record<string, unknown>;
  rawText?: string;
};

export type InsertExtractionInput = {
  source: Source;
  chunks: SourceChunk[];
  policies: ExtractedPolicy[];
  terminologyPatterns: TerminologyPattern[];
  scenarios: Scenario[];
  conflicts: Conflict[];
};

export type ReviewEntityType = "policy" | "terminology" | "conflict";
export type ReviewQueueItemType = ReviewEntityType | "outdated";

export type ReviewQueueSectionId =
  | "suggested_rules"
  | "low_confidence"
  | "risky_terminology"
  | "conflicts"
  | "outdated_behaviour";

export type ReviewQueueItem = {
  id: string;
  type: ReviewQueueItemType;
  entityType: ReviewEntityType;
  title: string;
  status: string;
  section: ReviewQueueSectionId;
  summary: string;
  evidence: string[];
  sourceId?: string | null;
  severity?: string;
  confidence?: number;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
};

export type ReviewQueueSection = {
  id: ReviewQueueSectionId;
  label: string;
  items: ReviewQueueItem[];
};

export type ReviewQueuePayload = {
  sections: ReviewQueueSection[];
  summary: {
    total: number;
    suggestedRules: number;
    lowConfidence: number;
    riskyTerminology: number;
    conflicts: number;
    outdatedBehaviour: number;
  };
};

export type CreateJobInput = {
  organisationId: string;
  sourceId?: string | null;
  jobType: ProcessingJob["jobType"];
  payload: Record<string, unknown>;
};

export type UpdateJobInput = {
  jobId: string;
  organisationId: string;
  status: ProcessingJob["status"];
  errorMessage?: string | null;
  payloadPatch?: Record<string, unknown>;
};

export type ReviewUpdateMeta = {
  reviewedBy: string;
  reviewedAt: string;
};

export type ContactSubmissionInput = Omit<ContactRequest, "id" | "createdAt">;

export type IngestionLogInput = Omit<IngestionLog, "id" | "createdAt">;

export type ReviewEventInput = Omit<ReviewEvent, "id" | "createdAt">;
export type CreateReviewedExampleInput = Omit<ReviewedExample, "id" | "createdAt">;
export type CreateFeedbackInput = Omit<FeedbackRecord, "id" | "createdAt">;

export type CreateMemberInviteInput = {
  organisationId: string;
  email: string;
  role: AppRole;
  invitedBy: string;
  inviteToken: string;
  expiresAt: string;
};

export interface OperatorRepository {
  createOrganisation(input: CreateOrganisationInput): Promise<Organisation>;
  listUsers(organisationId: string): Promise<AppUser[]>;
  updateUserRole(organisationId: string, userId: string, role: AppRole): Promise<AppUser | null>;
  upsertUserMembership(input: {
    organisationId: string;
    userId: string;
    email: string;
    role: AppRole;
    name?: string | null;
  }): Promise<AppUser>;
  createMemberInvite(input: CreateMemberInviteInput): Promise<MemberInvite>;
  listMemberInvites(organisationId: string): Promise<MemberInvite[]>;
  getMemberInviteByToken(token: string): Promise<MemberInvite | null>;
  updateMemberInviteStatus(
    inviteId: string,
    status: MemberInvite["status"],
    patch?: Partial<Pick<MemberInvite, "acceptedBy" | "acceptedAt">>
  ): Promise<MemberInvite | null>;
  getOrganisation(organisationId: string): Promise<Organisation | null>;
  updateOrganisation(
    organisationId: string,
    patch: Partial<Pick<Organisation, "name" | "industry" | "riskTolerance" | "autoSendAllowed">>
  ): Promise<Organisation | null>;
  getOrganisationSettings(organisationId: string): Promise<OrganisationSettings | null>;
  upsertOrganisationSettings(
    organisationId: string,
    patch: Partial<
      Pick<
        OrganisationSettings,
        | "defaultTone"
        | "pricingApprovalThreshold"
        | "refundApprovalThreshold"
        | "dataRetentionDays"
        | "modelProvider"
      >
    >
  ): Promise<OrganisationSettings>;
  createSource(input: CreateSourceInput): Promise<Source>;
  listSources(organisationId: string): Promise<SourceWithStats[]>;
  getSourceById(organisationId: string, sourceId: string): Promise<Source | null>;
  deleteSource(organisationId: string, sourceId: string): Promise<void>;
  updateSourceStatus(input: UpdateSourceStatusInput): Promise<Source>;
  replaceSourceChunks(organisationId: string, sourceId: string, chunks: SourceChunk[]): Promise<void>;
  replaceExtractedData(payload: InsertExtractionInput): Promise<void>;
  listTerminology(organisationId: string): Promise<TerminologyPattern[]>;
  listPolicies(organisationId: string): Promise<ExtractedPolicy[]>;
  patchPolicy(
    organisationId: string,
    policyId: string,
    patch: Partial<
      Pick<
        ExtractedPolicy,
        "status" | "severity" | "name" | "description" | "reviewedBy" | "reviewedAt"
      >
    >
  ): Promise<ExtractedPolicy | null>;
  listScenarios(organisationId: string): Promise<Scenario[]>;
  getScenarioById(organisationId: string, scenarioId: string): Promise<Scenario | null>;
  listConflicts(organisationId: string): Promise<Conflict[]>;
  patchConflict(
    organisationId: string,
    conflictId: string,
    patch: Partial<
      Pick<Conflict, "status" | "severity" | "recommendedResolution" | "reviewedBy" | "reviewedAt">
    >
  ): Promise<Conflict | null>;
  patchTerminology(
    organisationId: string,
    terminologyId: string,
    patch: Partial<
      Pick<TerminologyPattern, "status" | "recommendation" | "reviewedBy" | "reviewedAt">
    >
  ): Promise<TerminologyPattern | null>;
  listReviewQueue(organisationId: string): Promise<ReviewQueuePayload>;
  createEvaluation(
    organisationId: string,
    record: Omit<EvaluationRecord, "id" | "organisationId" | "createdAt">
  ): Promise<EvaluationRecord>;
  listEvaluations(organisationId: string): Promise<EvaluationRecord[]>;
  createReviewedExample(input: CreateReviewedExampleInput): Promise<ReviewedExample>;
  listReviewedExamples(organisationId: string): Promise<ReviewedExample[]>;
  createFeedback(input: CreateFeedbackInput): Promise<FeedbackRecord>;
  listFeedback(organisationId: string): Promise<FeedbackRecord[]>;
  createExport(
    organisationId: string,
    exportType: string,
    artifacts: ExportRecord["artifacts"],
    manifest?: ExportRecord["manifest"]
  ): Promise<ExportRecord>;
  listExports(organisationId: string): Promise<ExportRecord[]>;
  getExportById(organisationId: string, exportId: string): Promise<ExportRecord | null>;
  createIngestionLog(input: IngestionLogInput): Promise<IngestionLog>;
  listIngestionLogs(organisationId: string): Promise<IngestionLog[]>;
  createReviewEvent(input: ReviewEventInput): Promise<ReviewEvent>;
  listReviewEvents(organisationId: string): Promise<ReviewEvent[]>;
  createContactSubmission(input: ContactSubmissionInput): Promise<ContactRequest>;
  enqueueJob(input: CreateJobInput): Promise<ProcessingJob>;
  listJobs(organisationId: string): Promise<ProcessingJob[]>;
  getNextQueuedJob(organisationId: string): Promise<ProcessingJob | null>;
  updateJob(input: UpdateJobInput): Promise<ProcessingJob | null>;
}
