export type ConnectorAvailabilityReason =
  | "available"
  | "feature_flag_disabled"
  | "env_missing"
  | "not_connected";

export type ConnectorCatalogItem = {
  provider: "gmail" | "slack" | "outlook" | "hubspot" | "salesforce" | "intercom" | "zendesk";
  state: "available" | "unavailable";
  reason: ConnectorAvailabilityReason;
  message: string;
  featureEnabled: boolean;
  missingEnv: string[];
  connected: boolean;
};
