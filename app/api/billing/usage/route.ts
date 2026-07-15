import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { resolveBillingEntitlement } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const [sources, evaluations, connectors, entitlement] = await Promise.all([
      repository.listSources(context.organisationId),
      repository.listEvaluations(context.organisationId),
      (async () => {
        const logs = await repository.listIngestionLogs(context.organisationId);
        return new Set(
          logs
            .filter((item) => item.action === "enterprise:connector_upsert")
            .map((item) => String((item.details as Record<string, unknown>).provider ?? ""))
            .filter((item) => item.length > 0)
        ).size;
      })(),
      resolveBillingEntitlement(repository, context.organisationId),
    ]);

    return jsonOk({
      entitlement,
      usage: {
        sources: sources.length,
        evaluations: evaluations.length,
        connectors,
      },
      limits: {
        sources: entitlement.sourcesMonthlyLimit,
        evaluations: entitlement.evaluationsMonthlyLimit,
        connectors: entitlement.connectorLimit,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
