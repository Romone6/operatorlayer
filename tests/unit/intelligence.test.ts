import { afterEach, describe, expect, it } from "vitest";

import { extractPolicyFromManual } from "@/lib/intelligence";
import { MemoryRepository } from "@/lib/repository/memory";

const originalMode = process.env.OPERATORLAYER_PROCESSING_MODE;
const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  process.env.OPERATORLAYER_PROCESSING_MODE = originalMode;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe("intelligence runtime configuration", () => {
  it("refuses to invent policies when no model credential is configured", async () => {
    process.env.OPERATORLAYER_PROCESSING_MODE = "openai";
    delete process.env.OPENAI_API_KEY;

    await expect(
      extractPolicyFromManual("Never promise discounts.", {
        repository: new MemoryRepository(),
        organisationId: "org-without-provider-key",
      })
    ).rejects.toMatchObject({ code: "openai_key_missing" });
  });
});
