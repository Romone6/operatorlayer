import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { assertSamlSsoAvailable } from "@/lib/enterprise/saml-availability";
import { jsonError } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { parseAndValidateSamlResponse, parseSignedSamlRelayState } from "@/lib/services/saml";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const samlResponse = String(formData.get("SAMLResponse") ?? "");
    const relayState = String(formData.get("RelayState") ?? "");
    const orgId = String(formData.get("orgId") ?? request.nextUrl.searchParams.get("orgId") ?? "");
    if (!samlResponse || !orgId) {
      throw new AppError(400, "saml_payload_missing", "SAMLResponse and orgId are required.");
    }
    const repository = getRepository();
    const sso = await assertSamlSsoAvailable(repository, orgId, {
      actorId: "saml",
      surface: "saml_acs",
    });
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const acsUrl = `${appOrigin}/api/saml/acs`;
    const parsed = parseAndValidateSamlResponse({
      samlResponseBase64: samlResponse,
      expectedAudience: process.env.OPERATORLAYER_SAML_SP_ENTITY_ID ?? `${appOrigin}/saml/sp`,
      expectedRecipient: acsUrl,
      expectedIssuer: sso.idpEntityId,
      expectedCertificateFingerprint: sso.certificateFingerprint,
    });
    const domain = parsed.email.split("@")[1]?.toLowerCase() ?? "";
    const normalizedAllowlist = sso.domainAllowlist.map((item) => item.trim().toLowerCase());
    if (normalizedAllowlist.length > 0 && !normalizedAllowlist.includes(domain)) {
      throw new AppError(403, "saml_domain_not_allowed", "SAML user domain is not allowed.");
    }
    const user = await repository.upsertUserMembership({
      organisationId: orgId,
      userId: `sso:${parsed.email}`,
      email: parsed.email,
      role: "member",
    });
    const relayPayload = parseSignedSamlRelayState({
      relayStateToken: relayState,
      expectedOrganisationId: orgId,
      appOrigin,
    });
    const redirect = relayPayload?.redirectUrl ?? `${appOrigin}/app/overview`;
    const response = NextResponse.redirect(redirect, 302);
    response.cookies.set("operatorlayer_sso_email", parsed.email, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("operatorlayer_sso_org", orgId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    response.headers.set("x-operatorlayer-sso-user-id", user.id);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
