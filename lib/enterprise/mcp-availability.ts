import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";

import { resolveBillingEntitlement, resolveFeatureFlags } from "./store";

type McpAvailabilityReason =
  | "feature_flag_disabled"
  | "feature_flag_partial_rollout"
  | "billing_not_active"
  | "entitlement_disabled";

export type McpActionsAvailability = {
  state: "available" | "unavailable";
  reason: McpAvailabilityReason | "enabled";
  message: string;
  requiredFlag: "mcp_actions";
};

function resolveMcpActionsAvailability(input: {
  featureEnabled: boolean;
  rolloutPercent: number;
  entitlementStatus: "active" | "past_due" | "suspended";
  apiAccessEnabled: boolean;
  mcpAccessEnabled: boolean;
}): McpActionsAvailability {
  if (!input.featureEnabled) {
    return {
      state: "unavailable",
      reason: "feature_flag_disabled",
      message: "MCP actions are unavailable because mcp_actions is disabled.",
      requiredFlag: "mcp_actions",
    };
  }
  if (input.rolloutPercent < 100) {
    return {
      state: "unavailable",
      reason: "feature_flag_partial_rollout",
      message: "MCP actions are unavailable because mcp_actions rollout is below 100%.",
      requiredFlag: "mcp_actions",
    };
  }
  if (input.entitlementStatus !== "active") {
    return {
      state: "unavailable",
      reason: "billing_not_active",
      message: "MCP actions are unavailable because billing entitlement is not active.",
      requiredFlag: "mcp_actions",
    };
  }
  if (!input.apiAccessEnabled || !input.mcpAccessEnabled) {
    return {
      state: "unavailable",
      reason: "entitlement_disabled",
      message: "MCP actions are unavailable because API or MCP entitlement is disabled.",
      requiredFlag: "mcp_actions",
    };
  }
  return {
    state: "available",
    reason: "enabled",
    message: "MCP actions are available.",
    requiredFlag: "mcp_actions",
  };
}

export async function assertMcpActionsAvailable(
  repository: OperatorRepository,
  organisationId: string,
  options: { actorId?: string; surface?: string } = {}
) {
  const [featureFlags, entitlement] = await Promise.all([
    resolveFeatureFlags(repository, organisationId),
    resolveBillingEntitlement(repository, organisationId),
  ]);
  const flag = featureFlags.find((item) => item.key === "mcp_actions");
  const availability = resolveMcpActionsAvailability({
    featureEnabled: Boolean(flag?.enabled),
    rolloutPercent: flag?.rolloutPercent ?? 0,
    entitlementStatus: entitlement.status,
    apiAccessEnabled: entitlement.apiAccessEnabled,
    mcpAccessEnabled: entitlement.mcpAccessEnabled,
  });
  if (availability.state === "unavailable") {
    await repository.createIngestionLog({
      organisationId,
      sourceId: null,
      action: "enterprise:capability_runtime_denied",
      details: {
        capabilityId: "mcp_actions",
        reason: availability.reason,
        actorId: options.actorId ?? "system",
        surface: options.surface ?? "mcp_api",
      },
    });
    throw new AppError(409, "mcp_unavailable", availability.message, availability);
  }
  return availability;
}
