import { NextRequest } from "next/server";

import { AppError } from "@/lib/errors";
import { assertSamlSsoAvailable } from "@/lib/enterprise/saml-availability";
import { jsonError, jsonOk } from "@/lib/http";
import { buildSamlAuthRequest, createSignedSamlRelayState, resolveSamlRelayTarget } from "@/lib/services/saml";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const organisationId = request.nextUrl.searchParams.get("orgId");
    if (!organisationId) {
      throw new AppError(400, "saml_org_missing", "orgId query parameter is required.");
    }
    const repository = getRepository();
    const sso = await assertSamlSsoAvailable(repository, organisationId, {
      actorId: "saml",
      surface: "saml_login",
    });
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const acsUrl = `${appOrigin}/api/saml/acs`;
    const redirectTarget = resolveSamlRelayTarget({
      relayState: request.nextUrl.searchParams.get("relayState"),
      appOrigin,
    });
    const relayState = createSignedSamlRelayState({
      organisationId,
      redirectUrl: redirectTarget,
    });
    const auth = buildSamlAuthRequest({
      issuer: process.env.OPERATORLAYER_SAML_SP_ENTITY_ID ?? `${appOrigin}/saml/sp`,
      acsUrl,
      destination: sso.ssoUrl,
      relayState,
    });
    const params = new URLSearchParams({
      SAMLRequest: auth.samlRequest,
      RelayState: relayState,
    });
    return jsonOk({
      orgId: organisationId,
      requestId: auth.requestId,
      redirectUrl: `${sso.ssoUrl}?${params.toString()}`,
      relayStateToken: relayState,
      redirectTarget,
    });
  } catch (error) {
    return jsonError(error);
  }
}
