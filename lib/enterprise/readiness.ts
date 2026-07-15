import { getConnectorMissingEnv, getMissingEnterpriseEnv } from "@/lib/enterprise/config";
import {
  resolveBillingEntitlement,
  resolveConnectors,
  resolveFeatureFlags,
  resolveSsoConfig,
} from "@/lib/enterprise/store";
import type { OperatorRepository } from "@/lib/repository/interface";
import type { ConnectorProvider, FeatureFlagKey, ReadinessBlocker } from "@/lib/types";

export async function resolveEnterpriseReadiness(
  repository: OperatorRepository,
  organisationId: string
): Promise<{
  ready: boolean;
  blockers: ReadinessBlocker[];
  summary: {
    blockers: number;
    connectedConnectors: number;
  };
}> {
  const [flags, sso, connectors, billing] = await Promise.all([
    resolveFeatureFlags(repository, organisationId),
    resolveSsoConfig(repository, organisationId),
    resolveConnectors(repository, organisationId),
    resolveBillingEntitlement(repository, organisationId),
  ]);
  const blockers: ReadinessBlocker[] = [];

  const missingEnv = getMissingEnterpriseEnv();
  if (missingEnv.length > 0) {
    blockers.push({
      category: "configuration",
      code: "missing_env",
      message: `Missing enterprise environment variables: ${missingEnv.join(", ")}`,
      severity: "critical",
      recoverable: false,
      details: { missingEnv },
    });
  }
  if (!process.env.OPERATORLAYER_SCIM_TOKEN) {
    blockers.push({
      category: "configuration",
      code: "missing_scim_env",
      message: "SCIM provisioning env missing: OPERATORLAYER_SCIM_TOKEN",
      severity: "high",
      recoverable: true,
      details: { missingEnv: ["OPERATORLAYER_SCIM_TOKEN"] },
    });
  }
  if (!process.env.OPERATORLAYER_OAUTH_STATE_SECRET) {
    blockers.push({
      category: "configuration",
      code: "missing_oauth_state_secret",
      message: "Connector OAuth state signing env missing: OPERATORLAYER_OAUTH_STATE_SECRET",
      severity: "high",
      recoverable: true,
      details: { missingEnv: ["OPERATORLAYER_OAUTH_STATE_SECRET"] },
    });
  }

  if (!sso.enabled) {
    blockers.push({
      category: "identity",
      code: "sso_disabled",
      message: "SAML SSO is not enabled.",
      severity: "high",
      recoverable: true,
    });
  }

  if (
    billing.status !== "active" ||
    !billing.apiAccessEnabled ||
    !billing.mcpAccessEnabled ||
    !billing.autoSendEnabled
  ) {
    blockers.push({
      category: "billing",
      code: "billing_not_active",
      message: "Billing entitlement is not active for required enterprise capabilities.",
      severity: "critical",
      recoverable: false,
    });
  }

  const requiredFeatureFlags = [
    "auto_send",
    "mcp_actions",
    "scim_write",
    "connector_gmail",
    "connector_slack",
    "connector_outlook",
    "connector_hubspot",
    "connector_salesforce",
    "connector_intercom",
    "connector_zendesk",
  ] as const;
  for (const key of requiredFeatureFlags) {
    const flag = flags.find((item) => item.key === key);
    if (!flag?.enabled) {
      blockers.push({
        category: "feature_flag",
        code: `${key}_disabled` as `${FeatureFlagKey}_disabled`,
        key,
        message: `Feature flag ${key} is disabled.`,
        severity: "high",
        recoverable: true,
      });
    }
  }

  const connectedProviders = new Set(connectors.filter((item) => item.status === "connected").map((item) => item.provider));
  for (const provider of ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const) {
    if (!connectedProviders.has(provider)) {
      blockers.push({
        category: "connector",
        code: `${provider}_connector_missing` as `${ConnectorProvider}_connector_missing`,
        provider,
        message: `${provider} connector is not connected.`,
        severity: "high",
        recoverable: true,
      });
    }
  }

  for (const provider of ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const) {
    const missingConnectorEnv = getConnectorMissingEnv(provider);
    if (missingConnectorEnv.length > 0) {
      blockers.push({
        category: "configuration",
        code: "missing_connector_env",
        provider,
        message: `${provider} connector env missing: ${missingConnectorEnv.join(", ")}`,
        severity: "high",
        recoverable: true,
        details: { missingEnv: missingConnectorEnv },
      });
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    summary: {
      blockers: blockers.length,
      connectedConnectors: connectedProviders.size,
    },
  };
}
