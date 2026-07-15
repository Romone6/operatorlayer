import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const [sources, jobs, logs] = await Promise.all([
      repository.listSources(context.organisationId),
      repository.listJobs(context.organisationId),
      repository.listIngestionLogs(context.organisationId),
    ]);

    return jsonOk({
      sources,
      jobs,
      logs,
    });
  } catch (error) {
    return jsonError(error);
  }
}
