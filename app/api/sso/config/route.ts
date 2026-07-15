import { NextRequest } from "next/server";
import { z } from "zod";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveSsoConfig } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { parseSamlIdentityProviderMetadata } from "@/lib/services/saml";

const ssoPatchSchema = z.object({
  enabled: z.boolean(),
  idpEntityId: z.string().min(5).optional(),
  ssoUrl: z.url().optional(),
  certificateFingerprint: z.string().min(16).optional(),
  idpMetadataXml: z.string().min(64).optional(),
  domainAllowlist: z.array(z.string().min(3)).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const config = await resolveSsoConfig(repository, context.organisationId);
    return jsonOk(config);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const payload = ssoPatchSchema.parse(await request.json());
    const metadataParsed = payload.idpMetadataXml
      ? parseSamlIdentityProviderMetadata(payload.idpMetadataXml)
      : null;
    const idpEntityId = metadataParsed?.entityId ?? payload.idpEntityId ?? "";
    const ssoUrl = metadataParsed?.ssoUrl ?? payload.ssoUrl ?? "";
    const certificateFingerprint =
      metadataParsed?.certificateFingerprint ?? payload.certificateFingerprint ?? "";
    if (payload.enabled && (!idpEntityId || !ssoUrl || !certificateFingerprint)) {
      throw new AppError(
        400,
        "saml_config_incomplete",
        "Enabled SAML configuration requires idpEntityId, ssoUrl, and certificateFingerprint."
      );
    }

    const domainAllowlist = Array.from(
      new Set(payload.domainAllowlist.map((domain) => domain.trim().toLowerCase()).filter(Boolean))
    );
    const now = new Date().toISOString();
    await appendEnterpriseEvent(repository, context, {
      action: "sso_config_upsert",
      payload: {
        enabled: payload.enabled,
        idpEntityId,
        ssoUrl,
        certificateFingerprint,
        metadataSource: metadataParsed ? "xml" : "manual",
        updatedAt: now,
      },
    });
    await appendEnterpriseEvent(repository, context, {
      action: "domain_allowlist_upsert",
      payload: {
        domainAllowlist,
        updatedAt: now,
      },
    });
    const config = await resolveSsoConfig(repository, context.organisationId);
    return jsonOk(config);
  } catch (error) {
    return jsonError(error);
  }
}
