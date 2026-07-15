import { describe, expect, it } from "vitest";

import { structuredPolicySchema } from "@/lib/validation";

describe("rule schema validation", () => {
  it("rejects vague rule", () => {
    expect(() =>
      structuredPolicySchema.parse({
        rule_id: "1",
        rule_type: "tone",
        scenario: "general",
        severity: "medium",
        status: "suggested",
        rule: "Use a professional tone.",
        required_sequence: ["be professional", "end"],
        approved_phrases: ["thank you"],
        forbidden_phrases: ["whatever"],
        human_review_conditions: ["refund request"],
        confidence: 0.8,
      })
    ).toThrow();
  });
});