import type { ConnectorProvider } from "@/lib/types";

export type ConnectorProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  defaultScopes: string[];
  apiBaseUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
};

export const connectorConfigs: Record<ConnectorProvider, ConnectorProviderConfig> = {
  gmail: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    defaultScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    apiBaseUrl: "https://gmail.googleapis.com/gmail/v1",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  slack: {
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    defaultScopes: ["channels:read", "channels:history", "users:read"],
    apiBaseUrl: "https://slack.com/api",
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
  },
  outlook: {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    defaultScopes: ["offline_access", "Mail.Read", "User.Read"],
    apiBaseUrl: "https://graph.microsoft.com/v1.0",
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
  },
  hubspot: {
    authorizeUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    defaultScopes: ["crm.objects.contacts.read", "tickets"],
    apiBaseUrl: "https://api.hubapi.com",
    clientIdEnv: "HUBSPOT_CLIENT_ID",
    clientSecretEnv: "HUBSPOT_CLIENT_SECRET",
  },
  salesforce: {
    authorizeUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    defaultScopes: ["api", "refresh_token"],
    apiBaseUrl: "https://login.salesforce.com",
    clientIdEnv: "SALESFORCE_CLIENT_ID",
    clientSecretEnv: "SALESFORCE_CLIENT_SECRET",
  },
  intercom: {
    authorizeUrl: "https://app.intercom.com/oauth",
    tokenUrl: "https://api.intercom.io/auth/eagle/token",
    defaultScopes: ["read_conversations"],
    apiBaseUrl: "https://api.intercom.io",
    clientIdEnv: "INTERCOM_CLIENT_ID",
    clientSecretEnv: "INTERCOM_CLIENT_SECRET",
  },
  zendesk: {
    get authorizeUrl() {
      return process.env.ZENDESK_AUTHORIZE_URL ?? "";
    },
    get tokenUrl() {
      return process.env.ZENDESK_TOKEN_URL ?? "";
    },
    defaultScopes: ["read"],
    get apiBaseUrl() {
      return process.env.ZENDESK_API_BASE_URL ?? "";
    },
    clientIdEnv: "ZENDESK_CLIENT_ID",
    clientSecretEnv: "ZENDESK_CLIENT_SECRET",
  },
};
