import crypto from "node:crypto";

import { AppError } from "@/lib/errors";
import { connectorConfigs } from "@/lib/services/connectors/providers";
import type { ConnectorProvider } from "@/lib/types";

function getStateSigningSecret() {
  const secret = process.env.OPERATORLAYER_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new AppError(
      503,
      "oauth_state_secret_missing",
      "OPERATORLAYER_OAUTH_STATE_SECRET is required for connector OAuth state validation."
    );
  }
  return secret;
}

function signState(payload: string) {
  return crypto
    .createHmac("sha256", getStateSigningSecret())
    .update(payload)
    .digest("hex");
}

export function createConnectorOauthState(payload: {
  organisationId: string;
  provider: ConnectorProvider;
  redirectUri: string;
}) {
  const body = {
    ...payload,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = signState(encoded);
  return `${encoded}.${signature}`;
}

export function parseConnectorOauthState(state: string) {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) {
    throw new AppError(400, "oauth_state_invalid", "OAuth state payload is malformed.");
  }
  const expected = signState(encoded);
  if (expected !== signature) {
    throw new AppError(401, "oauth_state_signature_invalid", "OAuth state signature is invalid.");
  }
  const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    organisationId: string;
    provider: ConnectorProvider;
    redirectUri: string;
    nonce: string;
    expiresAt: number;
  };
  if (Date.now() > parsed.expiresAt) {
    throw new AppError(401, "oauth_state_expired", "OAuth state has expired.");
  }
  return parsed;
}

export function buildConnectorAuthorizeUrl(input: {
  provider: ConnectorProvider;
  redirectUri: string;
  organisationId: string;
}) {
  const config = connectorConfigs[input.provider];
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    throw new AppError(
      503,
      "connector_client_id_missing",
      `Missing ${config.clientIdEnv} for ${input.provider} OAuth setup.`
    );
  }
  const state = createConnectorOauthState({
    organisationId: input.organisationId,
    provider: input.provider,
    redirectUri: input.redirectUri,
  });
  const scopes = config.defaultScopes.join(" ");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });
  if (input.provider === "gmail") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }
  if (input.provider === "slack") {
    params.set("user_scope", "users:read");
  }
  return {
    authUrl: `${config.authorizeUrl}?${params.toString()}`,
    state,
  };
}

export async function exchangeConnectorCodeForToken(input: {
  provider: ConnectorProvider;
  code: string;
  redirectUri: string;
}) {
  const config = connectorConfigs[input.provider];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new AppError(
      503,
      "connector_client_secret_missing",
      `Missing connector credentials for ${input.provider}.`
    );
  }
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("code", input.code);
  form.set("redirect_uri", input.redirectUri);

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const tokenBody = (await tokenResponse.json()) as Record<string, unknown>;
  if (!tokenResponse.ok) {
    throw new AppError(502, "connector_token_exchange_failed", "Connector token exchange failed.", {
      provider: input.provider,
      status: tokenResponse.status,
      body: tokenBody,
    });
  }
  const accessToken =
    (tokenBody.access_token as string | undefined) ??
    (tokenBody.authed_user && typeof tokenBody.authed_user === "object"
      ? ((tokenBody.authed_user as Record<string, unknown>).access_token as string | undefined)
      : undefined);
  if (!accessToken) {
    throw new AppError(
      502,
      "connector_token_missing",
      "Connector token exchange succeeded but no access token was returned.",
      { provider: input.provider, body: tokenBody }
    );
  }
  return {
    accessToken,
    refreshToken: tokenBody.refresh_token as string | undefined,
    expiresIn: tokenBody.expires_in as number | undefined,
    raw: tokenBody,
  };
}
