import { NextRequest } from "next/server";
import { z } from "zod";

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

const backfillSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
});

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
    const typedProvider = provider as ConnectorProvider;
    await assertConnectorAvailable(repository, context.organisationId, typedProvider, {
      requireConnected: true,
      actorId: context.userId,
    });

    const connectors = await resolveConnectors(repository, context.organisationId);
    const connector = connectors.find((item) => item.provider === typedProvider);
    if (!connector || connector.status !== "connected") {
      throw new AppError(404, "connector_not_connected", "Connector is not connected.");
    }

    const parsed = backfillSchema.parse(await request.json().catch(() => ({})));
    const from = new Date(Date.now() - parsed.days * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    const job = await enqueueJobWithIdempotency(repository, {
      organisationId: context.organisationId,
      jobType: "connector_sync",
      payload: {
        provider: typedProvider,
        mode: "backfill",
        range: { from, to, days: parsed.days },
      },
      idempotencyKey: resolveRequestIdempotencyKey(request, "connector_backfill", {
        provider: typedProvider,
        days: parsed.days,
        organisationId: context.organisationId,
      }),
    });

    await repository.createIngestionLog({
      organisationId: context.organisationId,
      sourceId: null,
      action: "enterprise:connector_backfill_enqueued",
      details: {
        provider: typedProvider,
        jobId: job.id,
        from,
        to,
        days: parsed.days,
        actorId: context.userId,
      },
    });

    return jsonOk({
      provider: typedProvider,
      jobId: job.id,
      mode: "backfill",
      range: { from, to, days: parsed.days },
      status: "queued",
    });
  } catch (error) {
    return jsonError(error);
  }
}
