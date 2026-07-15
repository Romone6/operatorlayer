import { jsonError } from "@/lib/http";
import { buildSamlServiceProviderMetadata } from "@/lib/services/saml";

export async function GET() {
  try {
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
    const entityId = process.env.OPERATORLAYER_SAML_SP_ENTITY_ID ?? `${appOrigin}/saml/sp`;
    const acsUrl = `${appOrigin}/api/saml/acs`;
    const xml = buildSamlServiceProviderMetadata({
      entityId,
      acsUrl,
      certificatePem: process.env.OPERATORLAYER_SAML_SP_CERT_PEM,
    });

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

