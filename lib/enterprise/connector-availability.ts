import { getConnectorMissingEnv } from "@/lib/enterprise/config";
import { getConnectorFlagKey, resolveConnectors, resolveFeatureFlags } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";
import type { ConnectorAvailabilityState, ConnectorProvider } from "@/lib/types";

const providers: ConnectorProvider[] = [
  "gmail",
  "slack",
  "outlook",
  "hubspot",
  "salesforce",
  "intercom",
  "zendesk",
];

function resolveAvailabilityState(input: {
  provider: ConnectorProvider;
  featureEnabled: boolean;
  missingEnv: string[];
  connected: boolean;
}): ConnectorAvailabilityState {
  if (!input.featureEnabled) {
    return {
      provider: input.provider,
      state: "unavailable",
      reason: "feature_flag_disabled",
      message: `Feature flag for ${input.provider} connector is disabled.`,
      featureEnabled: false,
      missingEnv: input.missingEnv,
      connected: input.connected,
    };
  }

  if (input.missingEnv.length > 0) {
    return {
      provider: input.provider,
      state: "unavailable",
      reason: "env_missing",
      message: `${input.provider} connector env missing: ${input.missingEnv.join(", ")}`,
      featureEnabled: true,
      missingEnv: input.missingEnv,
      connected: input.connected,
    };
  }

  if (!input.connected) {
    return {
      provider: input.provider,
      state: "unavailable",
      reason: "not_connected",
      message: `${input.provider} connector is not connected.`,
      featureEnabled: true,
      missingEnv: [],
      connected: false,
    };
  }

  return {
    provider: input.provider,
    state: "available",
    reason: "available",
    message: `${input.provider} connector is available.`,
    featureEnabled: true,
    missingEnv: [],
    connected: true,
  };
}

export async function resolveConnectorAvailabilityCatalog(
  repository: OperatorRepository,
  organisationId: string
): Promise<ConnectorAvailabilityState[]> {
  const [flags, connectors] = await Promise.all([
    resolveFeatureFlags(repository, organisationId),
    resolveConnectors(repository, organisationId),
  ]);

  return providers.map((provider) => {
    const flag = flags.find((item) => item.key === getConnectorFlagKey(provider));
    const connector = connectors.find((item) => item.provider === provider);
    return resolveAvailabilityState({
      provider,
      featureEnabled: Boolean(flag?.enabled),
      missingEnv: getConnectorMissingEnv(provider),
      connected: connector?.status === "connected",
    });
  });
}

export async function assertConnectorAvailable(
  repository: OperatorRepository,
  organisationId: string,
  provider: ConnectorProvider,
  options: { requireConnected: boolean; actorId?: string }
) {
  const catalog = await resolveConnectorAvailabilityCatalog(repository, organisationId);
  const availability = catalog.find((item) => item.provider === provider);
  if (!availability) {
    throw new AppError(400, "invalid_connector_provider", "Unsupported connector provider.");
  }
  if (availability.state === "unavailable") {
    if (!options.requireConnected && availability.reason === "not_connected") {
      return availability;
    }
    await repository.createIngestionLog({
      organisationId,
      sourceId: null,
      action: "enterprise:capability_runtime_denied",
      details: {
        capabilityId: `connector_${provider}`,
        provider,
        reason: availability.reason,
        requireConnected: options.requireConnected,
        actorId: options.actorId ?? "system",
      },
    });
    throw new AppError(409, "connector_unavailable", availability.message, availability);
  }
  if (options.requireConnected && !availability.connected) {
    throw new AppError(404, "connector_not_connected", `${provider} connector is not connected.`, availability);
  }
  return availability;
}
