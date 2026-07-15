import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { mcpCapabilities, resolveBillingEntitlement, resolveFeatureFlags } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { FeatureFlagKey } from "@/lib/types";

type CapabilityStateReason =
  | "enabled"
  | "feature_flag_disabled"
  | "feature_flag_partial_rollout"
  | "billing_not_active"
  | "entitlement_disabled";

type McpCapabilityState = {
  id: string;
  title: string;
  requiredFlag: FeatureFlagKey | null;
  requiredScope: string | null;
  state: "available" | "unavailable";
  reason: CapabilityStateReason;
};

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const [flags, entitlement] = await Promise.all([
      resolveFeatureFlags(repository, context.organisationId),
      resolveBillingEntitlement(repository, context.organisationId),
    ]);
    const flagByKey = new Map(flags.map((item) => [item.key, item] as const));

    const visible = [];
    const capabilityStates: McpCapabilityState[] = [];
    for (const capability of mcpCapabilities) {
      if (!capability.requiredFlag) {
        capabilityStates.push({
          id: capability.id,
          title: capability.title,
          requiredFlag: null,
          requiredScope: capability.requiredScope,
          state: "available",
          reason: "enabled",
        });
        visible.push(capability);
        continue;
      }
      const featureFlag = flagByKey.get(capability.requiredFlag);
      if (!featureFlag || !featureFlag.enabled) {
        capabilityStates.push({
          id: capability.id,
          title: capability.title,
          requiredFlag: capability.requiredFlag,
          requiredScope: capability.requiredScope,
          state: "unavailable",
          reason: "feature_flag_disabled",
        });
        continue;
      }
      if (featureFlag.rolloutPercent < 100) {
        capabilityStates.push({
          id: capability.id,
          title: capability.title,
          requiredFlag: capability.requiredFlag,
          requiredScope: capability.requiredScope,
          state: "unavailable",
          reason: "feature_flag_partial_rollout",
        });
        continue;
      }
      if (entitlement.status !== "active") {
        capabilityStates.push({
          id: capability.id,
          title: capability.title,
          requiredFlag: capability.requiredFlag,
          requiredScope: capability.requiredScope,
          state: "unavailable",
          reason: "billing_not_active",
        });
        continue;
      }
      if (!entitlement.apiAccessEnabled || !entitlement.mcpAccessEnabled) {
        capabilityStates.push({
          id: capability.id,
          title: capability.title,
          requiredFlag: capability.requiredFlag,
          requiredScope: capability.requiredScope,
          state: "unavailable",
          reason: "entitlement_disabled",
        });
        continue;
      }
      capabilityStates.push({
        id: capability.id,
        title: capability.title,
        requiredFlag: capability.requiredFlag,
        requiredScope: capability.requiredScope,
        state: "available",
        reason: "enabled",
      });
      visible.push(capability);
    }

    return jsonOk({
      capabilities: visible,
      capabilityStates,
    });
  } catch (error) {
    return jsonError(error);
  }
}
