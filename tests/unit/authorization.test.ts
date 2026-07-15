import { describe, expect, it } from "vitest";

import { assertCapability, assertRole } from "@/lib/auth/authorization";

describe("assertRole", () => {
  it("allows role in allowed set", () => {
    expect(() =>
      assertRole(
        {
          userId: "u1",
          organisationId: "o1",
          role: "reviewer",
          capabilities: [],
          email: "test@example.com",
        },
        ["admin", "reviewer"]
      )
    ).not.toThrow();
  });

  it("throws forbidden for disallowed role", () => {
    expect(() =>
      assertRole(
        {
          userId: "u1",
          organisationId: "o1",
          role: "member",
          capabilities: [],
          email: "test@example.com",
        },
        ["admin"]
      )
    ).toThrow();
  });
});

describe("assertCapability", () => {
  it("allows when required capability is present", () => {
    expect(() =>
      assertCapability(
        {
          userId: "u1",
          organisationId: "o1",
          role: "admin",
          capabilities: ["api-admin"],
          email: "test@example.com",
        },
        "api-admin"
      )
    ).not.toThrow();
  });

  it("throws forbidden when required capability is missing", () => {
    expect(() =>
      assertCapability(
        {
          userId: "u1",
          organisationId: "o1",
          role: "admin",
          capabilities: [],
          email: "test@example.com",
        },
        "api-admin"
      )
    ).toThrow();
  });
});
