import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as startSamlLogin } from "@/app/api/saml/login/route";
import { GET as getSsoConfig, PATCH as patchSsoConfig } from "@/app/api/sso/config/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  return new NextRequest(url, { ...init, headers });
}

function metadataXml() {
  const certBase64 = Buffer.from("metadata-cert-bytes").toString("base64");
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

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "test-user-001" },
      body: JSON.stringify({ name: "SSO Metadata Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("SSO metadata config", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("ingests IdP metadata XML and persists derived SSO config", async () => {
    const orgId = await createOrg();
    const patchResponse = await patchSsoConfig(
      authedRequest("http://localhost/api/sso/config", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          idpMetadataXml: metadataXml(),
          domainAllowlist: ["Example.com", "example.com", " partner.example.com "],
        }),
      })
    );
    expect(patchResponse.status).toBe(200);
    const patchPayload = (await patchResponse.json()) as {
      data: { idpEntityId: string; ssoUrl: string; metadataSource: string; domainAllowlist: string[] };
    };
    expect(patchPayload.data.idpEntityId).toBe("https://idp.example.com/metadata");
    expect(patchPayload.data.ssoUrl).toBe("https://idp.example.com/sso");
    expect(patchPayload.data.metadataSource).toBe("xml");
    expect(patchPayload.data.domainAllowlist).toEqual(["example.com", "partner.example.com"]);

    const getResponse = await getSsoConfig(authedRequest("http://localhost/api/sso/config", orgId));
    expect(getResponse.status).toBe(200);

    const loginResponse = await startSamlLogin(
      new NextRequest(`http://localhost/api/saml/login?orgId=${orgId}&relayState=/app/settings`)
    );
    expect(loginResponse.status).toBe(200);
    const loginPayload = (await loginResponse.json()) as { data: { redirectUrl: string } };
    expect(loginPayload.data.redirectUrl).toContain("https://idp.example.com/sso");

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=25", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: { events: Array<{ action: string; metadata: { metadataSource?: string } }> };
    };
    expect(
      auditPayload.data.events.some(
        (event) =>
          event.action === "enterprise:sso_config_upsert" &&
          event.metadata.metadataSource === "xml"
      )
    ).toBe(true);
  });

  it("fails closed for enabled SAML when metadata is invalid", async () => {
    const orgId = await createOrg();
    const patchResponse = await patchSsoConfig(
      authedRequest("http://localhost/api/sso/config", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          idpMetadataXml:
            "<?xml version=\"1.0\"?><md:EntityDescriptor xmlns:md=\"urn:oasis:names:tc:SAML:2.0:metadata\"><md:IDPSSODescriptor /></md:EntityDescriptor>",
          domainAllowlist: ["example.com"],
        }),
      })
    );
    expect(patchResponse.status).toBe(400);
    const payload = (await patchResponse.json()) as { error: { code: string } };
    expect(payload.error.code).toMatch(/saml_metadata_/);
  });
});
