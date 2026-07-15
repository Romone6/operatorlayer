import { NextRequest } from "next/server";
import { z } from "zod";

import { assertScimWriteAvailable } from "@/lib/enterprise/scim-availability";
import { appendEnterpriseEvent, resolveScimGroups } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { assertScimAuth } from "@/app/api/scim/v2/_lib";

const patchSchema = z.object({
  displayName: z.string().min(2).optional(),
  members: z.array(z.object({ value: z.string().min(3) })).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organisationId = assertScimAuth(request);
    const { id } = await params;
    const repository = getRepository();
    await assertScimWriteAvailable(repository, organisationId, {
      actorId: "scim",
      surface: "scim_v2_groups_patch",
    });
    const groups = await resolveScimGroups(repository, organisationId);
    const group = groups.find((item) => item.id === id);
    if (!group) throw new AppError(404, "scim_group_not_found", "SCIM group not found.");
    return jsonOk({
      id: group.id,
      displayName: group.displayName,
      members: group.members.map((value) => ({ value })),
      meta: {
        resourceType: "Group",
        created: group.meta.created,
        lastModified: group.meta.lastModified,
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
    const groups = await resolveScimGroups(repository, organisationId);
    const group = groups.find((item) => item.id === id);
    if (!group) throw new AppError(404, "scim_group_not_found", "SCIM group not found.");
    const payload = patchSchema.parse(await request.json());
    const next = {
      id,
      displayName: payload.displayName ?? group.displayName,
      members: payload.members ? payload.members.map((item) => item.value) : group.members,
      created: group.meta.created,
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
        action: "scim_group_upsert",
        payload: next,
      }
    );
    return jsonOk({
      id: next.id,
      displayName: next.displayName,
      members: next.members.map((value) => ({ value })),
      meta: {
        resourceType: "Group",
        created: next.created,
        lastModified: new Date().toISOString(),
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
      surface: "scim_v2_groups_delete",
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
        action: "scim_group_deleted",
        payload: { id },
      }
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
