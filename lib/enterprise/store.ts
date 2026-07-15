import crypto from "node:crypto";

import type { RequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";
import { decryptSecret, encryptSecret } from "@/lib/security/secrets";
import type {
  ApiCredential,
  AgentGovernanceConfig,
  ApprovalRule,
  BillingEntitlement,
  BreakGlassProtocolState,
  DeletionRequestRecord,
  LegalHoldState,
  ConnectorRecord,
  ConnectorProvider,
  ConnectorStatus,
  FeatureFlag,
  FeatureFlagKey,
  GovernancePolicy,
  LlmProvider,
  LlmProviderCredential,
  McpCapability,
  SendDecision,
  SendEvent,
  WebhookSubscription,
} from "@/lib/types";
import { defaultFeatureFlags } from "@/lib/enterprise/config";

type EnterpriseEventAction =
  | "feature_flag_upsert"
  | "agent_governance_config_upsert"
  | "approval_rule_upsert"
  | "connector_upsert"
  | "connector_revoked"
  | "connector_sync_result"
  | "sso_config_upsert"
  | "domain_allowlist_upsert"
  | "scim_group_upsert"
  | "scim_group_deleted"
  | "scim_user_status_set"
  | "scim_bulk_operation"
  | "scim_drift_reconcile_run"
  | "member_role_updated"
  | "member_invite_created"
  | "member_invite_resent"
  | "member_invite_revoked"
  | "member_invite_accepted"
  | "governance_policy_upsert"
  | "governance_policy_simulated"
  | "legal_hold_placed"
  | "legal_hold_released"
  | "legal_hold_overridden"
  | "deletion_approved"
  | "break_glass_invoked"
  | "break_glass_released"
  | "deletion_requested"
  | "deletion_completed"
  | "send_event_created"
  | "auto_send_decision_recorded"
  | "send_event_status_updated"
  | "send_event_delivery_confirmed"
  | "auto_send_kill_switch_upsert"
  | "api_key_created"
  | "api_key_revoked"
  | "llm_provider_key_upsert"
  | "llm_provider_key_revoked"
  | "webhook_created"
  | "webhook_rotated"
  | "webhook_disabled"
  | "billing_entitlement_upsert";

type EnterpriseEvent<T> = {
  action: EnterpriseEventAction;
  payload: T;
};

const ENTERPRISE_ACTION_PREFIX = "enterprise:";

export function getConnectorFlagKey(provider: ConnectorProvider): FeatureFlagKey {
  return `connector_${provider}` as FeatureFlagKey;
}

function connectorDisplay(provider: ConnectorProvider) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function keyPrefix(raw: string) {
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
}

function secretPreview(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 3)}...${trimmed.slice(-4)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export async function appendEnterpriseEvent<T extends Record<string, unknown>>(
  repository: OperatorRepository,
  context: RequestContext,
  event: EnterpriseEvent<T>
) {
  return repository.createIngestionLog({
    organisationId: context.organisationId,
    sourceId: null,
    action: `${ENTERPRISE_ACTION_PREFIX}${event.action}`,
    details: {
      ...event.payload,
      actorId: context.userId,
    },
  });
}

async function listEnterpriseEvents(repository: OperatorRepository, organisationId: string) {
  const logs = await repository.listIngestionLogs(organisationId);
  return logs
    .filter((item) => item.action.startsWith(ENTERPRISE_ACTION_PREFIX))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function resolveFeatureFlags(
  repository: OperatorRepository,
  organisationId: string
): Promise<FeatureFlag[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const flags = new Map<FeatureFlagKey, FeatureFlag>();
  const now = nowIso();
  (Object.keys(defaultFeatureFlags) as FeatureFlagKey[]).forEach((key) => {
    flags.set(key, {
      key,
      enabled: defaultFeatureFlags[key],
      rolloutPercent: 100,
      updatedAt: now,
      updatedBy: "system",
    });
  });

  events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}feature_flag_upsert`)
    .forEach((item) => {
      const details = item.details as Partial<FeatureFlag>;
      if (!details.key) return;
      flags.set(details.key, {
        key: details.key,
        enabled: Boolean(details.enabled),
        rolloutPercent: Number(details.rolloutPercent ?? 100),
        updatedBy: String(details.updatedBy ?? details.updatedBy ?? "unknown"),
        updatedAt: item.createdAt,
      });
    });

  return Array.from(flags.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export async function isFeatureEnabledForOrg(
  repository: OperatorRepository,
  organisationId: string,
  key: FeatureFlagKey
) {
  const flags = await resolveFeatureFlags(repository, organisationId);
  const flag = flags.find((item) => item.key === key);
  if (!flag) return false;
  if (!flag.enabled) return false;
  return flag.rolloutPercent >= 100 || Math.random() * 100 <= flag.rolloutPercent;
}

export async function resolveApprovalRules(
  repository: OperatorRepository,
  organisationId: string
): Promise<ApprovalRule[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<string, ApprovalRule>();
  for (const item of events) {
    if (item.action !== `${ENTERPRISE_ACTION_PREFIX}approval_rule_upsert`) continue;
    const details = item.details as ApprovalRule;
    map.set(details.id, {
      ...details,
      organisationId,
      updatedAt: item.createdAt,
    });
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function resolveAgentGovernanceConfigs(
  repository: OperatorRepository,
  organisationId: string
): Promise<AgentGovernanceConfig[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<string, AgentGovernanceConfig>();
  for (const item of events) {
    if (item.action !== `${ENTERPRISE_ACTION_PREFIX}agent_governance_config_upsert`) continue;
    const details = item.details as AgentGovernanceConfig;
    map.set(details.id, {
      ...details,
      organisationId,
      updatedAt: item.createdAt,
    });
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function resolveAgentGovernanceConfig(
  repository: OperatorRepository,
  organisationId: string,
  input: {
    agentId: string;
    channel: string;
    useCase: string;
    customerSegment: string;
  }
) {
  const configs = await resolveAgentGovernanceConfigs(repository, organisationId);
  return (
    configs.find(
      (item) =>
        item.enabled &&
        item.agentId === input.agentId &&
        item.channel === input.channel &&
        item.useCase === input.useCase &&
        item.customerSegment === input.customerSegment
    ) ?? null
  );
}

export async function resolveConnectors(
  repository: OperatorRepository,
  organisationId: string
): Promise<ConnectorRecord[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<ConnectorProvider, ConnectorRecord>();

  for (const item of events) {
    const details = item.details as Record<string, unknown>;
    const provider = details.provider as ConnectorProvider | undefined;
    if (!provider) continue;

    if (item.action === `${ENTERPRISE_ACTION_PREFIX}connector_upsert`) {
      const existing = map.get(provider);
      const createdAt = existing?.createdAt ?? item.createdAt;
      map.set(provider, {
        id: existing?.id ?? crypto.randomUUID(),
        organisationId,
        provider,
        status: (details.status as ConnectorStatus) ?? existing?.status ?? "connected",
        displayName: String(details.displayName ?? connectorDisplay(provider)),
        scopes: Array.isArray(details.scopes) ? details.scopes.map(String) : (existing?.scopes ?? []),
        connectionHealth: (details.connectionHealth as "healthy" | "degraded" | "offline") ?? "healthy",
        sourceSelection: Array.isArray(details.sourceSelection)
          ? details.sourceSelection.map(String)
          : (existing?.sourceSelection ?? []),
        syncSchedule: (details.syncSchedule as "manual" | "hourly" | "daily") ?? "manual",
        lastSyncAt: existing?.lastSyncAt ?? null,
        lastSyncStatus: existing?.lastSyncStatus ?? "never",
        lastSyncError: existing?.lastSyncError ?? null,
        tokenRef: typeof details.tokenRef === "string" ? details.tokenRef : existing?.tokenRef ?? null,
        metadata: typeof details.metadata === "object" && details.metadata ? (details.metadata as Record<string, unknown>) : {},
        createdAt,
        updatedAt: item.createdAt,
      });
    }

    if (item.action === `${ENTERPRISE_ACTION_PREFIX}connector_revoked`) {
      const existing = map.get(provider);
      if (!existing) continue;
      map.set(provider, { ...existing, status: "revoked", connectionHealth: "offline", updatedAt: item.createdAt });
    }

    if (item.action === `${ENTERPRISE_ACTION_PREFIX}connector_sync_result`) {
      const existing = map.get(provider);
      if (!existing) continue;
      const status = String(details.syncStatus ?? "failed");
      map.set(provider, {
        ...existing,
        lastSyncAt: item.createdAt,
        lastSyncStatus: status === "succeeded" ? "succeeded" : "failed",
        lastSyncError: status === "succeeded" ? null : String(details.error ?? "sync failed"),
        updatedAt: item.createdAt,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.provider.localeCompare(b.provider));
}

export async function getConnectorAccessToken(
  repository: OperatorRepository,
  organisationId: string,
  provider: ConnectorProvider
) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const relevant = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}connector_upsert`)
    .filter((item) => String((item.details as Record<string, unknown>).provider ?? "") === provider);
  const latest = relevant.at(-1);
  if (!latest) return null;
  const tokenEncrypted = (latest.details as Record<string, unknown>).tokenEncrypted as string | undefined;
  if (!tokenEncrypted) return null;
  return decryptSecret(tokenEncrypted);
}

export async function upsertConnectorEvent(
  repository: OperatorRepository,
  context: RequestContext,
  input: {
    provider: ConnectorProvider;
    displayName: string;
    scopes: string[];
    sourceSelection: string[];
    syncSchedule: "manual" | "hourly" | "daily";
    token?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const current = (await resolveConnectors(repository, context.organisationId)).find(
    (item) => item.provider === input.provider
  );
  const payload = {
    provider: input.provider,
    displayName: input.displayName,
    scopes: input.scopes,
    sourceSelection: input.sourceSelection,
    syncSchedule: input.syncSchedule,
    tokenRef:
      current?.tokenRef ??
      (typeof input.metadata?.tokenRef === "string" ? input.metadata.tokenRef : null),
    tokenEncrypted: input.token ? encryptSecret(input.token) : undefined,
    status: "connected",
    connectionHealth: "healthy",
    metadata: input.metadata ?? current?.metadata ?? {},
  };
  await appendEnterpriseEvent(repository, context, {
    action: "connector_upsert",
    payload,
  });
}

export async function resolveSendEvents(
  repository: OperatorRepository,
  organisationId: string
): Promise<SendEvent[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<string, SendEvent>();
  for (const item of events) {
    if (item.action === `${ENTERPRISE_ACTION_PREFIX}send_event_created`) {
      const details = item.details as Partial<SendEvent> & { id?: string };
      const id = typeof details.id === "string" ? details.id : "";
      if (!id) continue;
      const createdAt = typeof details.createdAt === "string" ? details.createdAt : item.createdAt;
      map.set(id, {
        id,
        organisationId,
        evaluationId: typeof details.evaluationId === "string" ? details.evaluationId : null,
        scenarioId: typeof details.scenarioId === "string" ? details.scenarioId : null,
        workspaceId: typeof details.workspaceId === "string" ? details.workspaceId : null,
        channel: typeof details.channel === "string" ? details.channel : "unknown",
        recipient: typeof details.recipient === "string" ? details.recipient : "unknown",
        draft: typeof details.draft === "string" ? details.draft : "",
        status: (details.status as SendEvent["status"]) ?? "queued",
        reason: typeof details.reason === "string" ? details.reason : "",
        evidence: Array.isArray(details.evidence) ? details.evidence.map(String) : [],
        autoSend: Boolean(details.autoSend),
        decisionSnapshot: details.decisionSnapshot ?? {
          allowed: Boolean(details.autoSend),
          state: Boolean(details.autoSend) ? "allowed" : "blocked",
          reason: typeof details.reason === "string" ? details.reason : "",
          matchedRuleId: null,
          approvalRequired: !Boolean(details.autoSend),
          approvalDecisionStatus: Boolean(details.autoSend) ? "approved" : "review_required",
          approvalDecisionReason: typeof details.reason === "string" ? details.reason : "",
          approvalDecisionRuleId: null,
        },
        reviewState: details.reviewState ?? {
          required: !Boolean(details.autoSend),
          status: Boolean(details.autoSend) ? "not_required" : "pending",
          reviewerId: null,
          reviewedAt: null,
        },
        riskState: details.riskState ?? {
          score: 0,
          riskLevel: "unknown",
          overrideApplied: false,
          overrideReason: null,
        },
        connectorTarget: details.connectorTarget ?? {
          channel: typeof details.channel === "string" ? details.channel : "unknown",
          recipient: typeof details.recipient === "string" ? details.recipient : "unknown",
          workspaceId: typeof details.workspaceId === "string" ? details.workspaceId : null,
          providerHint: null,
        },
        delivery: details.delivery ?? {
          state: Boolean(details.autoSend) ? "attempted" : "not_started",
          queuedAt: createdAt,
          lastAttemptAt: Boolean(details.autoSend) ? createdAt : null,
          confirmedAt: null,
          confirmationSource: null,
          confirmationId: null,
          failureReason: null,
        },
        createdBy: typeof details.createdBy === "string" ? details.createdBy : "unknown",
        createdAt,
        updatedAt: typeof details.updatedAt === "string" ? details.updatedAt : createdAt,
      });
      continue;
    }

    if (item.action === `${ENTERPRISE_ACTION_PREFIX}send_event_status_updated`) {
      const details = item.details as Record<string, unknown>;
      const id = String(details.id ?? "");
      const current = map.get(id);
      if (!current) continue;
      const status = String(details.status ?? "") as SendEvent["status"];
      const reason = String(details.reason ?? current.reason);
      const nextDeliveryState =
        status === "sent"
          ? "confirmed"
          : status === "failed"
            ? "failed"
            : status === "blocked"
              ? "not_started"
              : current.delivery.state;
      map.set(id, {
        ...current,
        status,
        reason,
        delivery: {
          ...current.delivery,
          state: nextDeliveryState,
          lastAttemptAt: item.createdAt,
          failureReason: status === "failed" ? reason : status === "blocked" ? reason : null,
        },
        updatedAt: item.createdAt,
      });
      continue;
    }

    if (item.action === `${ENTERPRISE_ACTION_PREFIX}send_event_delivery_confirmed`) {
      const details = item.details as Record<string, unknown>;
      const id = String(details.id ?? "");
      const current = map.get(id);
      if (!current) continue;
      const confirmationSource = String(details.confirmationSource ?? "auto_send_worker");
      const confirmationId = String(details.confirmationId ?? "");
      map.set(id, {
        ...current,
        status: "sent",
        reason: String(details.reason ?? current.reason),
        delivery: {
          ...current.delivery,
          state: "confirmed",
          confirmedAt: item.createdAt,
          lastAttemptAt: item.createdAt,
          confirmationSource:
            confirmationSource === "provider_callback" || confirmationSource === "manual_override"
              ? confirmationSource
              : "auto_send_worker",
          confirmationId: confirmationId || null,
          failureReason: null,
        },
        updatedAt: item.createdAt,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function resolveAutoSendDecisionRecord(
  repository: OperatorRepository,
  organisationId: string,
  requestKey: string
): Promise<{ decision: SendDecision; sendEvent: SendEvent } | null> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const match = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}auto_send_decision_recorded`)
    .filter((item) => String((item.details as Record<string, unknown>).requestKey ?? "") === requestKey)
    .at(-1);
  if (!match) return null;
  const details = match.details as {
    decision: SendDecision;
    sendEvent: SendEvent;
  };
  if (!details?.decision || !details?.sendEvent) return null;
  return {
    decision: details.decision,
    sendEvent: details.sendEvent,
  };
}

export async function resolveAutoSendKillSwitchState(
  repository: OperatorRepository,
  organisationId: string
) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const relevant = events.filter(
    (item) => item.action === `${ENTERPRISE_ACTION_PREFIX}auto_send_kill_switch_upsert`
  );

  const globalState = {
    active: false,
    reason: "not_set",
    updatedAt: nowIso(),
    updatedBy: "system",
  };
  const workspaces = new Map<
    string,
    { workspaceId: string; active: boolean; reason: string; updatedAt: string; updatedBy: string }
  >();

  for (const event of relevant) {
    const details = event.details as Record<string, unknown>;
    const scope = String(details.scope ?? "global");
    const active = Boolean(details.active);
    const reason = String(details.reason ?? "not_set");
    const updatedBy = String(details.actorId ?? "unknown");
    if (scope === "workspace") {
      const workspaceId = String(details.workspaceId ?? "").trim();
      if (!workspaceId) continue;
      workspaces.set(workspaceId, {
        workspaceId,
        active,
        reason,
        updatedAt: event.createdAt,
        updatedBy,
      });
      continue;
    }
    globalState.active = active;
    globalState.reason = reason;
    globalState.updatedAt = event.createdAt;
    globalState.updatedBy = updatedBy;
  }

  return {
    global: globalState,
    workspaces: Array.from(workspaces.values()).sort((a, b) =>
      a.workspaceId.localeCompare(b.workspaceId)
    ),
  };
}

export async function resolveApiCredentials(
  repository: OperatorRepository,
  organisationId: string
): Promise<ApiCredential[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<string, ApiCredential>();
  for (const item of events) {
    const details = item.details as Record<string, unknown>;
    if (item.action === `${ENTERPRISE_ACTION_PREFIX}api_key_created`) {
      const record = details as ApiCredential;
      map.set(record.id, record);
    }
    if (item.action === `${ENTERPRISE_ACTION_PREFIX}api_key_revoked`) {
      const id = String(details.id ?? "");
      const existing = map.get(id);
      if (!existing) continue;
      map.set(id, { ...existing, status: "revoked", revokedAt: item.createdAt });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createApiCredential(
  repository: OperatorRepository,
  context: RequestContext,
  input: { name: string; scopes: string[] }
) {
  const raw = `opl_${crypto.randomBytes(20).toString("hex")}`;
  const record: ApiCredential = {
    id: crypto.randomUUID(),
    organisationId: context.organisationId,
    name: input.name,
    keyPrefix: keyPrefix(raw),
    scopes: input.scopes,
    status: "active",
    createdBy: context.userId,
    createdAt: nowIso(),
    revokedAt: null,
  };
  await appendEnterpriseEvent(repository, context, {
    action: "api_key_created",
    payload: { ...record, hashedKey: hash(raw) },
  });
  return {
    record,
    rawKey: raw,
  };
}

export async function resolveApiCredentialByRawKey(
  repository: OperatorRepository,
  organisationId: string,
  rawKey: string
) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const hashed = hash(rawKey);
  const created = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}api_key_created`)
    .map((item) => item.details as Record<string, unknown>)
    .find((item) => String(item.hashedKey ?? "") === hashed);
  if (!created) return null;
  const id = String(created.id ?? "");
  const credentials = await resolveApiCredentials(repository, organisationId);
  const current = credentials.find((item) => item.id === id);
  if (!current || current.status !== "active") return null;
  return current;
}

function defaultModelForProvider(provider: LlmProvider) {
  if (provider === "openai") return process.env.OPERATORLAYER_MODEL ?? "gpt-4.1-mini";
  if (provider === "anthropic") return "claude-3-5-sonnet-latest";
  if (provider === "google") return "gemini-1.5-pro";
  if (provider === "azure_openai") return process.env.OPERATORLAYER_MODEL ?? "gpt-4.1-mini";
  return "custom";
}

export async function resolveLlmProviderCredentials(
  repository: OperatorRepository,
  organisationId: string
): Promise<LlmProviderCredential[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<string, LlmProviderCredential>();
  let activeId: string | null = null;

  for (const item of events) {
    const details = item.details as Record<string, unknown>;
    if (item.action === `${ENTERPRISE_ACTION_PREFIX}llm_provider_key_upsert`) {
      const id = String(details.id ?? crypto.randomUUID());
      const provider = String(details.provider ?? "openai") as LlmProvider;
      const existing = map.get(id);
      map.set(id, {
        id,
        organisationId,
        provider,
        displayName: String(details.displayName ?? existing?.displayName ?? provider),
        model: String(details.model ?? existing?.model ?? defaultModelForProvider(provider)),
        baseUrl: typeof details.baseUrl === "string" ? details.baseUrl : existing?.baseUrl ?? null,
        keyPreview: String(details.keyPreview ?? existing?.keyPreview ?? "********"),
        status: "active",
        active: Boolean(details.active),
        createdBy: String(details.createdBy ?? existing?.createdBy ?? details.actorId ?? "unknown"),
        createdAt: String(details.createdAt ?? existing?.createdAt ?? item.createdAt),
        updatedAt: item.createdAt,
        revokedAt: null,
      });
      if (details.active === true) activeId = id;
    }

    if (item.action === `${ENTERPRISE_ACTION_PREFIX}llm_provider_key_revoked`) {
      const id = String(details.id ?? "");
      const existing = map.get(id);
      if (!existing) continue;
      map.set(id, {
        ...existing,
        status: "revoked",
        active: false,
        updatedAt: item.createdAt,
        revokedAt: item.createdAt,
      });
      if (activeId === id) activeId = null;
    }
  }

  const items = Array.from(map.values()).map((item) => ({
    ...item,
    active: item.status === "active" && item.id === activeId,
  }));
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertLlmProviderCredential(
  repository: OperatorRepository,
  context: RequestContext,
  input: {
    provider: LlmProvider;
    displayName: string;
    model?: string;
    apiKey: string;
    baseUrl?: string | null;
    setActive?: boolean;
  }
) {
  const provider = input.provider;
  const now = nowIso();
  const record: LlmProviderCredential = {
    id: crypto.randomUUID(),
    organisationId: context.organisationId,
    provider,
    displayName: input.displayName,
    model: input.model ?? defaultModelForProvider(provider),
    baseUrl: input.baseUrl ?? null,
    keyPreview: secretPreview(input.apiKey),
    status: "active",
    active: input.setActive ?? true,
    createdBy: context.userId,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
  };

  await appendEnterpriseEvent(repository, context, {
    action: "llm_provider_key_upsert",
    payload: {
      ...record,
      secretEncrypted: encryptSecret(input.apiKey),
    },
  });

  return record;
}

export async function revokeLlmProviderCredential(
  repository: OperatorRepository,
  context: RequestContext,
  id: string
) {
  const credentials = await resolveLlmProviderCredentials(repository, context.organisationId);
  const existing = credentials.find((item) => item.id === id);
  if (!existing) {
    throw new AppError(404, "llm_provider_key_not_found", "LLM provider key not found.");
  }
  await appendEnterpriseEvent(repository, context, {
    action: "llm_provider_key_revoked",
    payload: { id, provider: existing.provider },
  });
  return { ...existing, status: "revoked" as const, active: false, revokedAt: nowIso() };
}

export async function hasActiveLlmProviderCredential(repository: OperatorRepository, organisationId: string) {
  const credentials = await resolveLlmProviderCredentials(repository, organisationId);
  return credentials.some((item) => item.status === "active" && item.active);
}

export async function resolveActiveLlmRoute(repository: OperatorRepository, organisationId: string) {
  const credentials = await resolveLlmProviderCredentials(repository, organisationId);
  const active = credentials.find((item) => item.status === "active" && item.active);
  if (!active) return null;

  const events = await listEnterpriseEvents(repository, organisationId);
  const latestSecret = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}llm_provider_key_upsert`)
    .map((item) => item.details as Record<string, unknown>)
    .filter((details) => String(details.id ?? "") === active.id)
    .at(-1)?.secretEncrypted;

  if (typeof latestSecret !== "string") {
    throw new AppError(409, "llm_provider_key_secret_missing", "Active LLM provider key has no stored secret.");
  }

  return {
    credential: active,
    apiKey: decryptSecret(latestSecret),
  };
}

export async function resolveWebhookSubscriptions(
  repository: OperatorRepository,
  organisationId: string
): Promise<WebhookSubscription[]> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<string, WebhookSubscription>();
  for (const item of events) {
    const details = item.details as Record<string, unknown>;
    if (item.action === `${ENTERPRISE_ACTION_PREFIX}webhook_created`) {
      const record = details as WebhookSubscription;
      map.set(record.id, record);
    }
    if (item.action === `${ENTERPRISE_ACTION_PREFIX}webhook_rotated`) {
      const id = String(details.id ?? "");
      const existing = map.get(id);
      if (!existing) continue;
      map.set(id, { ...existing, secretPreview: String(details.secretPreview ?? existing.secretPreview), updatedAt: item.createdAt });
    }
    if (item.action === `${ENTERPRISE_ACTION_PREFIX}webhook_disabled`) {
      const id = String(details.id ?? "");
      const existing = map.get(id);
      if (!existing) continue;
      map.set(id, { ...existing, status: "disabled", updatedAt: item.createdAt });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createWebhookSubscription(
  repository: OperatorRepository,
  context: RequestContext,
  input: { endpoint: string; events: string[] }
) {
  const secret = `whsec_${crypto.randomBytes(20).toString("hex")}`;
  const record: WebhookSubscription = {
    id: crypto.randomUUID(),
    organisationId: context.organisationId,
    endpoint: input.endpoint,
    events: input.events,
    secretPreview: keyPrefix(secret),
    status: "active",
    createdBy: context.userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await appendEnterpriseEvent(repository, context, {
    action: "webhook_created",
    payload: {
      ...record,
      secretEncrypted: encryptSecret(secret),
      secretHash: hash(secret),
    },
  });
  return {
    record,
    secret,
  };
}

export async function rotateWebhookSecret(
  repository: OperatorRepository,
  context: RequestContext,
  webhookId: string
) {
  const existing = await resolveWebhookSubscriptions(repository, context.organisationId);
  const target = existing.find((item) => item.id === webhookId);
  if (!target) {
    throw new AppError(404, "webhook_not_found", "Webhook subscription not found.");
  }
  const secret = `whsec_${crypto.randomBytes(20).toString("hex")}`;
  await appendEnterpriseEvent(repository, context, {
    action: "webhook_rotated",
    payload: {
      id: target.id,
      secretPreview: keyPrefix(secret),
      secretEncrypted: encryptSecret(secret),
      secretHash: hash(secret),
    },
  });
  return {
    id: target.id,
    secret,
    secretPreview: keyPrefix(secret),
  };
}

export async function resolveBillingEntitlement(
  repository: OperatorRepository,
  organisationId: string
): Promise<BillingEntitlement> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const upserts = events.filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}billing_entitlement_upsert`);
  const latest = upserts[upserts.length - 1];
  if (!latest) {
    return {
      organisationId,
      plan: "starter",
      seatsLimit: 5,
      evaluationsMonthlyLimit: 200,
      sourcesMonthlyLimit: 20,
      connectorLimit: 1,
      autoSendEnabled: false,
      apiAccessEnabled: false,
      mcpAccessEnabled: false,
      status: "active",
      updatedAt: nowIso(),
    };
  }
  return latest.details as BillingEntitlement;
}

export const mcpCapabilities: McpCapability[] = [
  {
    id: "policy_pack.fetch",
    title: "Fetch Policy Pack",
    description: "Retrieve the latest export-ready policy pack manifest and artifacts.",
    requiredFlag: "mcp_actions",
    requiredScope: "policy.read",
  },
  {
    id: "draft.evaluate",
    title: "Evaluate Draft",
    description: "Evaluate a draft against organisation rules and return structured violations.",
    requiredFlag: "mcp_actions",
    requiredScope: "evaluation.write",
  },
  {
    id: "draft.repair",
    title: "Repair Draft",
    description: "Repair a failing draft with applied policy evidence and risk controls.",
    requiredFlag: "mcp_actions",
    requiredScope: "evaluation.write",
  },
];

export async function resolveSsoConfig(repository: OperatorRepository, organisationId: string) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const sso = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}sso_config_upsert`)
    .at(-1)?.details as Record<string, unknown> | undefined;
  const domains = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}domain_allowlist_upsert`)
    .at(-1)?.details as Record<string, unknown> | undefined;
  return {
    enabled: Boolean(sso?.enabled ?? false),
    idpEntityId: String(sso?.idpEntityId ?? ""),
    ssoUrl: String(sso?.ssoUrl ?? ""),
    certificateFingerprint: String(sso?.certificateFingerprint ?? ""),
    metadataSource:
      sso?.metadataSource === "xml" || sso?.metadataSource === "manual"
        ? sso.metadataSource
        : "manual",
    domainAllowlist: Array.isArray(domains?.domainAllowlist)
      ? domains?.domainAllowlist.map(String)
      : [],
    updatedAt: String((sso?.updatedAt as string | undefined) ?? nowIso()),
  };
}

export async function resolveGovernancePolicy(
  repository: OperatorRepository,
  organisationId: string
): Promise<GovernancePolicy> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const latest = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}governance_policy_upsert`)
    .at(-1)?.details as Record<string, unknown> | undefined;

  return {
    retentionDays: Number(latest?.retentionDays ?? 365),
    legalHoldEnabled: Boolean(latest?.legalHoldEnabled ?? false),
    deletionRequiresApproval: Boolean(latest?.deletionRequiresApproval ?? true),
    invitePolicy:
      latest?.invitePolicy === "domain_allowlist_only" || latest?.invitePolicy === "disabled"
        ? latest.invitePolicy
        : "open",
    sessionDurationMinutes: Number(latest?.sessionDurationMinutes ?? 480),
    enforcedMfa: Boolean(latest?.enforcedMfa ?? false),
    breakGlassAdminEnabled: Boolean(latest?.breakGlassAdminEnabled ?? true),
    updatedAt: String((latest?.updatedAt as string | undefined) ?? nowIso()),
  };
}

export async function resolveBreakGlassProtocolState(
  repository: OperatorRepository,
  organisationId: string
): Promise<BreakGlassProtocolState> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const invocations = new Map<string, BreakGlassProtocolState["history"][number]>();
  const now = Date.now();

  for (const event of events) {
    const details = event.details as Record<string, unknown>;
    if (event.action === `${ENTERPRISE_ACTION_PREFIX}break_glass_invoked`) {
      const invocationId = String(details.invocationId ?? "").trim();
      if (!invocationId) continue;
      invocations.set(invocationId, {
        invocationId,
        status: "active",
        reason: String(details.reason ?? "Emergency protocol invoked."),
        ticketRef: typeof details.ticketRef === "string" ? details.ticketRef : null,
        durationMinutes: Number(details.durationMinutes ?? 60),
        invokedAt: event.createdAt,
        invokedBy: String(details.actorId ?? "unknown"),
        expiresAt: String(details.expiresAt ?? event.createdAt),
        releasedAt: null,
        releasedBy: null,
        releaseReason: null,
      });
      continue;
    }

    if (event.action === `${ENTERPRISE_ACTION_PREFIX}break_glass_released`) {
      const invocationId = String(details.invocationId ?? "").trim();
      if (!invocationId) continue;
      const existing = invocations.get(invocationId);
      if (!existing) continue;
      invocations.set(invocationId, {
        ...existing,
        status: "released",
        releasedAt: event.createdAt,
        releasedBy: String(details.actorId ?? "unknown"),
        releaseReason: String(details.reason ?? "Released"),
      });
    }
  }

  const history = Array.from(invocations.values())
    .map((item) => {
      if (item.status === "active" && Date.parse(item.expiresAt) <= now) {
        return { ...item, status: "expired" as const };
      }
      return item;
    })
    .sort((a, b) => b.invokedAt.localeCompare(a.invokedAt));

  const active = history.find((item) => item.status === "active") ?? null;

  return {
    active,
    history,
  };
}

export async function resolveWebhookSecret(
  repository: OperatorRepository,
  organisationId: string,
  webhookId: string
) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const created = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}webhook_created`)
    .map((item) => item.details as Record<string, unknown>)
    .find((item) => String(item.id ?? "") === webhookId);
  const rotated = events
    .filter((item) => item.action === `${ENTERPRISE_ACTION_PREFIX}webhook_rotated`)
    .map((item) => item.details as Record<string, unknown>)
    .filter((item) => String(item.id ?? "") === webhookId)
    .at(-1);
  const encrypted = (rotated?.secretEncrypted ?? created?.secretEncrypted) as string | undefined;
  if (!encrypted) return null;
  return decryptSecret(encrypted);
}

export async function resolveDeletionRequests(repository: OperatorRepository, organisationId: string) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const map = new Map<string, DeletionRequestRecord>();
  for (const event of events) {
    if (event.action === `${ENTERPRISE_ACTION_PREFIX}deletion_requested`) {
      const payload = event.details as Record<string, unknown>;
      const id = String(payload.id ?? "").trim();
      if (!id) continue;
      map.set(id, {
        id,
        organisationId,
        status:
          payload.status === "completed" ||
          payload.status === "approved" ||
          payload.status === "blocked_legal_hold"
            ? payload.status
            : "pending_approval",
        reason: String(payload.reason ?? ""),
        target:
          payload.target === "all_data" ||
          payload.target === "evaluations_only" ||
          payload.target === "sources_only"
            ? payload.target
            : "sources_only",
        requestedBy: String(payload.requestedBy ?? "unknown"),
        requestedAt: String(payload.requestedAt ?? event.createdAt),
        approval:
          payload.approval && typeof payload.approval === "object"
            ? (payload.approval as DeletionRequestRecord["approval"])
            : null,
        completion:
          payload.completion && typeof payload.completion === "object"
            ? (payload.completion as DeletionRequestRecord["completion"])
            : null,
        dependentArtifacts: Array.isArray(payload.dependentArtifacts)
          ? (payload.dependentArtifacts as DeletionRequestRecord["dependentArtifacts"])
          : [],
      });
    }
    if (event.action === `${ENTERPRISE_ACTION_PREFIX}deletion_approved`) {
      const payload = event.details as Record<string, unknown>;
      const id = String(payload.id ?? "").trim();
      if (!id) continue;
      const existing = map.get(id);
      if (!existing) continue;
      map.set(id, {
        ...existing,
        status: existing.status === "completed" ? "completed" : "approved",
        approval:
          payload.approval && typeof payload.approval === "object"
            ? (payload.approval as DeletionRequestRecord["approval"])
            : existing.approval,
      });
    }
    if (event.action === `${ENTERPRISE_ACTION_PREFIX}deletion_completed`) {
      const payload = event.details as Record<string, unknown>;
      const id = String(payload.id);
      const existing = map.get(id);
      if (!existing) continue;
      map.set(id, {
        ...existing,
        status: "completed",
        completion:
          payload.completion && typeof payload.completion === "object"
            ? (payload.completion as DeletionRequestRecord["completion"])
            : existing.completion,
        dependentArtifacts: Array.isArray(payload.dependentArtifacts)
          ? (payload.dependentArtifacts as DeletionRequestRecord["dependentArtifacts"])
          : existing.dependentArtifacts,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export async function resolveLegalHoldState(
  repository: OperatorRepository,
  organisationId: string
): Promise<LegalHoldState> {
  const events = await listEnterpriseEvents(repository, organisationId);
  const holds = new Map<
    string,
    {
      holdId: string;
      organisationId: string;
      scope: "global" | "sources" | "evaluations" | "exports";
      reason: string;
      ticketRef: string;
      placedBy: string;
      placedAt: string;
      expiresAt: string | null;
      status: "active" | "released" | "overridden" | "expired";
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
    }
  >();

  for (const event of events) {
    const details = event.details as Record<string, unknown>;
    if (event.action === `${ENTERPRISE_ACTION_PREFIX}legal_hold_placed`) {
      const holdId = String(details.holdId ?? "").trim();
      if (!holdId) continue;
      const scope =
        details.scope === "sources" ||
        details.scope === "evaluations" ||
        details.scope === "exports"
          ? details.scope
          : "global";
      holds.set(holdId, {
        holdId,
        organisationId,
        scope,
        reason: String(details.reason ?? "Legal hold placed."),
        ticketRef: String(details.ticketRef ?? "UNSPECIFIED"),
        placedBy: String(details.actorId ?? "unknown"),
        placedAt: event.createdAt,
        expiresAt: typeof details.expiresAt === "string" ? details.expiresAt : null,
        status: "active",
        releasedAt: null,
        releasedBy: null,
        releaseReason: null,
        override: {
          overridden: false,
          overriddenAt: null,
          overriddenBy: null,
          overrideReason: null,
          overrideTicketRef: null,
        },
      });
      continue;
    }

    if (event.action === `${ENTERPRISE_ACTION_PREFIX}legal_hold_released`) {
      const holdId = String(details.holdId ?? "").trim();
      if (!holdId) continue;
      const existing = holds.get(holdId);
      if (!existing) continue;
      holds.set(holdId, {
        ...existing,
        status: "released",
        releasedAt: event.createdAt,
        releasedBy: String(details.actorId ?? "unknown"),
        releaseReason: String(details.reason ?? "Legal hold released."),
      });
      continue;
    }

    if (event.action === `${ENTERPRISE_ACTION_PREFIX}legal_hold_overridden`) {
      const holdId = String(details.holdId ?? "").trim();
      if (!holdId) continue;
      const existing = holds.get(holdId);
      if (!existing) continue;
      holds.set(holdId, {
        ...existing,
        status: "overridden",
        override: {
          overridden: true,
          overriddenAt: event.createdAt,
          overriddenBy: String(details.actorId ?? "unknown"),
          overrideReason: String(details.reason ?? "Legal hold overridden."),
          overrideTicketRef: String(details.ticketRef ?? "UNSPECIFIED"),
        },
      });
    }
  }

  const now = Date.now();
  const history = Array.from(holds.values())
    .map((item) => {
      if (item.status === "active" && item.expiresAt && Date.parse(item.expiresAt) <= now) {
        return { ...item, status: "expired" as const };
      }
      return item;
    })
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));

  const active = history.find((item) => item.status === "active") ?? null;
  return { active, history };
}

export async function resolveScimGroups(repository: OperatorRepository, organisationId: string) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const groups = new Map<string, { id: string; displayName: string; members: string[]; meta: { created: string; lastModified: string } }>();
  for (const event of events) {
    if (event.action === `${ENTERPRISE_ACTION_PREFIX}scim_group_upsert`) {
      const details = event.details as Record<string, unknown>;
      const id = String(details.id ?? "");
      if (!id) continue;
      groups.set(id, {
        id,
        displayName: String(details.displayName ?? ""),
        members: Array.isArray(details.members) ? details.members.map(String) : [],
        meta: {
          created: String(details.created ?? event.createdAt),
          lastModified: event.createdAt,
        },
      });
    }
    if (event.action === `${ENTERPRISE_ACTION_PREFIX}scim_group_deleted`) {
      const details = event.details as Record<string, unknown>;
      const id = String(details.id ?? "");
      groups.delete(id);
    }
  }
  return Array.from(groups.values());
}

export async function resolveScimUserStatusMap(repository: OperatorRepository, organisationId: string) {
  const events = await listEnterpriseEvents(repository, organisationId);
  const statuses = new Map<string, { active: boolean; lastModified: string; reason: string | null }>();
  for (const event of events) {
    if (event.action !== `${ENTERPRISE_ACTION_PREFIX}scim_user_status_set`) continue;
    const details = event.details as Record<string, unknown>;
    const userId = String(details.userId ?? "");
    if (!userId) continue;
    statuses.set(userId, {
      active: Boolean(details.active),
      lastModified: event.createdAt,
      reason: typeof details.reason === "string" ? details.reason : null,
    });
  }
  return statuses;
}
