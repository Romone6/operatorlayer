import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createSignedSamlRelayState,
  parseAndValidateSamlResponse,
  parseSignedSamlRelayState,
  resolveSamlRelayTarget,
} from "@/lib/services/saml";

function buildSamlResponseXml() {
  const certDer = Buffer.from("test-certificate-der");
  const certB64 = certDer.toString("base64");
  return {
    xml: `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Destination="http://localhost:3000/api/saml/acs">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://idp.example.com</saml:Issuer>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Conditions NotBefore="2020-01-01T00:00:00.000Z" NotOnOrAfter="2999-01-01T00:00:00.000Z">
      <saml:AudienceRestriction>
        <saml:Audience>http://localhost:3000/saml/sp</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:Subject>
      <saml:NameID>user@example.com</saml:NameID>
      <saml:SubjectConfirmation>
        <saml:SubjectConfirmationData Recipient="http://localhost:3000/api/saml/acs"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignatureValue>abc123</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certB64}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </ds:Signature>
  </saml:Assertion>
</samlp:Response>`,
    certDer,
  };
}

describe("parseAndValidateSamlResponse", () => {
  it("accepts valid assertion with matching fingerprint", () => {
    const { xml, certDer } = buildSamlResponseXml();
    const responseB64 = Buffer.from(xml, "utf8").toString("base64");
    const expectedFingerprint = crypto.createHash("sha256").update(certDer).digest("hex").toUpperCase();
    const parsed = parseAndValidateSamlResponse({
      samlResponseBase64: responseB64,
      expectedAudience: "http://localhost:3000/saml/sp",
      expectedRecipient: "http://localhost:3000/api/saml/acs",
      expectedIssuer: "https://idp.example.com",
      expectedCertificateFingerprint: expectedFingerprint,
    });
    expect(parsed.email).toBe("user@example.com");
  });
});

describe("saml relay state", () => {
  it("accepts same-origin relay path and resolves to absolute URL", () => {
    const resolved = resolveSamlRelayTarget({
      relayState: "/app/settings",
      appOrigin: "http://localhost:3000",
    });
    expect(resolved).toBe("http://localhost:3000/app/settings");
  });

  it("rejects external relay targets", () => {
    expect(() =>
      resolveSamlRelayTarget({
        relayState: "https://evil.example.com/phish",
        appOrigin: "http://localhost:3000",
      })
    ).toThrow(/RelayState/);
  });

  it("creates and validates signed relay state token", () => {
    const token = createSignedSamlRelayState({
      organisationId: "org_123",
      redirectUrl: "http://localhost:3000/app/overview",
      expiresInSeconds: 60,
    });
    const parsed = parseSignedSamlRelayState({
      relayStateToken: token,
      expectedOrganisationId: "org_123",
      appOrigin: "http://localhost:3000",
    });
    expect(parsed?.organisationId).toBe("org_123");
    expect(parsed?.redirectUrl).toBe("http://localhost:3000/app/overview");
  });

  it("rejects tampered relay state token", () => {
    const token = createSignedSamlRelayState({
      organisationId: "org_123",
      redirectUrl: "http://localhost:3000/app/overview",
      expiresInSeconds: 60,
    });
    const tampered = `${token}tamper`;
    expect(() =>
      parseSignedSamlRelayState({
        relayStateToken: tampered,
        expectedOrganisationId: "org_123",
        appOrigin: "http://localhost:3000",
      })
    ).toThrow(/RelayState/);
  });
});
