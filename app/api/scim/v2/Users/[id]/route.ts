import { NextRequest } from "next/server";
import { z } from "zod";

import { assertScimWriteAvailable } from "@/lib/enterprise/scim-availability";
import { appendEnterpriseEvent, resolveScimUserStatusMap } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { AppRole } from "@/lib/types";
import { assertScimAuth } from "@/app/api/scim/v2/_lib";

const scimUserPatchSchema = z.object({
  active: z.boolean().optional(),
  roles: z.array(z.object({ value: z.string() })).optional(),
});

function mapRole(raw: string | undefined): AppRole {
  const normalized = String(raw ?? "member").toLowerCase();
  if (["owner", "admin", "reviewer", "analyst", "member"].includes(normalized)) {
    return normalized as AppRole;
  }
  return "member";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organisationId = assertScimAuth(request);
    const { id } = await params;
    const repository = getRepository();
    const [users, statusMap] = await Promise.all([
      repository.listUsers(organisationId),
      resolveScimUserStatusMap(repository, organisationId),
    ]);
    const user = users.find((item) => item.id === id);
    if (!user) {
      throw new AppError(404, "scim_user_not_found", "SCIM user not found.");
    }
    const status = statusMap.get(user.id);
    return jsonOk({
      id: user.id,
      userName: user.email,
      active: status?.active ?? true,
      emails: [{ value: user.email, primary: true }],
      roles: [{ value: user.role }],
      meta: {
        resourceType: "User",
        created: user.createdAt,
        lastModified: status?.lastModified ?? user.createdAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organisationId = assertScimAuth(request);
    const { id } = await params;
    const repository = getRepository();
    await assertScimWriteAvailable(repository, organisationId, {
      actorId: "scim",
      surface: "scim_v2_users_patch",
    });
    const payload = scimUserPatchSchema.parse(await request.json());
    if (payload.roles?.[0]?.value) {
      await repository.updateUserRole(organisationId, id, mapRole(payload.roles[0].value));
    }
    if (typeof payload.active === "boolean") {
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
            userId: id,
            active: payload.active,
            reason: payload.active ? "reactivated" : "deprovisioned",
          },
        }
      );
    }
    const [users, statusMap] = await Promise.all([
      repository.listUsers(organisationId),
      resolveScimUserStatusMap(repository, organisationId),
    ]);
    const user = users.find((item) => item.id === id);
    if (!user) throw new AppError(404, "scim_user_not_found", "SCIM user not found.");
    const status = statusMap.get(user.id);
    return jsonOk({
      id: user.id,
      userName: user.email,
      active: status?.active ?? true,
      emails: [{ value: user.email, primary: true }],
      roles: [{ value: user.role }],
      meta: {
        resourceType: "User",
        created: user.createdAt,
        lastModified: status?.lastModified ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organisationId = assertScimAuth(request);
    const { id } = await params;
    const repository = getRepository();
    await assertScimWriteAvailable(repository, organisationId, {
      actorId: "scim",
      surface: "scim_v2_users_delete",
    });
    const user = await repository.updateUserRole(organisationId, id, "member");
    if (!user) throw new AppError(404, "scim_user_not_found", "SCIM user not found.");
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
          userId: id,
          active: false,
          reason: "deleted",
        },
      }
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
