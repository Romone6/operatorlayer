import fs from "node:fs";
import path from "node:path";

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
import type {
  CreateMemberInviteInput,
  CreateJobInput,
  ContactSubmissionInput,
  CreateOrganisationInput,
  CreateSourceInput,
  IngestionLogInput,
  InsertExtractionInput,
  OperatorRepository,
  ReviewEventInput,
  CreateReviewedExampleInput,
  CreateFeedbackInput,
  ReviewQueuePayload,
  ReviewQueueItem,
  ReviewQueueSection,
  UpdateJobInput,
  UpdateSourceStatusInput,
} from "@/lib/repository/interface";

type MemoryState = {
  organisations: Organisation[];
  organisationSettings: OrganisationSettings[];
  users: Array<{
    id: string;
    organisationId: string;
    email: string;
    name?: string;
    role: AppRole;
    createdAt: string;
  }>;
  memberInvites: MemberInvite[];
  sources: Source[];
  chunks: SourceChunk[];
  policies: ExtractedPolicy[];
  terminology: TerminologyPattern[];
  scenarios: Scenario[];
  conflicts: Conflict[];
  evaluations: EvaluationRecord[];
  exports: ExportRecord[];
  contactRequests: ContactRequest[];
  ingestionLogs: IngestionLog[];
  reviewEvents: ReviewEvent[];
  reviewedExamples: ReviewedExample[];
  feedback: FeedbackRecord[];
  jobs: ProcessingJob[];
};

const storeFile = path.join(process.cwd(), ".operatorlayer-memory-store.json");
let runtimeState: MemoryState | null = null;

const initialState: MemoryState = {
  organisations: [],
  organisationSettings: [],
  users: [],
  memberInvites: [],
  sources: [],
  chunks: [],
  policies: [],
  terminology: [],
  scenarios: [],
  conflicts: [],
  evaluations: [],
  exports: [],
  contactRequests: [],
  ingestionLogs: [],
  reviewEvents: [],
  reviewedExamples: [],
  feedback: [],
  jobs: [],
};

function nowIso() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function loadState(): MemoryState {
  if (process.env.NODE_ENV === "test") {
    if (!runtimeState) {
      runtimeState = structuredClone(initialState);
    }
    return structuredClone(runtimeState);
  }

  if (!fs.existsSync(storeFile)) {
    return structuredClone(initialState);
  }
  const parsed = JSON.parse(fs.readFileSync(storeFile, "utf-8")) as Partial<MemoryState>;
  return {
    organisations: parsed.organisations ?? [],
    organisationSettings: parsed.organisationSettings ?? [],
    users: (parsed.users ?? []).map((item) => ({
      ...item,
      createdAt: item.createdAt ?? nowIso(),
    })),
    memberInvites: parsed.memberInvites ?? [],
    sources: parsed.sources ?? [],
    chunks: parsed.chunks ?? [],
    policies: parsed.policies ?? [],
    terminology: parsed.terminology ?? [],
    scenarios: parsed.scenarios ?? [],
    conflicts: parsed.conflicts ?? [],
    evaluations: parsed.evaluations ?? [],
    exports: parsed.exports ?? [],
    contactRequests: parsed.contactRequests ?? [],
    ingestionLogs: parsed.ingestionLogs ?? [],
    reviewEvents: parsed.reviewEvents ?? [],
    reviewedExamples: parsed.reviewedExamples ?? [],
    feedback: parsed.feedback ?? [],
    jobs: parsed.jobs ?? [],
  };
}

function saveState(state: MemoryState) {
  if (process.env.NODE_ENV === "test") {
    runtimeState = structuredClone(state);
    return;
  }
  fs.writeFileSync(storeFile, JSON.stringify(state, null, 2), "utf-8");
}

function getSourceStats(state: MemoryState, source: Source) {
  return {
    policyCount: state.policies.filter((policy) =>
      policy.sourceEvidence.some((item) => item.sourceId === source.id)
    ).length,
    phraseCount: state.terminology.filter((term) =>
      term.sourceEvidence.some((item) => item.sourceId === source.id)
    ).length,
  scenarioCount: state.scenarios.filter((scenario) =>
      scenario.sourceId === source.id
    ).length,
  };
}

const reviewSectionLabels: Record<ReviewQueueSection["id"], string> = {
  suggested_rules: "Suggested Rules",
  low_confidence: "Low-Confidence Rules",
  risky_terminology: "Risky Terminology",
  conflicts: "Conflicts",
  outdated_behaviour: "Outdated Behaviour",
};

function evidenceToDisplay(evidence: Array<{ sourceId: string; chunkIndex?: number }>) {
  if (!evidence.length) return ["No source evidence available."];
  return evidence.map((item) =>
    item.chunkIndex === undefined
      ? `Source ${item.sourceId}`
      : `Source ${item.sourceId} (chunk ${item.chunkIndex})`
  );
}

export class MemoryRepository implements OperatorRepository {
  async createOrganisation(input: CreateOrganisationInput): Promise<Organisation> {
    const state = loadState();
    const org: Organisation = {
      id: id(),
      name: input.name,
      industry: input.industry ?? null,
      riskTolerance: "medium",
      autoSendAllowed: false,
      createdAt: nowIso(),
    };
    state.organisations.push(org);
    state.organisationSettings.push({
      organisationId: org.id,
      defaultTone: "consultative",
      pricingApprovalThreshold: 10,
      refundApprovalThreshold: 500,
      dataRetentionDays: 365,
      modelProvider: "openai",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    state.users.push({
      id: input.userId,
      organisationId: org.id,
      email: input.email,
      name: input.userName,
      role: "owner",
      createdAt: nowIso(),
    });
    saveState(state);
    return org;
  }

  async listUsers(organisationId: string): Promise<AppUser[]> {
    const state = loadState();
    return state.users
      .filter((item) => item.organisationId === organisationId)
      .map((item) => ({
        id: item.id,
        organisationId: item.organisationId,
        email: item.email,
        name: item.name ?? null,
        role: item.role,
        createdAt: item.createdAt,
      }));
  }

  async updateUserRole(organisationId: string, userId: string, role: AppRole): Promise<AppUser | null> {
    const state = loadState();
    const user = state.users.find((item) => item.organisationId === organisationId && item.id === userId);
    if (!user) return null;
    user.role = role;
    saveState(state);
    return {
      id: user.id,
      organisationId: user.organisationId,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async upsertUserMembership(input: {
    organisationId: string;
    userId: string;
    email: string;
    role: AppRole;
    name?: string | null;
  }): Promise<AppUser> {
    const state = loadState();
    const existing = state.users.find(
      (item) => item.organisationId === input.organisationId && item.id === input.userId
    );

    if (existing) {
      existing.email = input.email;
      existing.role = input.role;
      existing.name = input.name ?? undefined;
      saveState(state);
      return {
        id: existing.id,
        organisationId: existing.organisationId,
        email: existing.email,
        role: existing.role,
        name: existing.name ?? null,
        createdAt: existing.createdAt,
      };
    }

    const nextUser = {
      id: input.userId,
      organisationId: input.organisationId,
      email: input.email,
      role: input.role,
      name: input.name ?? undefined,
      createdAt: nowIso(),
    };
    state.users.push(nextUser);
    saveState(state);
    return {
      id: nextUser.id,
      organisationId: nextUser.organisationId,
      email: nextUser.email,
      role: nextUser.role,
      name: nextUser.name ?? null,
      createdAt: nextUser.createdAt,
    };
  }

  async createMemberInvite(input: CreateMemberInviteInput): Promise<MemberInvite> {
    const state = loadState();
    const invite: MemberInvite = {
      id: id(),
      organisationId: input.organisationId,
      email: input.email.toLowerCase(),
      role: input.role,
      inviteToken: input.inviteToken,
      status: "pending",
      invitedBy: input.invitedBy,
      expiresAt: input.expiresAt,
      acceptedBy: null,
      acceptedAt: null,
      createdAt: nowIso(),
    };
    state.memberInvites.push(invite);
    saveState(state);
    return invite;
  }

  async listMemberInvites(organisationId: string): Promise<MemberInvite[]> {
    const state = loadState();
    return state.memberInvites
      .filter((invite) => invite.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getMemberInviteByToken(token: string): Promise<MemberInvite | null> {
    const state = loadState();
    return state.memberInvites.find((invite) => invite.inviteToken === token) ?? null;
  }

  async updateMemberInviteStatus(
    inviteId: string,
    status: MemberInvite["status"],
    patch?: Partial<Pick<MemberInvite, "acceptedBy" | "acceptedAt">>
  ): Promise<MemberInvite | null> {
    const state = loadState();
    const invite = state.memberInvites.find((item) => item.id === inviteId);
    if (!invite) return null;
    invite.status = status;
    if (patch?.acceptedBy !== undefined) invite.acceptedBy = patch.acceptedBy;
    if (patch?.acceptedAt !== undefined) invite.acceptedAt = patch.acceptedAt;
    saveState(state);
    return invite;
  }

  async getOrganisation(organisationId: string): Promise<Organisation | null> {
    const state = loadState();
    return state.organisations.find((item) => item.id === organisationId) ?? null;
  }

  async updateOrganisation(
    organisationId: string,
    patch: Partial<Pick<Organisation, "name" | "industry" | "riskTolerance" | "autoSendAllowed">>
  ): Promise<Organisation | null> {
    const state = loadState();
    const org = state.organisations.find((item) => item.id === organisationId);
    if (!org) return null;
    Object.assign(org, patch);
    saveState(state);
    return org;
  }

  async getOrganisationSettings(organisationId: string): Promise<OrganisationSettings | null> {
    const state = loadState();
    return state.organisationSettings.find((item) => item.organisationId === organisationId) ?? null;
  }

  async upsertOrganisationSettings(
    organisationId: string,
    patch: Partial<
      Pick<
        OrganisationSettings,
        "defaultTone" | "pricingApprovalThreshold" | "refundApprovalThreshold" | "dataRetentionDays" | "modelProvider"
      >
    >
  ): Promise<OrganisationSettings> {
    const state = loadState();
    let settings = state.organisationSettings.find((item) => item.organisationId === organisationId);
    if (!settings) {
      settings = {
        organisationId,
        defaultTone: "consultative",
        pricingApprovalThreshold: 10,
        refundApprovalThreshold: 500,
        dataRetentionDays: 365,
        modelProvider: "openai",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      state.organisationSettings.push(settings);
    }
    Object.assign(settings, patch, { updatedAt: nowIso() });
    saveState(state);
    return settings;
  }

  async createSource(input: CreateSourceInput): Promise<Source> {
    const state = loadState();
    const source: Source = {
      id: id(),
      organisationId: input.organisationId,
      title: input.title,
      sourceType: input.sourceType,
      authorityLevel: input.authorityLevel ?? null,
      fileUrl: input.fileUrl ?? null,
      rawText: input.rawText ?? null,
      processingStatus: "uploaded",
      metadata: input.metadata ?? {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.sources.push(source);
    saveState(state);
    return source;
  }

  async listSources(organisationId: string): Promise<SourceWithStats[]> {
    const state = loadState();
    return state.sources
      .filter((source) => source.organisationId === organisationId)
      .map((source) => ({ ...source, ...getSourceStats(state, source) }));
  }

  async getSourceById(organisationId: string, sourceId: string): Promise<Source | null> {
    const state = loadState();
    return state.sources.find((source) => source.organisationId === organisationId && source.id === sourceId) ?? null;
  }

  async deleteSource(organisationId: string, sourceId: string): Promise<void> {
    const state = loadState();
    state.sources = state.sources.filter(
      (source) => !(source.organisationId === organisationId && source.id === sourceId)
    );
    state.chunks = state.chunks.filter(
      (chunk) => !(chunk.organisationId === organisationId && chunk.sourceId === sourceId)
    );
    state.policies = state.policies.filter(
      (policy) =>
        !(
          policy.organisationId === organisationId &&
          policy.sourceEvidence.some((evidence) => evidence.sourceId === sourceId)
        )
    );
    state.terminology = state.terminology.filter(
      (term) =>
        !(
          term.organisationId === organisationId &&
          term.sourceEvidence.some((evidence) => evidence.sourceId === sourceId)
        )
    );
    state.scenarios = state.scenarios.filter(
      (scenario) => !(scenario.organisationId === organisationId && scenario.sourceId === sourceId)
    );
    state.conflicts = state.conflicts.filter(
      (conflict) => !(conflict.organisationId === organisationId && conflict.sourceId === sourceId)
    );
    saveState(state);
  }

  async updateSourceStatus(input: UpdateSourceStatusInput): Promise<Source> {
    const state = loadState();
    const source = state.sources.find(
      (item) => item.organisationId === input.organisationId && item.id === input.sourceId
    );
    if (!source) {
      throw new Error("Source not found");
    }
    source.processingStatus = input.status;
    source.updatedAt = nowIso();
    source.metadata = { ...source.metadata, ...(input.metadata ?? {}) };
    if (input.rawText !== undefined) {
      source.rawText = input.rawText;
    }
    saveState(state);
    return source;
  }

  async replaceSourceChunks(organisationId: string, sourceId: string, chunks: SourceChunk[]): Promise<void> {
    const state = loadState();
    state.chunks = state.chunks.filter(
      (chunk) => !(chunk.organisationId === organisationId && chunk.sourceId === sourceId)
    );
    state.chunks.push(...chunks);
    saveState(state);
  }

  async replaceExtractedData(payload: InsertExtractionInput): Promise<void> {
    const state = loadState();
    const sourceId = payload.source.id;
    const organisationId = payload.source.organisationId;

    state.policies = state.policies.filter(
      (policy) =>
        !(
          policy.organisationId === organisationId &&
          policy.sourceEvidence.some((item) => item.sourceId === sourceId)
        )
    );
    state.terminology = state.terminology.filter(
      (term) =>
        !(
          term.organisationId === organisationId &&
          term.sourceEvidence.some((item) => item.sourceId === sourceId)
        )
    );
    state.scenarios = state.scenarios.filter(
      (scenario) => !(scenario.organisationId === organisationId && scenario.sourceId === sourceId)
    );
    state.conflicts = state.conflicts.filter(
      (conflict) => !(conflict.organisationId === organisationId && conflict.sourceId === sourceId)
    );

    state.policies.push(...payload.policies);
    state.terminology.push(...payload.terminologyPatterns);
    state.scenarios.push(...payload.scenarios);
    state.conflicts.push(...payload.conflicts);
    saveState(state);
  }

  async listTerminology(organisationId: string): Promise<TerminologyPattern[]> {
    const state = loadState();
    return state.terminology.filter((term) => term.organisationId === organisationId);
  }

  async listPolicies(organisationId: string): Promise<ExtractedPolicy[]> {
    const state = loadState();
    return state.policies.filter((policy) => policy.organisationId === organisationId);
  }

  async patchPolicy(
    organisationId: string,
    policyId: string,
    patch: Partial<
      Pick<
        ExtractedPolicy,
        "status" | "severity" | "name" | "description" | "reviewedBy" | "reviewedAt"
      >
    >
  ): Promise<ExtractedPolicy | null> {
    const state = loadState();
    const policy = state.policies.find((item) => item.organisationId === organisationId && item.id === policyId);
    if (!policy) return null;
    Object.assign(policy, patch, { updatedAt: nowIso() });
    saveState(state);
    return policy;
  }

  async listScenarios(organisationId: string): Promise<Scenario[]> {
    const state = loadState();
    return state.scenarios.filter((scenario) => scenario.organisationId === organisationId);
  }

  async getScenarioById(organisationId: string, scenarioId: string): Promise<Scenario | null> {
    const state = loadState();
    return state.scenarios.find((scenario) => scenario.organisationId === organisationId && scenario.id === scenarioId) ?? null;
  }

  async listConflicts(organisationId: string): Promise<Conflict[]> {
    const state = loadState();
    return state.conflicts.filter((conflict) => conflict.organisationId === organisationId);
  }

  async patchConflict(
    organisationId: string,
    conflictId: string,
    patch: Partial<
      Pick<Conflict, "status" | "severity" | "recommendedResolution" | "reviewedBy" | "reviewedAt">
    >
  ): Promise<Conflict | null> {
    const state = loadState();
    const conflict = state.conflicts.find((item) => item.organisationId === organisationId && item.id === conflictId);
    if (!conflict) return null;
    if (patch.status) conflict.status = patch.status;
    if (patch.severity) conflict.severity = patch.severity;
    if (patch.recommendedResolution) conflict.recommendedResolution = patch.recommendedResolution;
    if (patch.reviewedBy !== undefined) conflict.reviewedBy = patch.reviewedBy;
    if (patch.reviewedAt !== undefined) conflict.reviewedAt = patch.reviewedAt;
    conflict.updatedAt = nowIso();
    saveState(state);
    return conflict;
  }

  async patchTerminology(
    organisationId: string,
    terminologyId: string,
    patch: Partial<
      Pick<TerminologyPattern, "status" | "recommendation" | "reviewedBy" | "reviewedAt">
    >
  ): Promise<TerminologyPattern | null> {
    const state = loadState();
    const terminology = state.terminology.find(
      (item) => item.organisationId === organisationId && item.id === terminologyId
    );
    if (!terminology) return null;
    if (patch.status) terminology.status = patch.status;
    if (patch.recommendation !== undefined) terminology.recommendation = patch.recommendation;
    if (patch.reviewedBy !== undefined) terminology.reviewedBy = patch.reviewedBy;
    if (patch.reviewedAt !== undefined) terminology.reviewedAt = patch.reviewedAt;
    terminology.updatedAt = nowIso();
    saveState(state);
    return terminology;
  }

  async listReviewQueue(organisationId: string): Promise<ReviewQueuePayload> {
    const [policies, conflicts, terminology] = await Promise.all([
      this.listPolicies(organisationId),
      this.listConflicts(organisationId),
      this.listTerminology(organisationId),
    ]);

    const suggestedRuleItems = policies
      .filter((policy) => policy.status === "suggested")
      .map<ReviewQueueItem>((policy) => ({
        id: policy.id,
        type: "policy",
        entityType: "policy",
        title: policy.name,
        status: policy.status,
        section: "suggested_rules",
        summary: policy.description,
        evidence: evidenceToDisplay(policy.sourceEvidence),
        sourceId: policy.sourceEvidence[0]?.sourceId ?? null,
        severity: policy.severity,
        confidence: policy.confidence,
        reviewedBy: policy.reviewedBy,
        reviewedAt: policy.reviewedAt,
        updatedAt: policy.updatedAt,
      }));

    const lowConfidenceItems = policies
      .filter(
        (policy) =>
          policy.confidence < 0.8 && policy.status !== "outdated" && policy.status !== "suggested"
      )
      .map<ReviewQueueItem>((policy) => ({
        id: policy.id,
        type: "policy",
        entityType: "policy",
        title: policy.name,
        status: policy.status,
        section: "low_confidence",
        summary: `Confidence ${Math.round(policy.confidence * 100)}% requires review.`,
        evidence: evidenceToDisplay(policy.sourceEvidence),
        sourceId: policy.sourceEvidence[0]?.sourceId ?? null,
        severity: policy.severity,
        confidence: policy.confidence,
        reviewedBy: policy.reviewedBy,
        reviewedAt: policy.reviewedAt,
        updatedAt: policy.updatedAt,
      }));

    const riskyTerminologyItems = terminology
      .filter((item) => ["blocked", "weak", "needs_review"].includes(item.status))
      .map<ReviewQueueItem>((item) => ({
        id: item.id,
        type: "terminology",
        entityType: "terminology",
        title: item.phrase,
        status: item.status,
        section: "risky_terminology",
        summary: item.recommendation ?? "Needs approval or replacement guidance.",
        evidence: evidenceToDisplay(item.sourceEvidence),
        sourceId: item.sourceEvidence[0]?.sourceId ?? null,
        confidence: undefined,
        reviewedBy: item.reviewedBy,
        reviewedAt: item.reviewedAt,
        updatedAt: item.updatedAt,
      }));

    const conflictItems = conflicts
      .filter(
        (conflict) =>
          conflict.status !== "approved" &&
          conflict.status !== "rejected" &&
          conflict.status !== "outdated"
      )
      .map<ReviewQueueItem>((conflict) => ({
        id: conflict.id,
        type: "conflict",
        entityType: "conflict",
        title: conflict.conflictType,
        status: conflict.status,
        section: "conflicts",
        summary: conflict.recommendedResolution,
        evidence: conflict.evidence.map((item) => `${item.sourceId}: ${item.details}`),
        sourceId: conflict.evidence[0]?.sourceId ?? null,
        severity: conflict.severity,
        reviewedBy: conflict.reviewedBy,
        reviewedAt: conflict.reviewedAt,
        updatedAt: conflict.updatedAt,
      }));

    const outdatedItems: ReviewQueueItem[] = [
      ...policies
        .filter((policy) => policy.status === "outdated")
        .map((policy) => ({
          id: policy.id,
          type: "outdated" as const,
          entityType: "policy" as const,
          title: policy.name,
          status: policy.status,
          section: "outdated_behaviour" as const,
          summary: policy.description,
          evidence: evidenceToDisplay(policy.sourceEvidence),
          sourceId: policy.sourceEvidence[0]?.sourceId ?? null,
          severity: policy.severity,
          confidence: policy.confidence,
          reviewedBy: policy.reviewedBy,
          reviewedAt: policy.reviewedAt,
          updatedAt: policy.updatedAt,
        })),
      ...terminology
        .filter((item) => item.status === "outdated")
        .map((item) => ({
          id: item.id,
          type: "outdated" as const,
          entityType: "terminology" as const,
          title: item.phrase,
          status: item.status,
          section: "outdated_behaviour" as const,
          summary: item.recommendation ?? "Marked outdated",
          evidence: evidenceToDisplay(item.sourceEvidence),
          sourceId: item.sourceEvidence[0]?.sourceId ?? null,
          reviewedBy: item.reviewedBy,
          reviewedAt: item.reviewedAt,
          updatedAt: item.updatedAt,
        })),
      ...conflicts
        .filter((conflict) => conflict.status === "outdated")
        .map((conflict) => ({
          id: conflict.id,
          type: "outdated" as const,
          entityType: "conflict" as const,
          title: conflict.conflictType,
          status: conflict.status,
          section: "outdated_behaviour" as const,
          summary: conflict.recommendedResolution,
          evidence: conflict.evidence.map((item) => `${item.sourceId}: ${item.details}`),
          sourceId: conflict.evidence[0]?.sourceId ?? null,
          severity: conflict.severity,
          reviewedBy: conflict.reviewedBy,
          reviewedAt: conflict.reviewedAt,
          updatedAt: conflict.updatedAt,
        })),
    ];

    const sections: ReviewQueueSection[] = [
      { id: "suggested_rules", label: reviewSectionLabels.suggested_rules, items: suggestedRuleItems },
      { id: "low_confidence", label: reviewSectionLabels.low_confidence, items: lowConfidenceItems },
      { id: "risky_terminology", label: reviewSectionLabels.risky_terminology, items: riskyTerminologyItems },
      { id: "conflicts", label: reviewSectionLabels.conflicts, items: conflictItems },
      { id: "outdated_behaviour", label: reviewSectionLabels.outdated_behaviour, items: outdatedItems },
    ];

    return {
      sections,
      summary: {
        total: sections.reduce((count, section) => count + section.items.length, 0),
        suggestedRules: suggestedRuleItems.length,
        lowConfidence: lowConfidenceItems.length,
        riskyTerminology: riskyTerminologyItems.length,
        conflicts: conflictItems.length,
        outdatedBehaviour: outdatedItems.length,
      },
    };
  }

  async createEvaluation(
    organisationId: string,
    record: Omit<EvaluationRecord, "id" | "organisationId" | "createdAt">
  ): Promise<EvaluationRecord> {
    const state = loadState();
    const evaluation: EvaluationRecord = {
      id: id(),
      organisationId,
      createdAt: nowIso(),
      ...record,
    };
    state.evaluations.push(evaluation);
    saveState(state);
    return evaluation;
  }

  async listEvaluations(organisationId: string): Promise<EvaluationRecord[]> {
    const state = loadState();
    return state.evaluations
      .filter((evaluation) => evaluation.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createReviewedExample(input: CreateReviewedExampleInput): Promise<ReviewedExample> {
    const state = loadState();
    const record: ReviewedExample = { id: id(), createdAt: nowIso(), ...input };
    state.reviewedExamples.push(record);
    saveState(state);
    return record;
  }

  async listReviewedExamples(organisationId: string): Promise<ReviewedExample[]> {
    const state = loadState();
    return state.reviewedExamples
      .filter((record) => record.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createFeedback(input: CreateFeedbackInput): Promise<FeedbackRecord> {
    const state = loadState();
    const record: FeedbackRecord = { id: id(), createdAt: nowIso(), ...input };
    state.feedback.push(record);
    saveState(state);
    return record;
  }

  async listFeedback(organisationId: string): Promise<FeedbackRecord[]> {
    const state = loadState();
    return state.feedback
      .filter((record) => record.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createExport(
    organisationId: string,
    exportType: string,
    artifacts: ExportRecord["artifacts"],
    manifest?: ExportRecord["manifest"]
  ): Promise<ExportRecord> {
    const state = loadState();
    const record: ExportRecord = {
      id: id(),
      organisationId,
      exportType,
      artifacts,
      manifest:
        manifest ??
        {
          artifactCount: artifacts.length,
          checksum: "",
          signature: "",
          signedAt: nowIso(),
        },
      createdAt: nowIso(),
    };
    state.exports.push(record);
    saveState(state);
    return record;
  }

  async listExports(organisationId: string): Promise<ExportRecord[]> {
    const state = loadState();
    return state.exports
      .filter((record) => record.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getExportById(organisationId: string, exportId: string): Promise<ExportRecord | null> {
    const state = loadState();
    return state.exports.find((record) => record.organisationId === organisationId && record.id === exportId) ?? null;
  }

  async createIngestionLog(input: IngestionLogInput): Promise<IngestionLog> {
    const state = loadState();
    const record: IngestionLog = {
      id: id(),
      createdAt: nowIso(),
      ...input,
    };
    state.ingestionLogs.push(record);
    saveState(state);
    return record;
  }

  async listIngestionLogs(organisationId: string): Promise<IngestionLog[]> {
    const state = loadState();
    return state.ingestionLogs
      .filter((item) => item.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createReviewEvent(input: ReviewEventInput): Promise<ReviewEvent> {
    const state = loadState();
    const record: ReviewEvent = {
      id: id(),
      createdAt: nowIso(),
      ...input,
    };
    state.reviewEvents.push(record);
    saveState(state);
    return record;
  }

  async listReviewEvents(organisationId: string): Promise<ReviewEvent[]> {
    const state = loadState();
    return state.reviewEvents
      .filter((item) => item.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createContactSubmission(input: ContactSubmissionInput): Promise<ContactRequest> {
    const state = loadState();
    const record: ContactRequest = {
      id: id(),
      createdAt: nowIso(),
      ...input,
    };
    state.contactRequests.push(record);
    saveState(state);
    return record;
  }

  async enqueueJob(input: CreateJobInput): Promise<ProcessingJob> {
    const state = loadState();
    const job: ProcessingJob = {
      id: id(),
      organisationId: input.organisationId,
      sourceId: input.sourceId ?? null,
      jobType: input.jobType,
      status: "queued",
      attempts: 0,
      payload: input.payload,
      errorMessage: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    state.jobs.push(job);
    saveState(state);
    return job;
  }

  async listJobs(organisationId: string): Promise<ProcessingJob[]> {
    const state = loadState();
    return state.jobs
      .filter((job) => job.organisationId === organisationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getNextQueuedJob(organisationId: string): Promise<ProcessingJob | null> {
    const state = loadState();
    const now = Date.now();
    const queued = state.jobs
      .filter((job) => {
        if (job.organisationId !== organisationId || job.status !== "queued") return false;
        const nextAttemptAt = job.payload?.nextAttemptAt;
        if (typeof nextAttemptAt !== "string") return true;
        const when = Date.parse(nextAttemptAt);
        if (Number.isNaN(when)) return true;
        return when <= now;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return queued[0] ?? null;
  }

  async updateJob(input: UpdateJobInput): Promise<ProcessingJob | null> {
    const state = loadState();
    const job = state.jobs.find((item) => item.organisationId === input.organisationId && item.id === input.jobId);
    if (!job) return null;
    job.status = input.status;
    if (input.errorMessage !== undefined) {
      job.errorMessage = input.errorMessage;
    }
    job.updatedAt = nowIso();
    job.payload = { ...job.payload, ...(input.payloadPatch ?? {}) };
    if (input.status === "running") {
      job.attempts += 1;
    }
    saveState(state);
    return job;
  }
}

export function resetMemoryRepository() {
  if (process.env.NODE_ENV === "test") {
    runtimeState = structuredClone(initialState);
    return;
  }
  saveState(structuredClone(initialState));
}
