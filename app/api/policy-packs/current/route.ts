import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const records = await getRepository().listExports(context.organisationId);
    const current = records
      .filter((record) => record.manifest.version !== undefined)
      .sort((a, b) => (b.manifest.version ?? 0) - (a.manifest.version ?? 0))[0] ?? null;
    if (!current) throw new AppError(404, "policy_pack_not_found", "No approved policy pack has been exported.");
    return jsonOk(current);
  } catch (error) { return jsonError(error); }
}
