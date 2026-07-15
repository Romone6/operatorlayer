import { describe, expect, it } from "vitest";

import { detectScimDrift } from "@/lib/enterprise/scim-drift";
import type { AppUser } from "@/lib/types";

function user(input: Partial<AppUser> & Pick<AppUser, "id" | "organisationId" | "email">): AppUser {
  return {
    id: input.id,
    organisationId: input.organisationId,
    email: input.email,
    role: input.role ?? "member",
    name: input.name ?? null,
    createdAt: input.createdAt ?? "2026-05-18T00:00:00.000Z",
  };
}

describe("detectScimDrift", () => {
  it("detects all configured drift classes", () => {
    const users: AppUser[] = [
      user({ id: "user-a", organisationId: "org-1", email: "a@example.com", role: "admin" }),
      user({ id: "user-b", organisationId: "org-1", email: "b@example.com", role: "member" }),
    ];
    const statusMap = new Map<string, { active: boolean; lastModified: string; reason: string | null }>([
      ["user-a", { active: false, lastModified: "2026-05-18T01:00:00.000Z", reason: "deprovisioned" }],
      ["ghost-user", { active: true, lastModified: "2026-05-18T01:00:00.000Z", reason: null }],
    ]);
    const groups = [{ id: "group-1", displayName: "Group 1", members: ["ghost-user"] }];

    const issues = detectScimDrift({ users, statusMap, groups });
    const codes = issues.map((issue) => issue.code);

    expect(codes).toContain("inactive_role_not_member");
    expect(codes).toContain("missing_status_event");
    expect(codes).toContain("orphaned_status_event");
    expect(codes).toContain("group_member_missing_user");
  });
});
