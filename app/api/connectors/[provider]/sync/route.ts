import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { assertConnectorAvailable } from "@/lib/enterprise/connector-availability";
import { resolveConnectors } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
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
    const repository = getRepository();
    const { provider } = await params;
    if (!validProviders.has(provider as ConnectorProvider)) {
      throw new AppError(400, "invalid_connector_provider", "Unsupported connector provider.");
    }
    await assertConnectorAvailable(repository, context.organisationId, provider as ConnectorProvider, {
      requireConnected: true,
      actorId: context.userId,
    });

    const connectors = await resolveConnectors(repository, context.organisationId);
    const existing = connectors.find((item) => item.provider === provider);
    if (!existing || existing.status !== "connected") {
      throw new AppError(404, "connector_not_connected", "Connector is not connected.");
    }

    const job = await enqueueJobWithIdempotency(repository, {
      organisationId: context.organisationId,
      jobType: "connector_sync",
      payload: {
        provider,
      },
      idempotencyKey: resolveRequestIdempotencyKey(request, "connector_sync", {
        provider,
        organisationId: context.organisationId,
      }),
    });

    return jsonOk({
      provider,
      jobId: job.id,
      syncStatus: "queued",
    });
  } catch (error) {
    return jsonError(error);
  }
}
