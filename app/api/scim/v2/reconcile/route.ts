import { NextRequest } from "next/server";

import { assertScimAuth } from "@/app/api/scim/v2/_lib";
import { assertScimWriteAvailable } from "@/lib/enterprise/scim-availability";
import { detectScimDrift } from "@/lib/enterprise/scim-drift";
import { appendEnterpriseEvent, resolveScimGroups, resolveScimUserStatusMap } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

function parseApply(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("apply");
  return raw === "1" || raw === "true";
}

export async function POST(request: NextRequest) {
  try {
    const organisationId = assertScimAuth(request);
    const apply = parseApply(request);
    const repository = getRepository();
    if (apply) {
      await assertScimWriteAvailable(repository, organisationId, {
        actorId: "scim",
        surface: "scim_v2_reconcile_apply",
      });
    }

    const [users, statusMap, groups] = await Promise.all([
      repository.listUsers(organisationId),
      resolveScimUserStatusMap(repository, organisationId),
      resolveScimGroups(repository, organisationId),
    ]);

    const issues = detectScimDrift({ users, statusMap, groups });
    const resolvedIssueKeys = new Set<string>();

    if (apply) {
      for (const issue of issues) {
        if (!issue.remediable || !issue.userId) continue;
        const key = `${issue.code}:${issue.userId}`;

        if (issue.code === "missing_status_event") {
          await appendEnterpriseEvent(
            repository,
            {
              organisationId,
              userId: "scim",
              role: "admin",
              email: "scim@system.local",
            },
            {
              action: "scim_user_status_set",
              payload: {
                userId: issue.userId,
                active: true,
                reason: "drift_reconciled_missing_status",
              },
            }
          );
          resolvedIssueKeys.add(key);
        }

        if (issue.code === "inactive_role_not_member") {
          await repository.updateUserRole(organisationId, issue.userId, "member");
          await appendEnterpriseEvent(
            repository,
            {
              organisationId,
              userId: "scim",
              role: "admin",
              email: "scim@system.local",
            },
            {
              action: "scim_user_status_set",
              payload: {
                userId: issue.userId,
                active: false,
                reason: "drift_reconciled_deprovision_role_downgrade",
              },
            }
          );
          resolvedIssueKeys.add(key);
        }
      }
    }

    const response = {
      generatedAt: new Date().toISOString(),
      apply,
      summary: {
        totalIssues: issues.length,
        remediableIssues: issues.filter((issue) => issue.remediable).length,
        unremediableIssues: issues.filter((issue) => !issue.remediable).length,
        resolvedIssues: resolvedIssueKeys.size,
      },
      issues: issues.map((issue) => ({
        ...issue,
        resolved: resolvedIssueKeys.has(`${issue.code}:${issue.userId ?? "-"}`),
      })),
    };

    await appendEnterpriseEvent(
      repository,
      {
        organisationId,
        userId: "scim",
        role: "admin",
        email: "scim@system.local",
      },
      {
        action: "scim_drift_reconcile_run",
        payload: {
          apply,
          driftSummary: response.summary,
        },
      }
    );

    return jsonOk(response);
  } catch (error) {
    return jsonError(error);
  }
}
