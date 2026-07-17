import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";
import {
  type CreateMemberInviteInput,
  type ContactSubmissionInput,
  type CreateJobInput,
  type CreateOrganisationInput,
  type CreateSourceInput,
  type CreateReviewedExampleInput,
  type CreateFeedbackInput,
  type IngestionLogInput,
  type InsertExtractionInput,
  type OperatorRepository,
  type ReviewEventInput,
  type ReviewQueuePayload,
  type ReviewQueueItem,
  type ReviewQueueSection,
  type UpdateJobInput,
  type UpdateSourceStatusInput,
} from "@/lib/repository/interface";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
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

function mapSource(row: Record<string, unknown>): Source {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    title: String(row.title),
    sourceType: String(row.source_type),
    authorityLevel: row.authority_level ? String(row.authority_level) : null,
    fileUrl: row.file_url ? String(row.file_url) : null,
    rawText: row.raw_text ? String(row.raw_text) : null,
    processingStatus: row.processing_status as Source["processingStatus"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapOrganisation(row: Record<string, unknown>): Organisation {
  return {
    id: String(row.id),
    name: String(row.name),
    industry: row.industry ? String(row.industry) : null,
    riskTolerance: String(row.risk_tolerance ?? "medium"),
    autoSendAllowed: Boolean(row.auto_send_allowed),
    createdAt: String(row.created_at),
  };
}

function mapOrganisationSettings(row: Record<string, unknown>): OrganisationSettings {
  return {
    organisationId: String(row.organisation_id),
    defaultTone: String(row.default_tone ?? "consultative"),
    pricingApprovalThreshold: Number(row.pricing_approval_threshold ?? 10),
    refundApprovalThreshold: Number(row.refund_approval_threshold ?? 500),
    dataRetentionDays: Number(row.data_retention_days ?? 365),
    modelProvider: String(row.model_provider ?? "openai"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    role: String(row.role ?? "member") as AppRole,
    createdAt: String(row.created_at),
  };
}

function mapMemberInvite(row: Record<string, unknown>): MemberInvite {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    email: String(row.email),
    role: String(row.role ?? "member") as AppRole,
    inviteToken: String(row.invite_token),
    status: String(row.status ?? "pending") as MemberInvite["status"],
    invitedBy: row.invited_by ? String(row.invited_by) : null,
    expiresAt: String(row.expires_at),
    acceptedBy: row.accepted_by ? String(row.accepted_by) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapPolicy(row: Record<string, unknown>): ExtractedPolicy {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    name: String(row.name),
    ruleType: String(row.rule_type ?? ""),
    description: String(row.description ?? ""),
    severity: (row.severity as ExtractedPolicy["severity"]) ?? "medium",
    status: (row.status as ExtractedPolicy["status"]) ?? "suggested",
    structuredRule: (row.structured_rule as Record<string, unknown>) ?? {},
    sourceEvidence: ((row.source_evidence as Array<{ sourceId: string; chunkIndex?: number }>) ?? []).map(
      (evidence) => ({
        sourceId: String((evidence as { sourceId?: string; source_id?: string }).sourceId ?? (evidence as { source_id?: string }).source_id),
        chunkIndex:
          (evidence as { chunkIndex?: number; chunk_index?: number }).chunkIndex ??
          (evidence as { chunk_index?: number }).chunk_index,
      })
    ),
    confidence: Number(row.confidence ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

function mapTerminology(row: Record<string, unknown>): TerminologyPattern {
  const sourceEvidence = ((row.source_evidence as Array<{ sourceId?: string; source_id?: string; chunkIndex?: number }>) ?? [])
    .map((item) => ({
      sourceId: String(item.sourceId ?? item.source_id ?? ""),
      chunkIndex:
        (item as { chunkIndex?: number; chunk_index?: number }).chunkIndex ??
        (item as { chunk_index?: number }).chunk_index,
    }))
    .filter((item) => item.sourceId.length > 0);

  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    phrase: String(row.phrase),
    normalisedPhrase: String(row.normalised_phrase ?? ""),
    frequency: Number(row.frequency),
    scenarioId: row.scenario_id ? String(row.scenario_id) : null,
    status: row.status as TerminologyPattern["status"],
    recommendation: row.recommendation ? String(row.recommendation) : null,
    sourceEvidence,
    outcomeSignal: (row.outcome_signal as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

function mapConflict(row: Record<string, unknown>): Conflict {
  const evidence = ((row.evidence as Array<{ sourceId?: string; source_id?: string; details?: string }>) ?? [])
    .map((item) => ({
      sourceId: String(item.sourceId ?? item.source_id ?? ""),
      details: String(item.details ?? ""),
    }))
    .filter((item) => item.sourceId.length > 0 && item.details.length > 0);

  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    sourceId: row.source_id ? String(row.source_id) : null,
    conflictType: String(row.conflict_type ?? ""),
    severity: (row.severity as Conflict["severity"]) ?? "medium",
    manualRule: String(row.manual_rule ?? ""),
    historicalPattern: String(row.historical_pattern ?? ""),
    recommendedResolution: String(row.recommended_resolution ?? ""),
    status: (row.status as Conflict["status"]) ?? "needs_review",
    evidence,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

function mapReviewedExample(row: Record<string, unknown>): ReviewedExample {
  return {
    id: String(row.id), organisationId: String(row.organisation_id),
    scenarioId: row.scenario_id ? String(row.scenario_id) : null,
    evaluationId: row.evaluation_id ? String(row.evaluation_id) : null,
    exampleType: row.example_type as ReviewedExample["exampleType"],
    inputMessage: String(row.input_message ?? ""), responseText: String(row.response_text ?? ""),
    rationale: String(row.rationale ?? ""), reviewedBy: String(row.reviewed_by ?? ""), createdAt: String(row.created_at),
  };
}

function mapFeedback(row: Record<string, unknown>): FeedbackRecord {
  return {
    id: String(row.id), organisationId: String(row.organisation_id),
    scenarioId: row.scenario_id ? String(row.scenario_id) : null,
    evaluationId: row.evaluation_id ? String(row.evaluation_id) : null,
    outcome: row.outcome as FeedbackRecord["outcome"], rationale: String(row.rationale ?? ""),
    correctedDraft: row.corrected_draft ? String(row.corrected_draft) : null,
    source: row.source as FeedbackRecord["source"], createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
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

export class SupabaseRepository implements OperatorRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  async createOrganisation(input: CreateOrganisationInput): Promise<Organisation> {
    const { data, error } = await this.client
      .from("organisations")
      .insert({
        name: input.name,
        industry: input.industry ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new AppError(500, "db_insert_failed", "Failed to create organisation", error);

    const userInsert = await this.client.from("users").insert({
      id: input.userId,
      organisation_id: data.id,
      email: input.email,
      name: input.userName ?? null,
      role: "owner",
    });
    if (userInsert.error) throw new AppError(500, "db_insert_failed", "Failed to create user membership", userInsert.error);

    const settingsInsert = await this.client.from("organisation_settings").insert({
      organisation_id: data.id,
      default_tone: "consultative",
      pricing_approval_threshold: 10,
      refund_approval_threshold: 500,
      data_retention_days: 365,
      model_provider: "openai",
    });
    if (settingsInsert.error) {
      throw new AppError(500, "db_insert_failed", "Failed to create organisation settings", settingsInsert.error);
    }

    return mapOrganisation(data);
  }

  async listUsers(organisationId: string): Promise<AppUser[]> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: true });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list users", error);
    return data.map((row) => mapUser(row));
  }

  async updateUserRole(organisationId: string, userId: string, role: AppRole): Promise<AppUser | null> {
    const { data, error } = await this.client
      .from("users")
      .update({ role })
      .eq("organisation_id", organisationId)
      .eq("id", userId)
      .select("*")
      .maybeSingle();
    if (error) throw new AppError(500, "db_update_failed", "Failed to update user role", error);
    if (!data) return null;
    return mapUser(data);
  }

  async upsertUserMembership(input: {
    organisationId: string;
    userId: string;
    email: string;
    role: AppRole;
    name?: string | null;
  }): Promise<AppUser> {
    const { data, error } = await this.client
      .from("users")
      .upsert(
        {
          id: input.userId,
          organisation_id: input.organisationId,
          email: input.email,
          role: input.role,
          name: input.name ?? null,
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new AppError(500, "db_upsert_failed", "Failed to upsert user membership", error);
    }
    return mapUser(data);
  }

  async createMemberInvite(input: CreateMemberInviteInput): Promise<MemberInvite> {
    const { data, error } = await this.client
      .from("member_invites")
      .insert({
        organisation_id: input.organisationId,
        email: input.email.toLowerCase(),
        role: input.role,
        invite_token: input.inviteToken,
        status: "pending",
        invited_by: input.invitedBy,
        expires_at: input.expiresAt,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError(500, "db_insert_failed", "Failed to create member invite", error);
    }
    return mapMemberInvite(data);
  }

  async listMemberInvites(organisationId: string): Promise<MemberInvite[]> {
    const { data, error } = await this.client
      .from("member_invites")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) {
      throw new AppError(500, "db_read_failed", "Failed to list member invites", error);
    }
    return data.map((row) => mapMemberInvite(row));
  }

  async getMemberInviteByToken(token: string): Promise<MemberInvite | null> {
    const { data, error } = await this.client
      .from("member_invites")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle();
    if (error) {
      throw new AppError(500, "db_read_failed", "Failed to read member invite", error);
    }
    if (!data) return null;
    return mapMemberInvite(data);
  }

  async updateMemberInviteStatus(
    inviteId: string,
    status: MemberInvite["status"],
    patch?: Partial<Pick<MemberInvite, "acceptedBy" | "acceptedAt">>
  ): Promise<MemberInvite | null> {
    const { data, error } = await this.client
      .from("member_invites")
      .update({
        status,
        accepted_by: patch?.acceptedBy ?? null,
        accepted_at: patch?.acceptedAt ?? null,
      })
      .eq("id", inviteId)
      .select("*")
      .maybeSingle();
    if (error) {
      throw new AppError(500, "db_update_failed", "Failed to update member invite", error);
    }
    if (!data) return null;
    return mapMemberInvite(data);
  }

  async getOrganisation(organisationId: string): Promise<Organisation | null> {
    const { data, error } = await this.client
      .from("organisations")
      .select("*")
      .eq("id", organisationId)
      .maybeSingle();
    if (error) throw new AppError(500, "db_read_failed", "Failed to get organisation", error);
    if (!data) return null;
    return mapOrganisation(data);
  }

  async updateOrganisation(
    organisationId: string,
    patch: Partial<Pick<Organisation, "name" | "industry" | "riskTolerance" | "autoSendAllowed">>
  ): Promise<Organisation | null> {
    const { data, error } = await this.client
      .from("organisations")
      .update({
        name: patch.name,
        industry: patch.industry,
        risk_tolerance: patch.riskTolerance,
        auto_send_allowed: patch.autoSendAllowed,
      })
      .eq("id", organisationId)
      .select("*")
      .maybeSingle();
    if (error) throw new AppError(500, "db_update_failed", "Failed to update organisation", error);
    if (!data) return null;
    return mapOrganisation(data);
  }

  async getOrganisationSettings(organisationId: string): Promise<OrganisationSettings | null> {
    const { data, error } = await this.client
      .from("organisation_settings")
      .select("*")
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (error) throw new AppError(500, "db_read_failed", "Failed to get organisation settings", error);
    if (!data) return null;
    return mapOrganisationSettings(data);
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
    const { data, error } = await this.client
      .from("organisation_settings")
      .upsert(
        {
          organisation_id: organisationId,
          default_tone: patch.defaultTone,
          pricing_approval_threshold: patch.pricingApprovalThreshold,
          refund_approval_threshold: patch.refundApprovalThreshold,
          data_retention_days: patch.dataRetentionDays,
          model_provider: patch.modelProvider,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organisation_id" }
      )
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError(500, "db_update_failed", "Failed to upsert organisation settings", error);
    }
    return mapOrganisationSettings(data);
  }

  async createSource(input: CreateSourceInput): Promise<Source> {
    const { data, error } = await this.client
      .from("sources")
      .insert({
        organisation_id: input.organisationId,
        title: input.title,
        source_type: input.sourceType,
        authority_level: input.authorityLevel ?? null,
        file_url: input.fileUrl ?? null,
        raw_text: input.rawText ?? null,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();
    if (error || !data) throw new AppError(500, "db_insert_failed", "Failed to create source", error);
    return mapSource(data);
  }

  async listSources(organisationId: string): Promise<SourceWithStats[]> {
    const { data, error } = await this.client
      .from("sources")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list sources", error);

    const { data: policies } = await this.client.from("policies").select("id, source_evidence").eq("organisation_id", organisationId);
    const { data: terms } = await this.client
      .from("terminology_patterns")
      .select("id, source_evidence")
      .eq("organisation_id", organisationId);
    const { data: scenarios } = await this.client.from("scenarios").select("id, source_id").eq("organisation_id", organisationId);

    return data.map((row) => {
      const source = mapSource(row);
      const policyCount =
        policies?.filter((policy) =>
          ((policy.source_evidence as Array<{ source_id?: string; sourceId?: string }>) ?? []).some(
            (item) => (item.source_id ?? item.sourceId) === source.id
          )
        ).length ?? 0;
      const phraseCount =
        terms?.filter((term) =>
          ((term.source_evidence as Array<{ source_id?: string; sourceId?: string }>) ?? []).some(
            (item) => (item.source_id ?? item.sourceId) === source.id
          )
        ).length ?? 0;
      const scenarioCount = scenarios?.filter((scenario) => scenario.source_id === source.id).length ?? 0;

      return {
        ...source,
        policyCount,
        phraseCount,
        scenarioCount,
      };
    });
  }

  async getSourceById(organisationId: string, sourceId: string): Promise<Source | null> {
    const { data, error } = await this.client
      .from("sources")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("id", sourceId)
      .single();
    if (error?.code === "PGRST116") return null;
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to load source", error);
    return mapSource(data);
  }

  async deleteSource(organisationId: string, sourceId: string): Promise<void> {
    const [policies, terminology] = await Promise.all([
      this.listPolicies(organisationId),
      this.listTerminology(organisationId),
    ]);

    const policyIds = policies
      .filter((policy) => policy.sourceEvidence.some((evidence) => evidence.sourceId === sourceId))
      .map((policy) => policy.id);
    const terminologyIds = terminology
      .filter((term) => term.sourceEvidence.some((evidence) => evidence.sourceId === sourceId))
      .map((term) => term.id);

    if (policyIds.length > 0) {
      const { error } = await this.client
        .from("policies")
        .delete()
        .eq("organisation_id", organisationId)
        .in("id", policyIds);
      if (error) throw new AppError(500, "db_delete_failed", "Failed to delete source policies", error);
    }

    if (terminologyIds.length > 0) {
      const { error } = await this.client
        .from("terminology_patterns")
        .delete()
        .eq("organisation_id", organisationId)
        .in("id", terminologyIds);
      if (error) throw new AppError(500, "db_delete_failed", "Failed to delete source terminology", error);
    }

    const { error } = await this.client
      .from("sources")
      .delete()
      .eq("organisation_id", organisationId)
      .eq("id", sourceId);
    if (error) throw new AppError(500, "db_delete_failed", "Failed to delete source", error);
  }

  async updateSourceStatus(input: UpdateSourceStatusInput): Promise<Source> {
    const current = await this.getSourceById(input.organisationId, input.sourceId);
    if (!current) throw new AppError(404, "source_not_found", "Source not found");

    const { data, error } = await this.client
      .from("sources")
      .update({
        processing_status: input.status,
        metadata: { ...current.metadata, ...(input.metadata ?? {}) },
        raw_text: input.rawText ?? current.rawText,
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", input.organisationId)
      .eq("id", input.sourceId)
      .select("*")
      .single();
    if (error || !data) throw new AppError(500, "db_update_failed", "Failed to update source status", error);
    return mapSource(data);
  }

  async replaceSourceChunks(organisationId: string, sourceId: string, chunks: SourceChunk[]): Promise<void> {
    await this.client.from("source_chunks").delete().eq("organisation_id", organisationId).eq("source_id", sourceId);
    if (chunks.length === 0) return;
    const { error } = await this.client.from("source_chunks").insert(
      chunks.map((chunk) => ({
        id: chunk.id,
        organisation_id: chunk.organisationId,
        source_id: chunk.sourceId,
        chunk_index: chunk.chunkIndex,
        chunk_text: chunk.chunkText,
        chunk_type: chunk.chunkType,
        metadata: chunk.metadata,
      }))
    );
    if (error) throw new AppError(500, "db_insert_failed", "Failed to insert source chunks", error);
  }

  async replaceExtractedData(payload: InsertExtractionInput): Promise<void> {
    const sourceId = payload.source.id;
    const organisationId = payload.source.organisationId;
    const evidenceFilter = (items: Array<{ sourceId: string; chunkIndex?: number }>) =>
      items.some((item) => item.sourceId === sourceId);

    const existingPolicies = await this.listPolicies(organisationId);
    for (const policy of existingPolicies.filter((item) => evidenceFilter(item.sourceEvidence))) {
      await this.client.from("policies").delete().eq("id", policy.id);
    }

    const existingTerms = await this.listTerminology(organisationId);
    for (const term of existingTerms.filter((item) => evidenceFilter(item.sourceEvidence))) {
      await this.client.from("terminology_patterns").delete().eq("id", term.id);
    }

    await this.client.from("scenarios").delete().eq("organisation_id", organisationId).eq("source_id", sourceId);
    await this.client.from("conflicts").delete().eq("organisation_id", organisationId).eq("source_id", sourceId);

    if (payload.policies.length > 0) {
      const { error } = await this.client.from("policies").insert(
        payload.policies.map((policy) => ({
          id: policy.id,
          organisation_id: policy.organisationId,
          name: policy.name,
          rule_type: policy.ruleType,
          description: policy.description,
          severity: policy.severity,
          status: policy.status,
          structured_rule: policy.structuredRule,
          source_evidence: policy.sourceEvidence,
          confidence: policy.confidence,
          reviewed_by: policy.reviewedBy,
          reviewed_at: policy.reviewedAt,
          updated_at: policy.updatedAt,
        }))
      );
      if (error) throw new AppError(500, "db_insert_failed", "Failed to insert policies", error);
    }

    if (payload.terminologyPatterns.length > 0) {
      const { error } = await this.client.from("terminology_patterns").insert(
        payload.terminologyPatterns.map((pattern) => ({
          id: pattern.id,
          organisation_id: pattern.organisationId,
          phrase: pattern.phrase,
          normalised_phrase: pattern.normalisedPhrase,
          frequency: pattern.frequency,
          scenario_id: pattern.scenarioId,
          status: pattern.status,
          recommendation: pattern.recommendation,
          source_evidence: pattern.sourceEvidence,
          outcome_signal: pattern.outcomeSignal,
          reviewed_by: pattern.reviewedBy,
          reviewed_at: pattern.reviewedAt,
          updated_at: pattern.updatedAt,
        }))
      );
      if (error) throw new AppError(500, "db_insert_failed", "Failed to insert terminology patterns", error);
    }

    if (payload.scenarios.length > 0) {
      const { error } = await this.client.from("scenarios").insert(
        payload.scenarios.map((scenario) => ({
          id: scenario.id,
          organisation_id: scenario.organisationId,
          source_id: scenario.sourceId,
          name: scenario.name,
          category: scenario.category,
          description: scenario.description,
          risk_level: scenario.riskLevel,
          trigger_phrases: scenario.triggerPhrases,
          approved_response_flow: scenario.approvedResponseFlow,
          forbidden_behaviours: scenario.forbiddenBehaviours,
          evaluation_rubric: scenario.evaluationRubric,
        }))
      );
      if (error) throw new AppError(500, "db_insert_failed", "Failed to insert scenarios", error);
    }

    if (payload.conflicts.length > 0) {
      const { error } = await this.client.from("conflicts").insert(
        payload.conflicts.map((conflict) => ({
          id: conflict.id,
          organisation_id: conflict.organisationId,
          source_id: conflict.sourceId,
          conflict_type: conflict.conflictType,
          severity: conflict.severity,
          manual_rule: conflict.manualRule,
          historical_pattern: conflict.historicalPattern,
          recommended_resolution: conflict.recommendedResolution,
          status: conflict.status,
          evidence: conflict.evidence,
          reviewed_by: conflict.reviewedBy,
          reviewed_at: conflict.reviewedAt,
          updated_at: conflict.updatedAt,
        }))
      );
      if (error) throw new AppError(500, "db_insert_failed", "Failed to insert conflicts", error);
    }
  }

  async listTerminology(organisationId: string): Promise<TerminologyPattern[]> {
    const { data, error } = await this.client
      .from("terminology_patterns")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("frequency", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list terminology", error);

    return data.map((row) => mapTerminology(row));
  }

  async listPolicies(organisationId: string): Promise<ExtractedPolicy[]> {
    const { data, error } = await this.client
      .from("policies")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list policies", error);
    return data.map((row) => mapPolicy(row));
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
    const { data, error } = await this.client
      .from("policies")
      .update({
        status: patch.status,
        severity: patch.severity,
        name: patch.name,
        description: patch.description,
        reviewed_by: patch.reviewedBy,
        reviewed_at: patch.reviewedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", organisationId)
      .eq("id", policyId)
      .select("*")
      .maybeSingle();

    if (error) throw new AppError(500, "db_update_failed", "Failed to patch policy", error);
    if (!data) return null;
    return mapPolicy(data);
  }

  async listScenarios(organisationId: string): Promise<Scenario[]> {
    const { data, error } = await this.client
      .from("scenarios")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list scenarios", error);
    return data.map((row) => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      sourceId: row.source_id ? String(row.source_id) : null,
      name: String(row.name),
      category: String(row.category ?? ""),
      description: String(row.description ?? ""),
      riskLevel: String(row.risk_level ?? "medium"),
      triggerPhrases: (row.trigger_phrases as string[]) ?? [],
      approvedResponseFlow: (row.approved_response_flow as string[]) ?? [],
      forbiddenBehaviours: (row.forbidden_behaviours as string[]) ?? [],
      evaluationRubric: (row.evaluation_rubric as Record<string, number>) ?? {},
      createdAt: String(row.created_at),
    }));
  }

  async listConflicts(organisationId: string): Promise<Conflict[]> {
    const { data, error } = await this.client
      .from("conflicts")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list conflicts", error);
    return data.map((row) => mapConflict(row));
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

  async getScenarioById(organisationId: string, scenarioId: string): Promise<Scenario | null> {
    const { data, error } = await this.client
      .from("scenarios")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("id", scenarioId)
      .maybeSingle();
    if (error) throw new AppError(500, "db_read_failed", "Failed to read scenario", error);
    if (!data) return null;
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      sourceId: data.source_id ? String(data.source_id) : null,
      name: String(data.name),
      category: String(data.category ?? ""),
      description: String(data.description ?? ""),
      riskLevel: String(data.risk_level ?? "medium"),
      triggerPhrases: (data.trigger_phrases as string[]) ?? [],
      approvedResponseFlow: (data.approved_response_flow as string[]) ?? [],
      forbiddenBehaviours: (data.forbidden_behaviours as string[]) ?? [],
      evaluationRubric: (data.evaluation_rubric as Record<string, number>) ?? {},
      createdAt: String(data.created_at),
    };
  }

  async patchConflict(
    organisationId: string,
    conflictId: string,
    patch: Partial<
      Pick<Conflict, "status" | "severity" | "recommendedResolution" | "reviewedBy" | "reviewedAt">
    >
  ): Promise<Conflict | null> {
    const { data, error } = await this.client
      .from("conflicts")
      .update({
        status: patch.status,
        severity: patch.severity,
        recommended_resolution: patch.recommendedResolution,
        reviewed_by: patch.reviewedBy,
        reviewed_at: patch.reviewedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", organisationId)
      .eq("id", conflictId)
      .select("*")
      .maybeSingle();
    if (error) throw new AppError(500, "db_update_failed", "Failed to patch conflict", error);
    if (!data) return null;
    return mapConflict(data);
  }

  async patchTerminology(
    organisationId: string,
    terminologyId: string,
    patch: Partial<
      Pick<TerminologyPattern, "status" | "recommendation" | "reviewedBy" | "reviewedAt">
    >
  ): Promise<TerminologyPattern | null> {
    const { data, error } = await this.client
      .from("terminology_patterns")
      .update({
        status: patch.status,
        recommendation: patch.recommendation,
        reviewed_by: patch.reviewedBy,
        reviewed_at: patch.reviewedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", organisationId)
      .eq("id", terminologyId)
      .select("*")
      .maybeSingle();
    if (error) throw new AppError(500, "db_update_failed", "Failed to patch terminology", error);
    if (!data) return null;
    return mapTerminology(data);
  }

  async createEvaluation(
    organisationId: string,
    record: Omit<EvaluationRecord, "id" | "organisationId" | "createdAt">
  ): Promise<EvaluationRecord> {
    const { data, error } = await this.client
      .from("evaluations")
      .insert({
        organisation_id: organisationId,
        scenario_id: record.scenarioId,
        input_message: record.inputMessage,
        original_draft: record.originalDraft,
        repaired_draft: record.repairedDraft,
        detected_phrases: record.detectedPhrases,
        missing_required_elements: record.missingRequiredElements,
        policy_violations: record.policyViolations,
        scores: record.scores,
        approval_required: record.approvalRequired,
        repair_required: record.repairRequired,
      })
      .select("*")
      .single();
    if (error || !data) throw new AppError(500, "db_insert_failed", "Failed to create evaluation", error);
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      scenarioId: data.scenario_id ? String(data.scenario_id) : null,
      inputMessage: String(data.input_message ?? ""),
      originalDraft: String(data.original_draft ?? ""),
      repairedDraft: data.repaired_draft ? String(data.repaired_draft) : null,
      detectedPhrases: (data.detected_phrases as string[]) ?? [],
      missingRequiredElements: (data.missing_required_elements as string[]) ?? [],
      policyViolations: (data.policy_violations as string[]) ?? [],
      scores: (data.scores as EvaluationRecord["scores"]) ?? {
        total: 0,
        policyCompliance: 0,
        scenarioFlow: 0,
        approvedTerminology: 0,
        forbiddenPhraseAvoidance: 0,
        toneMatch: 0,
        clarityNextStep: 0,
      },
      approvalRequired: Boolean(data.approval_required),
      repairRequired: Boolean(data.repair_required),
      createdAt: String(data.created_at),
    };
  }

  async listEvaluations(organisationId: string): Promise<EvaluationRecord[]> {
    const { data, error } = await this.client
      .from("evaluations")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list evaluations", error);
    return data.map((row) => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      scenarioId: row.scenario_id ? String(row.scenario_id) : null,
      inputMessage: String(row.input_message ?? ""),
      originalDraft: String(row.original_draft ?? ""),
      repairedDraft: row.repaired_draft ? String(row.repaired_draft) : null,
      detectedPhrases: (row.detected_phrases as string[]) ?? [],
      missingRequiredElements: (row.missing_required_elements as string[]) ?? [],
      policyViolations: (row.policy_violations as string[]) ?? [],
      scores: (row.scores as EvaluationRecord["scores"]) ?? {
        total: 0,
        policyCompliance: 0,
        scenarioFlow: 0,
        approvedTerminology: 0,
        forbiddenPhraseAvoidance: 0,
        toneMatch: 0,
        clarityNextStep: 0,
      },
      approvalRequired: Boolean(row.approval_required),
      repairRequired: Boolean(row.repair_required),
      createdAt: String(row.created_at),
    }));
  }

  async createReviewedExample(input: CreateReviewedExampleInput): Promise<ReviewedExample> {
    const { data, error } = await this.client.from("reviewed_examples").insert({
      organisation_id: input.organisationId, scenario_id: input.scenarioId, evaluation_id: input.evaluationId,
      example_type: input.exampleType, input_message: input.inputMessage, response_text: input.responseText,
      rationale: input.rationale, reviewed_by: input.reviewedBy,
    }).select("*").single();
    if (error || !data) throw new AppError(500, "db_insert_failed", "Failed to save reviewed example", error);
    return mapReviewedExample(data);
  }

  async listReviewedExamples(organisationId: string): Promise<ReviewedExample[]> {
    const { data, error } = await this.client.from("reviewed_examples").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list reviewed examples", error);
    return data.map((row) => mapReviewedExample(row));
  }

  async createFeedback(input: CreateFeedbackInput): Promise<FeedbackRecord> {
    const { data, error } = await this.client.from("feedback_records").insert({
      organisation_id: input.organisationId, scenario_id: input.scenarioId, evaluation_id: input.evaluationId,
      outcome: input.outcome, rationale: input.rationale, corrected_draft: input.correctedDraft,
      source: input.source, created_by: input.createdBy,
    }).select("*").single();
    if (error || !data) throw new AppError(500, "db_insert_failed", "Failed to save feedback", error);
    return mapFeedback(data);
  }

  async listFeedback(organisationId: string): Promise<FeedbackRecord[]> {
    const { data, error } = await this.client.from("feedback_records").select("*").eq("organisation_id", organisationId).order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list feedback", error);
    return data.map((row) => mapFeedback(row));
  }

  async createExport(
    organisationId: string,
    exportType: string,
    artifacts: ExportRecord["artifacts"],
    manifest?: ExportRecord["manifest"]
  ): Promise<ExportRecord> {
    const { data, error } = await this.client
      .from("exports")
      .insert({
        organisation_id: organisationId,
        export_type: exportType,
        content: {
          artifacts,
          manifest:
            manifest ??
            {
              artifactCount: artifacts.length,
              checksum: "",
              signature: "",
              signedAt: new Date().toISOString(),
            },
        },
      })
      .select("*")
      .single();
    if (error || !data) throw new AppError(500, "db_insert_failed", "Failed to create export", error);
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      exportType: String(data.export_type),
      artifacts: ((data.content as { artifacts?: ExportRecord["artifacts"] })?.artifacts ?? []) as ExportRecord["artifacts"],
      manifest: ((data.content as { manifest?: ExportRecord["manifest"] })?.manifest ?? {
        artifactCount: artifacts.length,
        checksum: "",
        signature: "",
        signedAt: String(data.created_at),
      }) as ExportRecord["manifest"],
      createdAt: String(data.created_at),
    };
  }

  async listExports(organisationId: string): Promise<ExportRecord[]> {
    const { data, error } = await this.client
      .from("exports")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list exports", error);
    return data.map((row) => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      exportType: String(row.export_type),
      artifacts: ((row.content as { artifacts?: ExportRecord["artifacts"] })?.artifacts ?? []) as ExportRecord["artifacts"],
      manifest: ((row.content as { manifest?: ExportRecord["manifest"] })?.manifest ?? {
        artifactCount: Number(
          ((row.content as { artifacts?: unknown[] })?.artifacts ?? []).length
        ),
        checksum: "",
        signature: "",
        signedAt: String(row.created_at),
      }) as ExportRecord["manifest"],
      createdAt: String(row.created_at),
    }));
  }

  async getExportById(organisationId: string, exportId: string): Promise<ExportRecord | null> {
    const { data, error } = await this.client
      .from("exports")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("id", exportId)
      .maybeSingle();
    if (error) throw new AppError(500, "db_read_failed", "Failed to get export", error);
    if (!data) return null;
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      exportType: String(data.export_type),
      artifacts: ((data.content as { artifacts?: ExportRecord["artifacts"] })?.artifacts ?? []) as ExportRecord["artifacts"],
      manifest: ((data.content as { manifest?: ExportRecord["manifest"] })?.manifest ?? {
        artifactCount: Number(
          ((data.content as { artifacts?: unknown[] })?.artifacts ?? []).length
        ),
        checksum: "",
        signature: "",
        signedAt: String(data.created_at),
      }) as ExportRecord["manifest"],
      createdAt: String(data.created_at),
    };
  }

  async createContactSubmission(input: ContactSubmissionInput): Promise<ContactRequest> {
    const { data, error } = await this.client
      .from("contact_requests")
      .insert({
        name: input.name,
        work_email: input.workEmail,
        company: input.company,
        role: input.role,
        company_size: input.companySize,
        current_ai_tools: input.currentAiTools,
        primary_use_case: input.primaryUseCase,
        message: input.message,
        source: input.source,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError(500, "db_insert_failed", "Failed to create contact request", error);
    }
    return {
      id: String(data.id),
      name: String(data.name),
      workEmail: String(data.work_email),
      company: String(data.company),
      role: String(data.role),
      companySize: String(data.company_size),
      currentAiTools: (data.current_ai_tools as string[]) ?? [],
      primaryUseCase: String(data.primary_use_case),
      message: String(data.message),
      source: String(data.source),
      createdAt: String(data.created_at),
    };
  }

  async createIngestionLog(input: IngestionLogInput): Promise<IngestionLog> {
    const { data, error } = await this.client
      .from("ingestion_logs")
      .insert({
        organisation_id: input.organisationId,
        source_id: input.sourceId,
        action: input.action,
        details: input.details,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError(500, "db_insert_failed", "Failed to create ingestion log", error);
    }
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      sourceId: data.source_id ? String(data.source_id) : null,
      action: String(data.action),
      details: (data.details as Record<string, unknown>) ?? {},
      createdAt: String(data.created_at),
    };
  }

  async listIngestionLogs(organisationId: string): Promise<IngestionLog[]> {
    const { data, error } = await this.client
      .from("ingestion_logs")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) {
      throw new AppError(500, "db_read_failed", "Failed to list ingestion logs", error);
    }
    return data.map((row) => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      sourceId: row.source_id ? String(row.source_id) : null,
      action: String(row.action),
      details: (row.details as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at),
    }));
  }

  async createReviewEvent(input: ReviewEventInput): Promise<ReviewEvent> {
    const { data, error } = await this.client
      .from("review_events")
      .insert({
        organisation_id: input.organisationId,
        item_type: input.itemType,
        item_id: input.itemId,
        action: input.action,
        actor_id: input.actorId,
        before_state: input.beforeState,
        after_state: input.afterState,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError(500, "db_insert_failed", "Failed to create review event", error);
    }
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      itemType: data.item_type as ReviewEvent["itemType"],
      itemId: String(data.item_id),
      action: data.action as ReviewEvent["action"],
      actorId: String(data.actor_id),
      beforeState: (data.before_state as Record<string, unknown>) ?? {},
      afterState: (data.after_state as Record<string, unknown>) ?? {},
      createdAt: String(data.created_at),
    };
  }

  async listReviewEvents(organisationId: string): Promise<ReviewEvent[]> {
    const { data, error } = await this.client
      .from("review_events")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) {
      throw new AppError(500, "db_read_failed", "Failed to list review events", error);
    }
    return data.map((row) => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      itemType: row.item_type as ReviewEvent["itemType"],
      itemId: String(row.item_id),
      action: row.action as ReviewEvent["action"],
      actorId: String(row.actor_id),
      beforeState: (row.before_state as Record<string, unknown>) ?? {},
      afterState: (row.after_state as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at),
    }));
  }

  async enqueueJob(input: CreateJobInput): Promise<ProcessingJob> {
    const { data, error } = await this.client
      .from("processing_jobs")
      .insert({
        organisation_id: input.organisationId,
        source_id: input.sourceId ?? null,
        job_type: input.jobType,
        status: "queued",
        attempts: 0,
        payload: input.payload,
      })
      .select("*")
      .single();
    if (error || !data) throw new AppError(500, "db_insert_failed", "Failed to enqueue job", error);
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      sourceId: data.source_id ? String(data.source_id) : null,
      jobType: data.job_type as ProcessingJob["jobType"],
      status: data.status as ProcessingJob["status"],
      attempts: Number(data.attempts ?? 0),
      payload: (data.payload as Record<string, unknown>) ?? {},
      errorMessage: data.error_message ? String(data.error_message) : null,
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
    };
  }

  async listJobs(organisationId: string): Promise<ProcessingJob[]> {
    const { data, error } = await this.client
      .from("processing_jobs")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });
    if (error || !data) throw new AppError(500, "db_read_failed", "Failed to list jobs", error);
    return data.map((row) => ({
      id: String(row.id),
      organisationId: String(row.organisation_id),
      sourceId: row.source_id ? String(row.source_id) : null,
      jobType: row.job_type as ProcessingJob["jobType"],
      status: row.status as ProcessingJob["status"],
      attempts: Number(row.attempts ?? 0),
      payload: (row.payload as Record<string, unknown>) ?? {},
      errorMessage: row.error_message ? String(row.error_message) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  async getNextQueuedJob(organisationId: string): Promise<ProcessingJob | null> {
    const { data, error } = await this.client
      .from("processing_jobs")
      .select("*")
      .eq("organisation_id", organisationId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(25);
    if (error) throw new AppError(500, "db_read_failed", "Failed to fetch queued job", error);
    if (!data || data.length === 0) return null;
    const now = Date.now();
    const candidate =
      data.find((row) => {
        const payload = (row.payload as Record<string, unknown> | null) ?? {};
        const nextAttemptAt = payload.nextAttemptAt;
        if (typeof nextAttemptAt !== "string") return true;
        const when = Date.parse(nextAttemptAt);
        if (Number.isNaN(when)) return true;
        return when <= now;
      }) ?? null;
    if (!candidate) return null;
    return {
      id: String(candidate.id),
      organisationId: String(candidate.organisation_id),
      sourceId: candidate.source_id ? String(candidate.source_id) : null,
      jobType: candidate.job_type as ProcessingJob["jobType"],
      status: candidate.status as ProcessingJob["status"],
      attempts: Number(candidate.attempts ?? 0),
      payload: (candidate.payload as Record<string, unknown>) ?? {},
      errorMessage: candidate.error_message ? String(candidate.error_message) : null,
      createdAt: String(candidate.created_at),
      updatedAt: String(candidate.updated_at),
    };
  }

  async updateJob(input: UpdateJobInput): Promise<ProcessingJob | null> {
    const existing = await this.client
      .from("processing_jobs")
      .select("*")
      .eq("organisation_id", input.organisationId)
      .eq("id", input.jobId)
      .maybeSingle();
    if (existing.error) throw new AppError(500, "db_read_failed", "Failed to load job for update", existing.error);
    if (!existing.data) return null;

    const mergedPayload = {
      ...((existing.data.payload as Record<string, unknown>) ?? {}),
      ...(input.payloadPatch ?? {}),
    };
    const nextAttempts =
      input.status === "running" ? Number(existing.data.attempts ?? 0) + 1 : Number(existing.data.attempts ?? 0);

    const { data, error } = await this.client
      .from("processing_jobs")
      .update({
        status: input.status,
        error_message:
          input.errorMessage === undefined ? existing.data.error_message : input.errorMessage,
        payload: mergedPayload,
        attempts: nextAttempts,
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", input.organisationId)
      .eq("id", input.jobId)
      .select("*")
      .maybeSingle();
    if (error) throw new AppError(500, "db_update_failed", "Failed to update job", error);
    if (!data) return null;
    return {
      id: String(data.id),
      organisationId: String(data.organisation_id),
      sourceId: data.source_id ? String(data.source_id) : null,
      jobType: data.job_type as ProcessingJob["jobType"],
      status: data.status as ProcessingJob["status"],
      attempts: Number(data.attempts ?? 0),
      payload: (data.payload as Record<string, unknown>) ?? {},
      errorMessage: data.error_message ? String(data.error_message) : null,
      createdAt: String(data.created_at),
      updatedAt: String(data.updated_at),
    };
  }
}
