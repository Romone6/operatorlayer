import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { assertConnectorAvailable } from "@/lib/enterprise/connector-availability";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { exchangeConnectorCodeForToken, parseConnectorOauthState } from "@/lib/services/connectors/oauth";
import { upsertConnectorEvent } from "@/lib/enterprise/store";
import type { ConnectorProvider } from "@/lib/types";

const providers = new Set<ConnectorProvider>([
  "gmail",
  "slack",
  "outlook",
  "hubspot",
  "salesforce",
  "intercom",
  "zendesk",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "connector-admin");
    const repository = getRepository();
    const { provider } = await params;
    if (!providers.has(provider as ConnectorProvider)) {
      throw new AppError(400, "connector_provider_invalid", "Unsupported connector provider.");
    }
    await assertConnectorAvailable(repository, context.organisationId, provider as ConnectorProvider, {
      requireConnected: false,
      actorId: context.userId,
    });

    const code = request.nextUrl.searchParams.get("code");
    const stateRaw = request.nextUrl.searchParams.get("state");
    if (!code || !stateRaw) {
      throw new AppError(400, "oauth_callback_invalid", "Missing code or state in OAuth callback.");
    }
    const state = parseConnectorOauthState(stateRaw);
    if (state.organisationId !== context.organisationId || state.provider !== provider) {
      throw new AppError(403, "oauth_state_org_mismatch", "OAuth callback state does not match organisation context.");
    }
    const token = await exchangeConnectorCodeForToken({
      provider: provider as ConnectorProvider,
      code,
      redirectUri: state.redirectUri,
    });

    const rawScopeValue =
      (token.raw.scope as string | undefined) ??
      (token.raw.scopes as string | undefined) ??
      (token.raw.authed_user &&
      typeof token.raw.authed_user === "object" &&
      typeof (token.raw.authed_user as Record<string, unknown>).scope === "string"
        ? ((token.raw.authed_user as Record<string, unknown>).scope as string)
        : undefined);
    const grantedScopes = rawScopeValue
      ? rawScopeValue
          .split(/[,\s]+/)
          .map((scope) => scope.trim())
          .filter(Boolean)
      : [];
    const tokenExpiresAt =
      typeof token.expiresIn === "number" && Number.isFinite(token.expiresIn)
        ? new Date(Date.now() + token.expiresIn * 1000).toISOString()
        : null;

    await upsertConnectorEvent(repository, context, {
      provider: provider as ConnectorProvider,
      displayName: `${provider.charAt(0).toUpperCase()}${provider.slice(1)} Connector`,
      scopes: grantedScopes,
      sourceSelection: [],
      syncSchedule: "manual",
      token: token.accessToken,
      metadata: {
        refreshTokenAvailable: Boolean(token.refreshToken),
        expiresIn: token.expiresIn ?? null,
        tokenExpiresAt,
        grantedScopes,
        throttlingState: "normal",
        instanceUrl:
          (token.raw.instance_url as string | undefined) ??
          (token.raw.api_url as string | undefined) ??
          null,
      },
    });

    return jsonOk({
      provider,
      connected: true,
      refreshTokenAvailable: Boolean(token.refreshToken),
    });
  } catch (error) {
    return jsonError(error);
  }
}
