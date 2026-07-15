import OpenAI from "openai";

import { resolveActiveLlmRoute } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";

type LlmMessage = {
  role: "system" | "user";
  content: string;
};

type LlmRequestContext = {
  repository?: OperatorRepository;
  organisationId?: string;
};

async function resolveOpenAiConfig(context?: LlmRequestContext) {
  if (context?.repository && context.organisationId) {
    const activeRoute = await resolveActiveLlmRoute(context.repository, context.organisationId);
    if (activeRoute) {
      if (activeRoute.credential.provider !== "openai") {
        throw new AppError(
          501,
          "llm_provider_not_implemented",
          `${activeRoute.credential.provider} routing is configured but not implemented for live model calls yet.`,
          { provider: activeRoute.credential.provider }
        );
      }
      return {
        apiKey: activeRoute.apiKey,
        model: activeRoute.credential.model,
        baseURL: activeRoute.credential.baseUrl ?? undefined,
        source: "organisation_byok" as const,
      };
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError(500, "openai_key_missing", "OPENAI_API_KEY or an active organisation OpenAI key is required for model-based extraction.");
  }

  return {
    apiKey,
    model: process.env.OPERATORLAYER_MODEL ?? "gpt-4.1-mini",
    baseURL: undefined,
    source: "environment" as const,
  };
}

export async function requestJson<T>(
  schemaName: string,
  schemaDescription: string,
  messages: LlmMessage[],
  context?: LlmRequestContext
): Promise<T> {
  const config = await resolveOpenAiConfig(context);
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  const response = await client.responses.create({
    model: config.model,
    input: messages.map((message) => ({
      role: message.role,
      content: [{ type: "input_text", text: message.content }],
    })),
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        description: schemaDescription,
        strict: true,
        schema: { type: "object", additionalProperties: true },
      },
    },
  });

  const output = response.output_text;
  if (!output) {
    throw new AppError(500, "llm_empty_output", "Model returned empty output");
  }
  return JSON.parse(output) as T;
}
