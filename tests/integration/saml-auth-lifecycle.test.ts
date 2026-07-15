import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { PATCH as patchSsoConfig } from "@/app/api/sso/config/route";
import { GET as startSamlLogin } from "@/app/api/saml/login/route";
import { POST as samlAcs } from "@/app/api/saml/acs/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-001",
    },
    body: JSON.stringify({ name: "SAML Test Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

function buildSamlResponse(email: string) {
  const certDer = Buffer.from("test-certificate-der");
  const certB64 = certDer.toString("base64");
  const fingerprint = crypto.createHash("sha256").update(certDer).digest("hex").toUpperCase();
  const xml = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Destination="http://localhost:3000/api/saml/acs">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://idp.example.com</saml:Issuer>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Conditions NotBefore="2020-01-01T00:00:00.000Z" NotOnOrAfter="2999-01-01T00:00:00.000Z">
      <saml:AudienceRestriction>
        <saml:Audience>http://localhost:3000/saml/sp</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:Subject>
      <saml:NameID>${email}</saml:NameID>
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
</samlp:Response>`;
  return {
    fingerprint,
    responseB64: Buffer.from(xml, "utf8").toString("base64"),
  };
}

describe("SAML login/ACS lifecycle", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    delete process.env.OPERATORLAYER_SAML_SP_ENTITY_ID;
  });

  it("generates signed relay state and redirects ACS to same-origin target", async () => {
    const orgId = await createOrg();
    const saml = buildSamlResponse("user@example.com");

    const patchResponse = await patchSsoConfig(
      authedRequest("http://localhost/api/sso/config", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          idpEntityId: "https://idp.example.com",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: saml.fingerprint,
          domainAllowlist: ["example.com"],
        }),
      })
    );
    expect(patchResponse.status).toBe(200);

    const loginResponse = await startSamlLogin(
      new NextRequest(`http://localhost/api/saml/login?orgId=${orgId}&relayState=/app/settings`)
    );
    expect(loginResponse.status).toBe(200);
    const loginPayload = (await loginResponse.json()) as {
      data: { redirectUrl: string; relayStateToken: string; redirectTarget: string };
    };
    expect(loginPayload.data.redirectTarget).toBe("http://localhost:3000/app/settings");

    const redirectUrl = new URL(loginPayload.data.redirectUrl);
    const relayStateToken = redirectUrl.searchParams.get("RelayState");
    expect(relayStateToken).toBeTruthy();
    expect(relayStateToken).toBe(loginPayload.data.relayStateToken);

    const form = new URLSearchParams();
    form.set("SAMLResponse", saml.responseB64);
    form.set("RelayState", String(relayStateToken));
    form.set("orgId", orgId);

    const acsResponse = await samlAcs(
      new NextRequest("http://localhost/api/saml/acs", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      })
    );
    expect(acsResponse.status).toBe(302);
    expect(acsResponse.headers.get("location")).toBe("http://localhost:3000/app/settings");
    expect(acsResponse.headers.get("x-operatorlayer-sso-user-id")).toBeTruthy();
  });

  it("rejects tampered relay state token", async () => {
    const orgId = await createOrg();
    const saml = buildSamlResponse("user@example.com");

    await patchSsoConfig(
      authedRequest("http://localhost/api/sso/config", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          idpEntityId: "https://idp.example.com",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: saml.fingerprint,
          domainAllowlist: ["example.com"],
        }),
      })
    );

    const loginResponse = await startSamlLogin(
      new NextRequest(`http://localhost/api/saml/login?orgId=${orgId}&relayState=/app/overview`)
    );
    const loginPayload = (await loginResponse.json()) as {
      data: { relayStateToken: string };
    };

    const form = new URLSearchParams();
    form.set("SAMLResponse", saml.responseB64);
    form.set("RelayState", `${loginPayload.data.relayStateToken}tamper`);
    form.set("orgId", orgId);

    const acsResponse = await samlAcs(
      new NextRequest("http://localhost/api/saml/acs", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      })
    );
    expect(acsResponse.status).toBe(400);
  });

  it("enforces JIT domain allowlist on ACS", async () => {
    const orgId = await createOrg();
    const saml = buildSamlResponse("user@outside.com");

    await patchSsoConfig(
      authedRequest("http://localhost/api/sso/config", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          idpEntityId: "https://idp.example.com",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: saml.fingerprint,
          domainAllowlist: ["example.com"],
        }),
      })
    );

    const loginResponse = await startSamlLogin(
      new NextRequest(`http://localhost/api/saml/login?orgId=${orgId}&relayState=/app/overview`)
    );
    const loginPayload = (await loginResponse.json()) as {
      data: { relayStateToken: string };
    };

    const form = new URLSearchParams();
    form.set("SAMLResponse", saml.responseB64);
    form.set("RelayState", loginPayload.data.relayStateToken);
    form.set("orgId", orgId);

    const acsResponse = await samlAcs(
      new NextRequest("http://localhost/api/saml/acs", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      })
    );
    expect(acsResponse.status).toBe(403);
  });

  it("fails closed and emits runtime denial evidence when SAML SSO is unavailable", async () => {
    const orgId = await createOrg();
    const loginResponse = await startSamlLogin(new NextRequest(`http://localhost/api/saml/login?orgId=${orgId}`));
    expect(loginResponse.status).toBe(409);
    const loginPayload = (await loginResponse.json()) as { error: { code: string } };
    expect(loginPayload.error.code).toBe("saml_not_enabled");

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: {
        events: Array<{
          action: string;
          metadata: { capabilityId?: string; reason?: string; surface?: string };
        }>;
      };
    };
    expect(
      auditPayload.data.events.some(
        (event) =>
          event.action === "enterprise:capability_runtime_denied" &&
          event.metadata.capabilityId === "saml_sso" &&
          event.metadata.reason === "sso_disabled" &&
          event.metadata.surface === "saml_login"
      )
    ).toBe(true);
  });
});
