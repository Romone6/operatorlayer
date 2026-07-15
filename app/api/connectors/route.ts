import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { assertConnectorAvailable } from "@/lib/enterprise/connector-availability";
import {
  resolveConnectors,
  upsertConnectorEvent,
} from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { connectorUpsertSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const connectors = await resolveConnectors(repository, context.organisationId);
    return jsonOk(connectors);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "connector-admin");
    const repository = getRepository();
    const payload = connectorUpsertSchema.parse(await request.json());
    await assertConnectorAvailable(repository, context.organisationId, payload.provider, {
      requireConnected: false,
      actorId: context.userId,
    });

    await upsertConnectorEvent(repository, context, {
      provider: payload.provider,
      displayName: payload.displayName,
      scopes: payload.scopes,
      sourceSelection: payload.sourceSelection,
      syncSchedule: payload.syncSchedule,
      metadata: {
        tokenRef: payload.tokenRef ?? null,
      },
    });

    const connectors = await resolveConnectors(repository, context.organisationId);
    const record = connectors.find((item) => item.provider === payload.provider);
    return jsonOk(record, 201);
  } catch (error) {
    return jsonError(error);
  }
}
