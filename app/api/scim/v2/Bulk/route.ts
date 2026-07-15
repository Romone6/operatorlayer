import crypto from "node:crypto";

import { NextRequest } from "next/server";
import { z } from "zod";

import { assertScimWriteAvailable } from "@/lib/enterprise/scim-availability";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { AppRole } from "@/lib/types";
import { assertScimAuth } from "@/app/api/scim/v2/_lib";

const operationSchema = z.object({
  method: z.enum(["POST", "PATCH", "PUT", "DELETE"]),
  path: z.string().min(2),
  bulkId: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const bulkSchema = z.object({
  schemas: z.array(z.string()).min(1),
  Operations: z.array(operationSchema).min(1).max(100),
});

function mapRole(raw: unknown): AppRole {
  const normalized = String(raw ?? "member").toLowerCase();
  if (["owner", "admin", "reviewer", "analyst", "member"].includes(normalized)) {
    return normalized as AppRole;
  }
  return "member";
}

export async function POST(request: NextRequest) {
  try {
    const organisationId = assertScimAuth(request);
    const payload = bulkSchema.parse(await request.json());
    const repository = getRepository();
    await assertScimWriteAvailable(repository, organisationId, {
      actorId: "scim",
      surface: "scim_v2_bulk",
    });
    const scimContext = {
      organisationId,
      userId: "scim",
      role: "admin" as const,
      email: "scim@system.local",
    };
    const results: Array<Record<string, unknown>> = [];

    for (let index = 0; index < payload.Operations.length; index += 1) {
      const operation = payload.Operations[index]!;
      try {
        const path = operation.path.toLowerCase();
        if (operation.method === "POST" && path === "/users") {
          const data = operation.data ?? {};
          const email = String((data.emails as Array<{ value?: string }> | undefined)?.[0]?.value ?? "")
            .toLowerCase()
            .trim();
          if (!email) throw new AppError(400, "scim_bulk_invalid_user", "User operation missing email.");
          const active = typeof data.active === "boolean" ? data.active : true;
          const name = [data.givenName, data.familyName].filter(Boolean).map(String).join(" ") || null;
          const member = await repository.upsertUserMembership({
            organisationId,
            userId: crypto.randomUUID(),
            email,
            role: mapRole((data.roles as Array<{ value?: string }> | undefined)?.[0]?.value),
            name,
          });
          await appendEnterpriseEvent(repository, scimContext, {
            action: "scim_user_status_set",
            payload: {
              userId: member.id,
              active,
              reason: active ? "bulk_provisioned" : "bulk_provisioned_inactive",
            },
          });
          results.push({
            bulkId: operation.bulkId ?? null,
            method: operation.method,
            location: `/Users/${member.id}`,
            status: { code: 201 },
            response: { id: member.id, userName: member.email },
          });
          await appendEnterpriseEvent(repository, scimContext, {
            action: "scim_bulk_operation",
            payload: {
              operationIndex: index,
              bulkId: operation.bulkId ?? null,
              method: operation.method,
              path: operation.path,
              statusCode: 201,
              outcome: "succeeded",
              resourceType: "User",
              resourceId: member.id,
            },
          });
          continue;
        }

        if (operation.method === "POST" && path === "/groups") {
          const data = operation.data ?? {};
          const displayName = String(data.displayName ?? "").trim();
          if (!displayName) throw new AppError(400, "scim_bulk_invalid_group", "Group operation missing displayName.");
          const members = Array.isArray(data.members)
            ? (data.members as Array<{ value?: string }>).map((item) => String(item.value ?? "")).filter(Boolean)
            : [];
          const groupId = crypto.randomUUID();
          await appendEnterpriseEvent(
            repository,
            {
              organisationId,
              userId: "scim",
              role: "admin",
              email: "scim@system.local",
            },
            {
              action: "scim_group_upsert",
              payload: {
                id: groupId,
                displayName,
                members,
                created: new Date().toISOString(),
              },
            }
          );
          results.push({
            bulkId: operation.bulkId ?? null,
            method: operation.method,
            location: `/Groups/${groupId}`,
            status: { code: 201 },
            response: { id: groupId, displayName },
          });
          await appendEnterpriseEvent(repository, scimContext, {
            action: "scim_bulk_operation",
            payload: {
              operationIndex: index,
              bulkId: operation.bulkId ?? null,
              method: operation.method,
              path: operation.path,
              statusCode: 201,
              outcome: "succeeded",
              resourceType: "Group",
              resourceId: groupId,
            },
          });
          continue;
        }

        results.push({
          bulkId: operation.bulkId ?? null,
          method: operation.method,
          status: { code: 400 },
          response: { detail: `Unsupported bulk operation: ${operation.method} ${operation.path}` },
        });
        await appendEnterpriseEvent(repository, scimContext, {
          action: "scim_bulk_operation",
          payload: {
            operationIndex: index,
            bulkId: operation.bulkId ?? null,
            method: operation.method,
            path: operation.path,
            statusCode: 400,
            outcome: "failed",
            error: `Unsupported bulk operation: ${operation.method} ${operation.path}`,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bulk operation failed";
        results.push({
          bulkId: operation.bulkId ?? null,
          method: operation.method,
          status: { code: 400 },
          response: { detail: message },
        });
        await appendEnterpriseEvent(repository, scimContext, {
          action: "scim_bulk_operation",
          payload: {
            operationIndex: index,
            bulkId: operation.bulkId ?? null,
            method: operation.method,
            path: operation.path,
            statusCode: 400,
            outcome: "failed",
            error: message,
          },
        });
      }
    }

    return jsonOk({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkResponse"],
      Operations: results,
    });
  } catch (error) {
    return jsonError(error);
  }
}
