import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { parseSamlIdentityProviderMetadata } from "@/lib/services/saml";

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

describe("SAML metadata parser", () => {
  it("extracts entity id, SSO URL, and certificate fingerprint", () => {
    const parsed = parseSamlIdentityProviderMetadata(metadataXml());
    const expectedFingerprint = crypto
      .createHash("sha256")
      .update(Buffer.from("metadata-cert-bytes"))
      .digest("hex")
      .toUpperCase();

    expect(parsed.entityId).toBe("https://idp.example.com/metadata");
    expect(parsed.ssoUrl).toBe("https://idp.example.com/sso");
    expect(parsed.certificateFingerprint).toBe(expectedFingerprint);
  });

  it("fails closed when required metadata attributes are missing", () => {
    expect(() =>
      parseSamlIdentityProviderMetadata("<EntityDescriptor><IDPSSODescriptor /></EntityDescriptor>")
    ).toThrowError(/missing entityID/i);
  });
});
