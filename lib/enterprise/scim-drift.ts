import type { AppUser } from "@/lib/types";

export type ScimDriftIssueCode =
  | "missing_status_event"
  | "orphaned_status_event"
  | "inactive_role_not_member"
  | "group_member_missing_user";

export type ScimDriftIssue = {
  code: ScimDriftIssueCode;
  severity: "medium" | "high";
  remediable: boolean;
  userId?: string;
  groupId?: string;
  message: string;
};

type ScimStatusMap = Map<string, { active: boolean; lastModified: string; reason: string | null }>;
type ScimGroup = { id: string; displayName: string; members: string[] };

export function detectScimDrift(input: {
  users: AppUser[];
  statusMap: ScimStatusMap;
  groups: ScimGroup[];
}): ScimDriftIssue[] {
  const issues: ScimDriftIssue[] = [];
  const userIds = new Set(input.users.map((user) => user.id));

  for (const user of input.users) {
    const status = input.statusMap.get(user.id);
    if (!status) {
      issues.push({
        code: "missing_status_event",
        severity: "medium",
        remediable: true,
        userId: user.id,
        message: `User ${user.id} is missing SCIM status lifecycle evidence.`,
      });
      continue;
    }

    if (!status.active && user.role !== "member") {
      issues.push({
        code: "inactive_role_not_member",
        severity: "high",
        remediable: true,
        userId: user.id,
        message: `Inactive SCIM user ${user.id} must be downgraded to member role.`,
      });
    }
  }

  for (const [userId, status] of input.statusMap.entries()) {
    if (!userIds.has(userId)) {
      issues.push({
        code: "orphaned_status_event",
        severity: status.active ? "high" : "medium",
        remediable: false,
        userId,
        message: `SCIM status evidence exists for unknown user ${userId}.`,
      });
    }
  }

  for (const group of input.groups) {
    for (const memberId of group.members) {
      if (!userIds.has(memberId)) {
        issues.push({
          code: "group_member_missing_user",
          severity: "high",
          remediable: false,
          userId: memberId,
          groupId: group.id,
          message: `SCIM group ${group.id} references missing user ${memberId}.`,
        });
      }
    }
  }

  return issues;
}
