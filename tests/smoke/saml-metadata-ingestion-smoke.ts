import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-saml-meta-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

function metadataXml() {
  const certBase64 = Buffer.from("smoke-metadata-cert-bytes").toString("base64");
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="https://idp.example.com/metadata">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certBase64}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { PATCH: patchSsoConfig, GET: getSsoConfig } = await import("@/app/api/sso/config/route");
  const { GET: startSamlLogin } = await import("@/app/api/saml/login/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-saml-meta-001" },
      body: JSON.stringify({ name: "SAML Metadata Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for SAML metadata smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const patch = await patchSsoConfig(
    authedRequest("http://localhost/api/sso/config", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: true,
        idpMetadataXml: metadataXml(),
        domainAllowlist: ["example.com"],
      }),
    })
  );
  if (!patch.ok) throw new Error("Failed to patch SSO config via metadata XML.");
  const patchPayload = (await patch.json()) as {
    data: { idpEntityId: string; ssoUrl: string; metadataSource: string };
  };
  if (patchPayload.data.idpEntityId !== "https://idp.example.com/metadata") {
    throw new Error("SAML metadata entity id ingestion mismatch.");
  }
  if (patchPayload.data.ssoUrl !== "https://idp.example.com/sso") {
    throw new Error("SAML metadata SSO URL ingestion mismatch.");
  }
  if (patchPayload.data.metadataSource !== "xml") {
    throw new Error("SAML metadata source should be xml.");
  }

  const read = await getSsoConfig(authedRequest("http://localhost/api/sso/config", orgId));
  if (!read.ok) throw new Error("Failed to read SSO config after metadata ingestion.");

  const login = await startSamlLogin(
    new NextRequest(`http://localhost/api/saml/login?orgId=${orgId}&relayState=/app/overview`)
  );
  if (login.status !== 200) throw new Error("Expected SAML login payload.");
  const loginPayload = (await login.json()) as { data: { redirectUrl: string } };
  if (!loginPayload.data.redirectUrl.startsWith("https://idp.example.com/sso")) {
    throw new Error("SAML login destination does not use ingested metadata SSO URL.");
  }

  console.log("saml-metadata-ingestion-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
