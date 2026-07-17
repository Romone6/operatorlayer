import OpenAI from "openai";

import { AppError } from "@/lib/errors";

type LlmMessage = {
  role: "system" | "user";
  content: string;
};

async function resolveOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError(500, "openai_key_missing", "OPENAI_API_KEY is required for model-based processing.");
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
  _context?: unknown
): Promise<T> {
  void _context;
  const config = await resolveOpenAiConfig();
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
