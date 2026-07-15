import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { assertConnectorAvailable } from "@/lib/enterprise/connector-availability";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { buildConnectorAuthorizeUrl } from "@/lib/services/connectors/oauth";
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
    const redirectUri = request.nextUrl.searchParams.get("redirectUri");
    if (!redirectUri) {
      throw new AppError(400, "connector_redirect_missing", "redirectUri query param is required.");
    }
    const { authUrl, state } = buildConnectorAuthorizeUrl({
      provider: provider as ConnectorProvider,
      organisationId: context.organisationId,
      redirectUri,
    });
    return jsonOk({
      provider,
      authUrl,
      state,
    });
  } catch (error) {
    return jsonError(error);
  }
}
