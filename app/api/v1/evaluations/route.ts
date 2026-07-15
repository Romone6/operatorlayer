import { NextRequest } from "next/server";

import { resolveApiCredentialByRawKey } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

function getExternalAuth(request: NextRequest) {
  const apiKey = request.headers.get("x-ol-api-key");
  const organisationId = request.headers.get("x-ol-org-id");
  if (!apiKey || !organisationId) {
    throw new AppError(401, "api_key_missing", "x-ol-api-key and x-ol-org-id headers are required.");
  }
  return { apiKey, organisationId };
}

export async function GET(request: NextRequest) {
  try {
    const repository = getRepository();
    const { apiKey, organisationId } = getExternalAuth(request);
    const credential = await resolveApiCredentialByRawKey(repository, organisationId, apiKey);
    if (!credential || !credential.scopes.includes("evaluation.read")) {
      throw new AppError(403, "api_scope_forbidden", "Credential does not grant evaluation.read scope.");
    }
    const evaluations = await repository.listEvaluations(organisationId);
    return jsonOk({
      items: evaluations,
      credential: {
        id: credential.id,
        name: credential.name,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
