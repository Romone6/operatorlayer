import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as submitContact } from "@/app/api/contact/route";
import { resetMemoryRepository } from "@/lib/repository/memory";
import { resetRateLimitState } from "@/lib/security/rate-limit";

function request(payload: Record<string, unknown>, ip = "127.0.0.1") {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(payload),
  });
}

const validPayload = {
  name: "Alex Operator",
  workEmail: "alex@example.com",
  company: "Operator Corp",
  role: "Head of Revenue",
  companySize: "51-250",
  currentAiTools: ["ChatGPT"],
  primaryUseCase: "Sales policy governance",
  message: "Need policy extraction and review queue controls.",
};

describe("contact API", () => {
  beforeEach(() => {
    resetMemoryRepository();
    resetRateLimitState();
  });

  it("persists a valid contact request", async () => {
    const response = await submitContact(request(validPayload));
    expect(response.status).toBe(201);

    const payload = (await response.json()) as { data: { id: string } };
    expect(payload.data.id).toBeTruthy();
  });

  it("returns validation errors for invalid payload", async () => {
    const response = await submitContact(
      request({
        ...validPayload,
        workEmail: "not-an-email",
      })
    );
    expect(response.status).toBe(400);
  });

  it("rate limits excessive submissions", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await submitContact(request(validPayload, "10.0.0.8"));
      expect(response.status).toBe(201);
    }

    const blocked = await submitContact(request(validPayload, "10.0.0.8"));
    expect(blocked.status).toBe(429);
  });
});
