import { describe, expect, it } from "vitest";

import { contactFormSchema } from "@/lib/validators/forms";

describe("contact form schema", () => {
  it("accepts a valid payload", () => {
    const parsed = contactFormSchema.parse({
      name: "Alex",
      workEmail: "alex@example.com",
      company: "Operator Corp",
      role: "Director",
      companySize: "11-50",
      currentAiTools: ["ChatGPT"],
      primaryUseCase: "Policy extraction",
      message: "Need help deploying OperatorLayer.",
    });
    expect(parsed.workEmail).toBe("alex@example.com");
  });

  it("rejects invalid payloads", () => {
    expect(() =>
      contactFormSchema.parse({
        name: "A",
        workEmail: "invalid",
        company: "",
        role: "",
        companySize: "",
        currentAiTools: [],
        primaryUseCase: "",
        message: "bad",
      })
    ).toThrow();
  });
});
