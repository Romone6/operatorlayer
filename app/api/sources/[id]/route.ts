import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { assertRole } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { deleteSourceFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const { id } = await params;
    const repository = getRepository();
    const source = await repository.getSourceById(context.organisationId, id);
    if (!source) throw new AppError(404, "source_not_found", "Source was not found.");
    const storagePath = source.metadata.storagePath;
    if (typeof storagePath === "string") await deleteSourceFile(storagePath);
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

