import crypto from "node:crypto";

import { AppError } from "@/lib/errors";

function extractTag(xml: string, tag: string) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
}

function decodeSamlResponse(base64: string) {
  return Buffer.from(base64, "base64").toString("utf8");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function normalizeFingerprint(value: string) {
  return value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

function normalizeComparable(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractAttribute(xml: string, tag: string, attribute: string) {
  const regex = new RegExp(`<${tag}[^>]*\\b${attribute}="([^"]+)"[^>]*>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
}

function resolveRelayStateSecret() {
  return (
    process.env.OPERATORLAYER_SAML_RELAY_STATE_SECRET ??
    process.env.OPERATORLAYER_OAUTH_STATE_SECRET ??
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY ??
    "operatorlayer-dev-relay-state-secret"
  );
}

function signRelayPayload(serializedPayload: string) {
  return crypto.createHmac("sha256", resolveRelayStateSecret()).update(serializedPayload).digest("base64url");
}

function isSafeSameOriginUrl(url: URL, appOrigin: string) {
  return url.origin === appOrigin && url.pathname.startsWith("/");
}

function extractCertificateFingerprint(xml: string) {
  const certRaw =
    extractTag(xml, "ds:X509Certificate") ??
    extractTag(xml, "X509Certificate");
  if (!certRaw) return null;
  const certDer = Buffer.from(certRaw.replace(/\s+/g, ""), "base64");
  return crypto.createHash("sha256").update(certDer).digest("hex").toUpperCase();
}

export function parseSamlIdentityProviderMetadata(metadataXml: string) {
  const xml = metadataXml.trim();
  if (!xml.includes("EntityDescriptor") || !xml.includes("IDPSSODescriptor")) {
    throw new AppError(400, "saml_metadata_invalid", "SAML IdP metadata XML is invalid.");
  }

  const entityId =
    extractAttribute(xml, "md:EntityDescriptor", "entityID") ??
    extractAttribute(xml, "EntityDescriptor", "entityID");
  if (!entityId) {
    throw new AppError(400, "saml_metadata_entity_id_missing", "SAML metadata is missing entityID.");
  }

  const ssoUrlCandidates: string[] = [];
  const ssoRegex = /<(?:md:)?SingleSignOnService\b[^>]*\bLocation="([^"]+)"[^>]*>/gi;
  let ssoMatch: RegExpExecArray | null = ssoRegex.exec(xml);
  while (ssoMatch) {
    ssoUrlCandidates.push(String(ssoMatch[1] ?? "").trim());
    ssoMatch = ssoRegex.exec(xml);
  }
  const ssoUrl = ssoUrlCandidates.find((candidate) => candidate.startsWith("https://")) ?? null;
  if (!ssoUrl) {
    throw new AppError(
      400,
      "saml_metadata_sso_url_missing",
      "SAML metadata is missing a valid SingleSignOnService Location."
    );
  }

  const certificateFingerprint = extractCertificateFingerprint(xml);
  if (!certificateFingerprint) {
    throw new AppError(400, "saml_metadata_certificate_missing", "SAML metadata is missing an IdP certificate.");
  }

  return {
    entityId,
    ssoUrl,
    certificateFingerprint,
  };
}

function assertSignaturePresence(xml: string) {
  const hasSigValue = Boolean(extractTag(xml, "ds:SignatureValue") ?? extractTag(xml, "SignatureValue"));
  if (!hasSigValue) {
    throw new AppError(401, "saml_signature_missing", "SAML signature is missing.");
  }
}

function validateTimeWindow(notBefore: string | null, notOnOrAfter: string | null) {
  const now = Date.now();
  if (notBefore) {
    const before = Date.parse(notBefore);
    if (!Number.isNaN(before) && now < before) {
      throw new AppError(401, "saml_assertion_not_yet_valid", "SAML assertion is not yet valid.");
    }
  }
  if (notOnOrAfter) {
    const expiry = Date.parse(notOnOrAfter);
    if (!Number.isNaN(expiry) && now >= expiry) {
      throw new AppError(401, "saml_assertion_expired", "SAML assertion has expired.");
    }
  }
}

export function buildSamlAuthRequest(input: {
  issuer: string;
  acsUrl: string;
  destination: string;
  relayState: string;
}) {
  const id = `_${crypto.randomUUID()}`;
  const issueInstant = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${id}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${input.destination}"
  AssertionConsumerServiceURL="${input.acsUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${input.issuer}</saml:Issuer>
  <samlp:NameIDPolicy AllowCreate="true" Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"/>
</samlp:AuthnRequest>`;
  const encoded = Buffer.from(xml, "utf8").toString("base64");
  return {
    requestId: id,
    samlRequest: encoded,
    relayState: input.relayState,
  };
}

export function resolveSamlRelayTarget(input: {
  relayState: string | null | undefined;
  appOrigin: string;
  defaultPath?: string;
}) {
  const defaultUrl = new URL(input.defaultPath ?? "/app/overview", input.appOrigin).toString();
  const relayState = String(input.relayState ?? "").trim();
  if (!relayState) return defaultUrl;

  if (relayState.startsWith("/")) {
    if (relayState.startsWith("//")) {
      throw new AppError(400, "saml_relay_state_invalid", "RelayState must be a same-origin path.");
    }
    return new URL(relayState, input.appOrigin).toString();
  }

  try {
    const parsed = new URL(relayState);
    if (!isSafeSameOriginUrl(parsed, input.appOrigin)) {
      throw new AppError(400, "saml_relay_state_invalid", "RelayState must be a same-origin URL.");
    }
    return parsed.toString();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "saml_relay_state_invalid", "RelayState must be a valid same-origin path or URL.");
  }
}

export function createSignedSamlRelayState(input: {
  organisationId: string;
  redirectUrl: string;
  expiresInSeconds?: number;
}) {
  const payload = {
    organisationId: input.organisationId,
    redirectUrl: input.redirectUrl,
    expiresAt: Date.now() + (input.expiresInSeconds ?? 600) * 1000,
  };
  const serializedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signRelayPayload(serializedPayload);
  return `${serializedPayload}.${signature}`;
}

export function parseSignedSamlRelayState(input: {
  relayStateToken: string | null | undefined;
  expectedOrganisationId: string;
  appOrigin: string;
}) {
  const token = String(input.relayStateToken ?? "").trim();
  if (!token) {
    return null;
  }
  const [serializedPayload, signature] = token.split(".");
  if (!serializedPayload || !signature) {
    throw new AppError(400, "saml_relay_state_invalid", "RelayState token is invalid.");
  }

  const expectedSignature = signRelayPayload(serializedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new AppError(400, "saml_relay_state_invalid", "RelayState token signature is invalid.");
  }

  let payload: { organisationId: string; redirectUrl: string; expiresAt: number };
  try {
    payload = JSON.parse(decodeBase64Url(serializedPayload)) as {
      organisationId: string;
      redirectUrl: string;
      expiresAt: number;
    };
  } catch {
    throw new AppError(400, "saml_relay_state_invalid", "RelayState payload is invalid.");
  }

  if (payload.organisationId !== input.expectedOrganisationId) {
    throw new AppError(400, "saml_relay_state_invalid", "RelayState organisation mismatch.");
  }
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) {
    throw new AppError(400, "saml_relay_state_expired", "RelayState token has expired.");
  }

  let parsed: URL;
  try {
    parsed = new URL(payload.redirectUrl);
  } catch {
    throw new AppError(400, "saml_relay_state_invalid", "RelayState redirect target is invalid.");
  }
  if (!isSafeSameOriginUrl(parsed, input.appOrigin)) {
    throw new AppError(400, "saml_relay_state_invalid", "RelayState redirect target is not allowed.");
  }

  return payload;
}

export function buildSamlServiceProviderMetadata(input: {
  entityId: string;
  acsUrl: string;
  certificatePem?: string;
}) {
  const certificateBody = input.certificatePem
    ? input.certificatePem
        .replace("-----BEGIN CERTIFICATE-----", "")
        .replace("-----END CERTIFICATE-----", "")
        .replace(/\s+/g, "")
    : null;

  const keyDescriptor = certificateBody
    ? `<md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>${certificateBody}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${input.entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    ${keyDescriptor}
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${input.acsUrl}" index="0" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

export function parseAndValidateSamlResponse(input: {
  samlResponseBase64: string;
  expectedAudience: string;
  expectedRecipient: string;
  expectedIssuer: string;
  expectedCertificateFingerprint?: string;
}) {
  const xml = decodeSamlResponse(input.samlResponseBase64);
  assertSignaturePresence(xml);
  const issuer =
    extractTag(xml, "saml:Issuer") ??
    extractTag(xml, "Issuer");
  if (!issuer || normalizeComparable(issuer) !== normalizeComparable(input.expectedIssuer)) {
    throw new AppError(401, "saml_issuer_mismatch", "SAML issuer does not match configured IdP.");
  }

  let audience =
    extractTag(xml, "saml:Audience") ??
    extractTag(xml, "Audience");
  if (!audience && xml.includes(input.expectedAudience)) {
    audience = input.expectedAudience;
  }
  const normalizedAudience = normalizeComparable(audience ?? "");
  const normalizedExpectedAudience = normalizeComparable(input.expectedAudience);
  const audienceMatches =
    normalizedAudience === normalizedExpectedAudience ||
    normalizedAudience.includes(normalizedExpectedAudience) ||
    normalizedExpectedAudience.includes(normalizedAudience);
  if (!audience || !audienceMatches) {
    throw new AppError(401, "saml_audience_mismatch", "SAML audience does not match service provider.");
  }

  const recipientMatch = xml.match(/Recipient="([^"]+)"/i)?.[1] ?? null;
  if (!recipientMatch || normalizeComparable(recipientMatch) !== normalizeComparable(input.expectedRecipient)) {
    throw new AppError(401, "saml_recipient_mismatch", "SAML recipient does not match ACS endpoint.");
  }

  const notBefore = xml.match(/NotBefore="([^"]+)"/i)?.[1] ?? null;
  const notOnOrAfter = xml.match(/NotOnOrAfter="([^"]+)"/i)?.[1] ?? null;
  validateTimeWindow(notBefore, notOnOrAfter);

  const nameId =
    extractTag(xml, "saml:NameID") ??
    extractTag(xml, "NameID");
  if (!nameId) {
    throw new AppError(401, "saml_nameid_missing", "SAML NameID is missing.");
  }

  if (input.expectedCertificateFingerprint) {
    const actual = extractCertificateFingerprint(xml);
    if (!actual) {
      throw new AppError(401, "saml_certificate_missing", "SAML certificate is missing from assertion.");
    }
    if (normalizeFingerprint(actual) !== normalizeFingerprint(input.expectedCertificateFingerprint)) {
      throw new AppError(401, "saml_certificate_fingerprint_mismatch", "SAML certificate fingerprint mismatch.");
    }
  }

  const emailMatch = nameId.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  if (!emailMatch) {
    throw new AppError(401, "saml_nameid_invalid", "SAML NameID must be an email address.");
  }

  return {
    email: nameId.toLowerCase(),
    issuer,
    audience,
    recipient: recipientMatch,
  };
}
