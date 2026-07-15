import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";

import { assertScimWriteAvailable } from "@/lib/enterprise/scim-availability";
import { appendEnterpriseEvent, resolveScimUserStatusMap } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { AppRole } from "@/lib/types";
import { assertScimAuth, scimListResponse } from "@/app/api/scim/v2/_lib";

const scimUserCreateSchema = z.object({
  userName: z.string().min(3),
  name: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
  emails: z.array(z.object({ value: z.email() })).min(1),
  active: z.boolean().default(true),
  roles: z.array(z.object({ value: z.string() })).optional(),
});

function mapRole(raw: string | undefined): AppRole {
  const normalized = String(raw ?? "member").toLowerCase();
  if (["owner", "admin", "reviewer", "analyst", "member"].includes(normalized)) {
    return normalized as AppRole;
  }
  return "member";
}

export async function GET(request: NextRequest) {
  try {
    const organisationId = assertScimAuth(request);
    const repository = getRepository();
    const [users, statusMap] = await Promise.all([
      repository.listUsers(organisationId),
      resolveScimUserStatusMap(repository, organisationId),
    ]);
    return jsonOk(
      scimListResponse(
        users.map((user) => ({
          id: user.id,
          userName: user.email,
          active: statusMap.get(user.id)?.active ?? true,
          emails: [{ value: user.email, primary: true }],
          roles: [{ value: user.role }],
          meta: {
            resourceType: "User",
            created: user.createdAt,
            lastModified: statusMap.get(user.id)?.lastModified ?? user.createdAt,
          },
        }))
      )
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const organisationId = assertScimAuth(request);
    const repository = getRepository();
    await assertScimWriteAvailable(repository, organisationId, {
      actorId: "scim",
      surface: "scim_v2_users_post",
    });
    const payload = scimUserCreateSchema.parse(await request.json());
    const email = payload.emails[0]?.value.toLowerCase();
    const role = mapRole(payload.roles?.[0]?.value);
    const userId = crypto.randomUUID();
    const member = await repository.upsertUserMembership({
      organisationId,
      userId,
      email,
      role,
      name: [payload.name?.givenName, payload.name?.familyName].filter(Boolean).join(" ") || null,
    });
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
          userId: member.id,
          active: payload.active,
          reason: payload.active ? "provisioned" : "provisioned_inactive",
        },
      }
    );
    return jsonOk(
      {
        id: member.id,
        userName: member.email,
        active: payload.active,
        emails: [{ value: member.email, primary: true }],
        roles: [{ value: member.role }],
        meta: {
          resourceType: "User",
          created: member.createdAt,
          lastModified: member.createdAt,
        },
      },
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}
