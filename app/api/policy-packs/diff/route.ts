import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const from = Number(request.nextUrl.searchParams.get("from"));
    const to = Number(request.nextUrl.searchParams.get("to"));
    if (!Number.isInteger(from) || !Number.isInteger(to)) throw new AppError(400, "invalid_version", "from and to must be export version numbers.");
    const exports = await getRepository().listExports(context.organisationId);
    const before = exports.find((record) => record.manifest.version === from);
    const after = exports.find((record) => record.manifest.version === to);
    if (!before || !after) throw new AppError(404, "policy_pack_not_found", "One or both policy pack versions were not found.");
    const beforeChecksums = new Map(before.artifacts.map((artifact) => [artifact.name, artifact.checksum]));
    const afterChecksums = new Map(after.artifacts.map((artifact) => [artifact.name, artifact.checksum]));
    const changed = [...new Set([...beforeChecksums.keys(), ...afterChecksums.keys()])].filter((name) => beforeChecksums.get(name) !== afterChecksums.get(name)).sort();
    return jsonOk({ from, to, changed });
  } catch (error) { return jsonError(error); }
}
