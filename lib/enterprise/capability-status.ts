import { getConnectorMissingEnv, getMissingEnterpriseEnv } from "@/lib/enterprise/config";
import {
  resolveBillingEntitlement,
  resolveConnectors,
  resolveFeatureFlags,
  resolveSsoConfig,
} from "@/lib/enterprise/store";
import type { OperatorRepository } from "@/lib/repository/interface";
import type { ConnectorProvider, FeatureFlag, FeatureFlagKey } from "@/lib/types";

export type CapabilityStateReason =
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

export type CapabilityState = {
  id: string;
  state: "available" | "unavailable";
  reason: CapabilityStateReason;
  message: string;
};

export type EnterpriseCapabilityStatus = {
  configured: boolean;
  missingEnvironment: string[];
  connectorReadiness: Record<ConnectorProvider, string[]>;
  featureFlags: FeatureFlag[];
  capabilityStates: CapabilityState[];
};

function resolveFeatureFlagState(
  featureFlag: { enabled: boolean; rolloutPercent: number } | undefined
): CapabilityStateReason {
  if (!featureFlag || !featureFlag.enabled) return "feature_flag_disabled";
  if (featureFlag.rolloutPercent < 100) return "feature_flag_partial_rollout";
  return "enabled";
}

export async function resolveEnterpriseCapabilityStatus(
  repository: OperatorRepository,
  organisationId: string
): Promise<EnterpriseCapabilityStatus> {
  const [flags, entitlement, connectors, sso] = await Promise.all([
    resolveFeatureFlags(repository, organisationId),
    resolveBillingEntitlement(repository, organisationId),
    resolveConnectors(repository, organisationId),
    resolveSsoConfig(repository, organisationId),
  ]);
  const missingEnterpriseEnv = getMissingEnterpriseEnv();
  const connectorReadiness: EnterpriseCapabilityStatus["connectorReadiness"] = {
    gmail: getConnectorMissingEnv("gmail"),
    slack: getConnectorMissingEnv("slack"),
    outlook: getConnectorMissingEnv("outlook"),
    hubspot: getConnectorMissingEnv("hubspot"),
    salesforce: getConnectorMissingEnv("salesforce"),
    intercom: getConnectorMissingEnv("intercom"),
    zendesk: getConnectorMissingEnv("zendesk"),
  };
  const featureFlagByKey = new Map(flags.map((item) => [item.key, item] as const));

  const connectorProviders: ConnectorProvider[] = [
    "gmail",
    "slack",
    "outlook",
    "hubspot",
    "salesforce",
    "intercom",
    "zendesk",
  ];
  const connectedProviders = new Set(
    connectors.filter((item) => item.status === "connected").map((item) => item.provider)
  );
  const capabilityStates: CapabilityState[] = [];
  const pushFeatureFlagCapability = (id: string, featureFlagKey: FeatureFlagKey, messagePrefix: string) => {
    const flagReason = resolveFeatureFlagState(featureFlagByKey.get(featureFlagKey));
    if (flagReason !== "enabled") {
      capabilityStates.push({
        id,
        state: "unavailable",
        reason: flagReason,
        message: `${messagePrefix} unavailable because ${featureFlagKey} is not fully enabled.`,
      });
      return false;
    }
    return true;
  };

  const autoSendFlagEnabled = pushFeatureFlagCapability("auto_send", "auto_send", "Auto-send");
  if (autoSendFlagEnabled) {
    if (entitlement.status !== "active") {
      capabilityStates.push({
        id: "auto_send",
        state: "unavailable",
        reason: "billing_not_active",
        message: "Auto-send unavailable because billing entitlement is not active.",
      });
    } else if (!entitlement.autoSendEnabled) {
      capabilityStates.push({
        id: "auto_send",
        state: "unavailable",
        reason: "entitlement_disabled",
        message: "Auto-send unavailable because billing entitlement has autoSend disabled.",
      });
    } else if (missingEnterpriseEnv.length > 0) {
      capabilityStates.push({
        id: "auto_send",
        state: "unavailable",
        reason: "enterprise_env_missing",
        message: `Auto-send unavailable because enterprise env is missing: ${missingEnterpriseEnv.join(", ")}.`,
      });
    } else {
      capabilityStates.push({
        id: "auto_send",
        state: "available",
        reason: "enabled",
        message: "Auto-send is available.",
      });
    }
  }

  const mcpFlagEnabled = pushFeatureFlagCapability("mcp_actions", "mcp_actions", "MCP actions");
  if (mcpFlagEnabled) {
    if (entitlement.status !== "active") {
      capabilityStates.push({
        id: "mcp_actions",
        state: "unavailable",
        reason: "billing_not_active",
        message: "MCP actions unavailable because billing entitlement is not active.",
      });
    } else if (!entitlement.apiAccessEnabled || !entitlement.mcpAccessEnabled) {
      capabilityStates.push({
        id: "mcp_actions",
        state: "unavailable",
        reason: "entitlement_disabled",
        message: "MCP actions unavailable because API or MCP entitlement is disabled.",
      });
    } else {
      capabilityStates.push({
        id: "mcp_actions",
        state: "available",
        reason: "enabled",
        message: "MCP actions are available.",
      });
    }
  }

  const scimFlagEnabled = pushFeatureFlagCapability("scim_write", "scim_write", "SCIM write");
  if (scimFlagEnabled) {
    if (!process.env.OPERATORLAYER_SCIM_TOKEN) {
      capabilityStates.push({
        id: "scim_write",
        state: "unavailable",
        reason: "scim_not_configured",
        message: "SCIM write unavailable because OPERATORLAYER_SCIM_TOKEN is not configured.",
      });
    } else {
      capabilityStates.push({
        id: "scim_write",
        state: "available",
        reason: "enabled",
        message: "SCIM write is available.",
      });
    }
  }

  capabilityStates.push({
    id: "saml_sso",
    state: sso.enabled ? "available" : "unavailable",
    reason: sso.enabled ? "enabled" : "sso_disabled",
    message: sso.enabled
      ? "SAML SSO is available."
      : "SAML SSO unavailable because tenant identity lifecycle is not enabled.",
  });

  for (const provider of connectorProviders) {
    const flagKey = `connector_${provider}` as FeatureFlagKey;
    const flagReason = resolveFeatureFlagState(featureFlagByKey.get(flagKey));
    if (flagReason !== "enabled") {
      capabilityStates.push({
        id: `connector_${provider}`,
        state: "unavailable",
        reason: flagReason,
        message: `${provider} connector unavailable because ${flagKey} is not fully enabled.`,
      });
      continue;
    }
    const missingEnv = connectorReadiness[provider];
    if (missingEnv.length > 0) {
      capabilityStates.push({
        id: `connector_${provider}`,
        state: "unavailable",
        reason: "connector_env_missing",
        message: `${provider} connector unavailable because env is missing: ${missingEnv.join(", ")}.`,
      });
      continue;
    }
    if (!connectedProviders.has(provider)) {
      capabilityStates.push({
        id: `connector_${provider}`,
        state: "unavailable",
        reason: "connector_not_connected",
        message: `${provider} connector unavailable because OAuth connection is not completed.`,
      });
      continue;
    }
    capabilityStates.push({
      id: `connector_${provider}`,
      state: "available",
      reason: "enabled",
      message: `${provider} connector is available.`,
    });
  }

  return {
    configured: missingEnterpriseEnv.length === 0,
    missingEnvironment: missingEnterpriseEnv,
    connectorReadiness,
    featureFlags: flags,
    capabilityStates,
  };
}
