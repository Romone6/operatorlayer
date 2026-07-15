import { beforeEach, describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { requestJson } from "@/lib/llm";
import { getRepository } from "@/lib/repository";
import { resetMemoryRepository } from "@/lib/repository/memory";
import {
  resolveActiveLlmRoute,
  upsertLlmProviderCredential,
} from "@/lib/enterprise/store";
import type { RequestContext } from "@/lib/auth/context";

async function createContext(): Promise<RequestContext> {
  const repository = getRepository();
  const organisation = await repository.createOrganisation({
    name: "Routing Test Org",
    industry: "SaaS",
    userId: "owner-routing-001",
    email: "owner@example.com",
  });
  return {
    userId: "owner-routing-001",
    organisationId: organisation.id,
    role: "owner",
    capabilities: ["api-admin"],
    email: "owner@example.com",
  };
}

describe("LLM routing", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_DATA_BACKEND = "memory";
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY = "test-secret-encryption-key";
    delete process.env.OPENAI_API_KEY;
  });

  it("resolves the active organisation OpenAI key for BYOK routing", async () => {
    const repository = getRepository();
    const context = await createContext();

    await upsertLlmProviderCredential(repository, context, {
      provider: "openai",
      displayName: "Customer OpenAI",
      model: "gpt-4.1-mini",
      apiKey: "sk-customer-openai-key",
      setActive: true,
    });

    const route = await resolveActiveLlmRoute(repository, context.organisationId);
    expect(route?.credential.provider).toBe("openai");
    expect(route?.credential.model).toBe("gpt-4.1-mini");
    expect(route?.apiKey).toBe("sk-customer-openai-key");
  });

  it("fails explicitly when an active provider is configured before live routing exists", async () => {
    const repository = getRepository();
    const context = await createContext();

    await upsertLlmProviderCredential(repository, context, {
      provider: "anthropic",
      displayName: "Customer Anthropic",
      model: "claude-3-5-sonnet-latest",
      apiKey: "sk-ant-customer-key",
      setActive: true,
    });

    await expect(
      requestJson(
        "test_schema",
        "test schema",
        [{ role: "user", content: "Return JSON." }],
        { repository, organisationId: context.organisationId }
      )
    ).rejects.toMatchObject({
      code: "llm_provider_not_implemented",
    } satisfies Partial<AppError>);
  });
});
