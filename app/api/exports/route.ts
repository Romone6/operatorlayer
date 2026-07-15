import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { generateExportPack } from "@/lib/services/playground";
import { exportRequestSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const records = await repository.listExports(context.organisationId);
    return jsonOk(records);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    exportRequestSchema.parse(await request.json().catch(() => ({ exportType: "full_pack" })));
    const repository = getRepository();
    const record = await generateExportPack(repository, context.organisationId);
    return jsonOk(record, 201);
  } catch (error) {
    return jsonError(error);
  }
}
