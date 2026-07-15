import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { assertRole } from "@/lib/auth/authorization";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const { id } = await params;
    const repository = getRepository();
    await repository.deleteSource(context.organisationId, id);
    await repository.createIngestionLog({
      organisationId: context.organisationId,
      sourceId: id,
      action: "source_deleted",
      details: { sourceId: id },
    });
    return jsonOk({ sourceId: id, deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}

