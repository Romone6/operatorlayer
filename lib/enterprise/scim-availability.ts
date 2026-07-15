import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";

import { resolveFeatureFlags } from "./store";

type ScimWriteAvailability = {
  state: "available" | "unavailable";
  reason: "enabled" | "feature_flag_disabled" | "feature_flag_partial_rollout";
  message: string;
};

function resolveScimWriteAvailability(input: {
  featureEnabled: boolean;
  rolloutPercent: number;
}): ScimWriteAvailability {
  if (!input.featureEnabled) {
    return {
      state: "unavailable",
      reason: "feature_flag_disabled",
      message: "SCIM write unavailable because scim_write is not fully enabled.",
    };
  }
  if (input.rolloutPercent < 100) {
    return {
      state: "unavailable",
      reason: "feature_flag_partial_rollout",
      message: "SCIM write unavailable because scim_write is not fully enabled.",
    };
  }
  return {
    state: "available",
    reason: "enabled",
    message: "SCIM write is available.",
  };
}

export async function assertScimWriteAvailable(
  repository: OperatorRepository,
  organisationId: string,
  options: { actorId?: string; surface?: string } = {}
) {
  const flags = await resolveFeatureFlags(repository, organisationId);
  const flag = flags.find((item) => item.key === "scim_write");
  const availability = resolveScimWriteAvailability({
    featureEnabled: Boolean(flag?.enabled),
    rolloutPercent: flag?.rolloutPercent ?? 0,
  });
  if (availability.state === "unavailable") {
    await repository.createIngestionLog({
      organisationId,
      sourceId: null,
      action: "enterprise:capability_runtime_denied",
      details: {
        capabilityId: "scim_write",
        reason: availability.reason,
        actorId: options.actorId ?? "scim",
        surface: options.surface ?? "scim_api",
      },
    });
    throw new AppError(409, "scim_write_unavailable", availability.message, {
      capabilityId: "scim_write",
      reason: availability.reason,
    });
  }
  return availability;
}
