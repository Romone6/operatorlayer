import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { resolveConnectorAvailabilityCatalog } from "@/lib/enterprise/connector-availability";
import { getConnectorFlagKey, resolveConnectors, resolveFeatureFlags } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { connectorConfigs } from "@/lib/services/connectors/providers";
import type { ConnectorProvider, ConnectorSyncState } from "@/lib/types";

const validProviders = new Set<ConnectorProvider>([
  "gmail",
  "slack",
  "outlook",
  "hubspot",
  "salesforce",
  "intercom",
  "zendesk",
]);

function resolveScopeStatus(input: {
  provider: ConnectorProvider;
  configuredScopes: string[];
  grantedScopes: string[];
}): ConnectorSyncState["health"]["scopeStatus"] {
  const required = connectorConfigs[input.provider].defaultScopes;
  if (!required.length) return "unknown";
  const granted = input.grantedScopes.length > 0 ? input.grantedScopes : input.configuredScopes;
  if (!granted.length) return "missing_required";
  const matched = required.filter((scope) => granted.includes(scope)).length;
  if (matched === required.length) return "complete";
  if (matched > 0) return "partial";
  return "missing_required";
}

function resolveTokenExpiryHealth(
  tokenExpiresAt: string | null
): ConnectorSyncState["health"]["tokenExpiry"] {
  if (!tokenExpiresAt) return "unknown";
  const expiry = Date.parse(tokenExpiresAt);
  if (Number.isNaN(expiry)) return "unknown";
  const now = Date.now();
  if (expiry <= now) return "expired";
  if (expiry <= now + 24 * 60 * 60 * 1000) return "expiring_soon";
  return "valid";
}

function resolveThrottlingState(
  value: unknown
): ConnectorSyncState["health"]["throttlingState"] {
  if (value === "normal" || value === "throttled" || value === "rate_limited" || value === "backoff") {
    return value;
  }
  return "unknown";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "connector-admin");
    const repository = getRepository();
    const { provider } = await params;
    if (!validProviders.has(provider as ConnectorProvider)) {
      throw new AppError(400, "invalid_connector_provider", "Unsupported connector provider.");
    }

    const typedProvider = provider as ConnectorProvider;
    const [connectors, flags, availabilityCatalog, logs] = await Promise.all([
      resolveConnectors(repository, context.organisationId),
      resolveFeatureFlags(repository, context.organisationId),
      resolveConnectorAvailabilityCatalog(repository, context.organisationId),
      repository.listIngestionLogs(context.organisationId),
    ]);

    const connector = connectors.find((item) => item.provider === typedProvider) ?? null;
    const availability = availabilityCatalog.find((item) => item.provider === typedProvider);
    const feature = flags.find((flag) => flag.key === getConnectorFlagKey(typedProvider));
    const missingEnv = availability?.missingEnv ?? [];
    const connected = connector?.status === "connected";
    const syncLogs = logs
      .filter((log) => log.action === "enterprise:connector_sync_result")
      .filter((log) => String(log.details.provider ?? "") === typedProvider)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastSuccessfulSyncAt =
      syncLogs.find((log) => String(log.details.syncStatus ?? "") === "succeeded")?.createdAt ?? null;
    const syncLagMinutes = lastSuccessfulSyncAt
      ? Math.max(0, Math.round((Date.now() - Date.parse(lastSuccessfulSyncAt)) / 60000))
      : null;
    const failureReasons = Array.from(
      new Set(
        syncLogs
          .filter((log) => String(log.details.syncStatus ?? "") !== "succeeded")
          .map((log) => String(log.details.error ?? "sync_failed"))
      )
    ).slice(0, 5);
    const rawGrantedScopes = connector?.metadata?.grantedScopes;
    const grantedScopes = Array.isArray(rawGrantedScopes) ? rawGrantedScopes.map(String) : [];
    const tokenExpiresAt =
      typeof connector?.metadata?.tokenExpiresAt === "string" ? connector.metadata.tokenExpiresAt : null;

    const baseState = {
      provider: typedProvider,
      configured: missingEnv.length === 0,
      missingEnv,
      featureEnabled: Boolean(feature?.enabled),
      sync: {
        schedule: connector?.syncSchedule ?? "manual",
        lastSyncAt: connector?.lastSyncAt ?? null,
        lastSyncStatus: connector?.lastSyncStatus ?? "never",
        lastSyncError: connector?.lastSyncError ?? null,
        lastSuccessfulSyncAt,
        syncLagMinutes,
      },
      scopes: connector?.scopes ?? [],
      sourceSelection: connector?.sourceSelection ?? [],
      health: {
        scopeStatus: resolveScopeStatus({
          provider: typedProvider,
          configuredScopes: connector?.scopes ?? [],
          grantedScopes,
        }),
        tokenExpiry: resolveTokenExpiryHealth(tokenExpiresAt),
        throttlingState: resolveThrottlingState(connector?.metadata?.throttlingState),
        failureReasons,
      },
    };
    const syncState: ConnectorSyncState = connected
      ? {
          ...baseState,
          state: "connected",
          connected: true,
          connectionHealth: connector?.connectionHealth === "degraded" ? "degraded" : "healthy",
        }
      : {
          ...baseState,
          state: "disconnected",
          connected: false,
          connectionHealth: "offline",
        };

    return jsonOk({
      ...syncState,
      availability: {
        state: availability?.state ?? "unavailable",
        reason: availability?.reason ?? "env_missing",
        message: availability?.message ?? `${typedProvider} connector availability unknown.`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
