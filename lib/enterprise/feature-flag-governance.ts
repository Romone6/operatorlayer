import { defaultFeatureFlags } from "@/lib/enterprise/config";
import type { FeatureFlag, FeatureFlagGovernance, FeatureFlagKey } from "@/lib/types";

const governanceCatalog: Record<
  FeatureFlagKey,
  Pick<FeatureFlagGovernance, "title" | "owner" | "blastRadius" | "description">
> = {
  auto_send: {
    title: "Auto-Send Guardrail",
    owner: "trust-oncall",
    blastRadius: "tenant_only",
    description: "Controls low-risk auto-send automation under approval policies.",
  },
  connector_gmail: {
    title: "Gmail Connector",
    owner: "connector-oncall",
    blastRadius: "tenant_only",
    description: "Controls Gmail connector OAuth, ingestion, and sync workflows.",
  },
  connector_slack: {
    title: "Slack Connector",
    owner: "connector-oncall",
    blastRadius: "tenant_only",
    description: "Controls Slack connector OAuth, ingestion, and sync workflows.",
  },
  connector_outlook: {
    title: "Outlook Connector",
    owner: "connector-oncall",
    blastRadius: "tenant_only",
    description: "Controls Outlook connector OAuth, ingestion, and sync workflows.",
  },
  connector_hubspot: {
    title: "HubSpot Connector",
    owner: "connector-oncall",
    blastRadius: "tenant_only",
    description: "Controls HubSpot connector OAuth, ingestion, and sync workflows.",
  },
  connector_salesforce: {
    title: "Salesforce Connector",
    owner: "connector-oncall",
    blastRadius: "tenant_only",
    description: "Controls Salesforce connector OAuth, ingestion, and sync workflows.",
  },
  connector_intercom: {
    title: "Intercom Connector",
    owner: "connector-oncall",
    blastRadius: "tenant_only",
    description: "Controls Intercom connector OAuth, ingestion, and sync workflows.",
  },
  connector_zendesk: {
    title: "Zendesk Connector",
    owner: "connector-oncall",
    blastRadius: "tenant_only",
    description: "Controls Zendesk connector OAuth, ingestion, and sync workflows.",
  },
  mcp_actions: {
    title: "MCP Actions Surface",
    owner: "platform-oncall",
    blastRadius: "cross_tenant_control_plane",
    description: "Controls MCP action invocation exposure for tenant tools.",
  },
  scim_write: {
    title: "SCIM Write Provisioning",
    owner: "iam-oncall",
    blastRadius: "cross_tenant_control_plane",
    description: "Controls SCIM write and deprovisioning operations.",
  },
};

export function buildFeatureFlagGovernanceMatrix(flags: FeatureFlag[]): FeatureFlagGovernance[] {
  const byKey = new Map<FeatureFlagKey, FeatureFlag>();
  for (const flag of flags) {
    byKey.set(flag.key, flag);
  }

  return (Object.keys(defaultFeatureFlags) as FeatureFlagKey[])
    .sort((a, b) => a.localeCompare(b))
    .map((key) => {
      const fallback: FeatureFlag = {
        key,
        enabled: defaultFeatureFlags[key],
        rolloutPercent: 100,
        updatedBy: "system",
        updatedAt: new Date().toISOString(),
      };
      const effective = byKey.get(key) ?? fallback;
      const meta = governanceCatalog[key];
      return {
        key,
        title: meta.title,
        owner: meta.owner,
        blastRadius: meta.blastRadius,
        tenantScopedRollout: true,
        rolloutField: "rolloutPercent",
        description: meta.description,
        defaultEnabled: defaultFeatureFlags[key],
        effective,
      };
    });
}
