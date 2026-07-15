import { NextRequest, NextResponse } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError } from "@/lib/http";
import { getRepository } from "@/lib/repository";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    const { id } = await params;
    const name = request.nextUrl.searchParams.get("name");
    if (!name) {
      throw new AppError(400, "artifact_name_required", "Artifact name query param is required.");
    }

    const repository = getRepository();
    const record = await repository.getExportById(context.organisationId, id);
    if (!record) {
      throw new AppError(404, "export_not_found", "Export not found.");
    }

    const artifact = record.artifacts.find((item) => item.name === name);
    if (!artifact) {
      throw new AppError(404, "artifact_not_found", "Requested artifact not found in export pack.");
    }

    return new NextResponse(artifact.content, {
      status: 200,
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Disposition": `attachment; filename="${artifact.name}"`,
        "X-Checksum-Sha256": artifact.checksum,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
