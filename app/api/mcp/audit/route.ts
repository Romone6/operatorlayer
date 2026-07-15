import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { assertMcpActionsAvailable } from "@/lib/enterprise/mcp-availability";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    await assertMcpActionsAvailable(repository, context.organisationId, {
      actorId: context.userId,
      surface: "mcp_audit",
    });
    const logs = await repository.listIngestionLogs(context.organisationId);
    const entries = logs
      .filter((log) => log.action.startsWith("enterprise:mcp_"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((log) => ({
        id: log.id,
        action: log.action,
        occurredAt: log.createdAt,
        details: log.details,
      }));

    return jsonOk({
      entries,
      count: entries.length,
    });
  } catch (error) {
    return jsonError(error);
  }
}
