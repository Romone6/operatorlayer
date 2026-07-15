import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";

import { resolveSsoConfig } from "./store";

export async function assertSamlSsoAvailable(
  repository: OperatorRepository,
  organisationId: string,
  options: { actorId?: string; surface?: string } = {}
) {
  const sso = await resolveSsoConfig(repository, organisationId);
  if (!sso.enabled) {
    await repository.createIngestionLog({
      organisationId,
      sourceId: null,
      action: "enterprise:capability_runtime_denied",
      details: {
        capabilityId: "saml_sso",
        reason: "sso_disabled",
        actorId: options.actorId ?? "saml",
        surface: options.surface ?? "saml_auth",
      },
    });
    throw new AppError(409, "saml_not_enabled", "SAML is not enabled for this organisation.", {
      capabilityId: "saml_sso",
      reason: "sso_disabled",
    });
  }
  return sso;
}
