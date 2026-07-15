import { describe, expect, it } from "vitest";

import { createMemberInviteSchema } from "@/lib/validation";

describe("createMemberInviteSchema", () => {
  it("accepts a valid invite payload", () => {
    const parsed = createMemberInviteSchema.parse({
      email: "reviewer@example.com",
      role: "reviewer",
    });
    expect(parsed.email).toBe("reviewer@example.com");
    expect(parsed.role).toBe("reviewer");
  });

  it("rejects invalid role values", () => {
    const result = createMemberInviteSchema.safeParse({
      email: "reviewer@example.com",
      role: "super_admin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email values", () => {
    const result = createMemberInviteSchema.safeParse({
      email: "not-an-email",
      role: "member",
    });
    expect(result.success).toBe(false);
  });
});

