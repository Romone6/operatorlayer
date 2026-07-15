import { AppError } from "@/lib/errors";
import type { FeatureFlagKey } from "@/lib/types";

const enterpriseCriticalEnv = [
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const connectorEnvByProvider = {
  gmail: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  outlook: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
  hubspot: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
  salesforce: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
  intercom: ["INTERCOM_CLIENT_ID", "INTERCOM_CLIENT_SECRET"],
  zendesk: [
    "ZENDESK_CLIENT_ID",
    "ZENDESK_CLIENT_SECRET",
    "ZENDESK_AUTHORIZE_URL",
    "ZENDESK_TOKEN_URL",
    "ZENDESK_API_BASE_URL",
  ],
} as const;

export const defaultFeatureFlags: Record<FeatureFlagKey, boolean> = {
  auto_send: false,
  connector_gmail: false,
  connector_slack: false,
  connector_outlook: false,
  connector_hubspot: false,
  connector_salesforce: false,
  connector_intercom: false,
  connector_zendesk: false,
  mcp_actions: false,
  scim_write: false,
};

export function getMissingEnterpriseEnv() {
  return enterpriseCriticalEnv.filter((key) => !process.env[key]);
}

export function assertEnterpriseConfigured() {
  const missing = getMissingEnterpriseEnv();
  if (missing.length > 0) {
    throw new AppError(
      503,
      "enterprise_config_missing",
      "Enterprise runtime is not configured for this environment.",
      { missing }
    );
  }
}

export function getConnectorMissingEnv(provider: keyof typeof connectorEnvByProvider) {
  return connectorEnvByProvider[provider].filter((key) => !process.env[key]);
}

export function assertConnectorConfigured(provider: keyof typeof connectorEnvByProvider) {
  const missing = getConnectorMissingEnv(provider);
  if (missing.length > 0) {
    throw new AppError(
      503,
      "connector_config_missing",
      `Connector ${provider} is not configured for this environment.`,
      { provider, missing }
    );
  }
}

export function assertScimConfigured() {
  if (!process.env.OPERATORLAYER_SCIM_TOKEN) {
    throw new AppError(503, "scim_not_configured", "SCIM provisioning is not configured.");
  }
}

export function assertStripeConfigured() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(503, "stripe_not_configured", "Stripe is not configured.");
  }
}
