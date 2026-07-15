import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { resolveConnectors } from "@/lib/enterprise/store";
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
    if (!validProviders.has(provider as ConnectorProvider)) {
      throw new AppError(400, "invalid_connector_provider", "Unsupported connector provider.");
    }
    const typedProvider = provider as ConnectorProvider;

    const connectors = await resolveConnectors(repository, context.organisationId);
    if (!connectors.some((item) => item.provider === typedProvider)) {
      throw new AppError(404, "connector_not_found", "Connector not found.");
    }

    const [logs, jobs] = await Promise.all([
      repository.listIngestionLogs(context.organisationId),
      repository.listJobs(context.organisationId),
    ]);
    const syncLogs = logs
      .filter((log) => log.action === "enterprise:connector_sync_result")
      .filter((log) => String(log.details.provider ?? "") === typedProvider)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((log) => ({
        runAt: log.createdAt,
        syncStatus: String(log.details.syncStatus ?? "unknown"),
        error: typeof log.details.error === "string" ? log.details.error : null,
      }));
    const syncJobs = jobs
      .filter((job) => job.jobType === "connector_sync")
      .filter((job) => String(job.payload.provider ?? "") === typedProvider)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((job) => ({
        jobId: job.id,
        status: job.status,
        attempts: job.attempts,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }));

    return jsonOk({
      provider: typedProvider,
      runs: syncLogs,
      jobs: syncJobs,
    });
  } catch (error) {
    return jsonError(error);
  }
}

