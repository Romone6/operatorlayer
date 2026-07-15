import { NextRequest } from "next/server";
import { z } from "zod";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import {
  resolveLlmProviderCredentials,
  upsertLlmProviderCredential,
} from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { llmProviderCredentialCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const providers = await resolveLlmProviderCredentials(repository, context.organisationId);
    return jsonOk({ providers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const payload = llmProviderCredentialCreateSchema.parse(await request.json());
    const credential = await upsertLlmProviderCredential(repository, context, {
      provider: payload.provider,
      displayName: payload.displayName,
      model: payload.model,
      apiKey: payload.apiKey,
      baseUrl: payload.baseUrl,
      setActive: payload.setActive,
    });
    return jsonOk({ credential }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid LLM provider payload.", error.flatten()));
    }
    return jsonError(error);
  }
}
