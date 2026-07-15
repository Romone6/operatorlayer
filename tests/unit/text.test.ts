import { describe, expect, it } from "vitest";

import { chunkText, extractFrequentPhrases } from "@/lib/text";

describe("text helpers", () => {
  it("chunks deterministically", () => {
    const input = "Sentence one. Sentence two. Sentence three. Sentence four.";
    const chunks = chunkText(input, 25);

    expect(chunks).toEqual(["Sentence one.", "Sentence two.", "Sentence three.", "Sentence four."]);
  });

  it("extracts frequent trigrams", () => {
    const phrases = extractFrequentPhrases([
      "we should avoid discount without approval",
      "we should avoid discount without approval",
      "the team should avoid discount without approval",
    ]);

    expect(phrases[0]).toEqual({ phrase: "should avoid discount", frequency: 3 });
  });
});
