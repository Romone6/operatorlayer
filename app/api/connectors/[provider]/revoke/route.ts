import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { ConnectorProvider } from "@/lib/types";

const validProviders = new Set<ConnectorProvider>([
  "gmail",
  "slack",
  "outlook",
  "hubspot",
  "salesforce",
  "intercom",
  "zendesk",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "connector-admin");
    const { provider } = await params;
    if (!validProviders.has(provider as ConnectorProvider)) {
      throw new AppError(400, "invalid_connector_provider", "Unsupported connector provider.");
    }
    const repository = getRepository();
    await appendEnterpriseEvent(repository, context, {
      action: "connector_revoked",
      payload: {
        provider,
      },
    });
    return jsonOk({
      provider,
      status: "revoked",
    });
  } catch (error) {
    return jsonError(error);
  }
}
