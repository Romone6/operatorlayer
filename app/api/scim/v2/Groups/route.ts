import crypto from "node:crypto";

import { NextRequest } from "next/server";
import { z } from "zod";

import { assertScimWriteAvailable } from "@/lib/enterprise/scim-availability";
import { appendEnterpriseEvent, resolveScimGroups } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { assertScimAuth, scimListResponse } from "@/app/api/scim/v2/_lib";

const groupCreateSchema = z.object({
  displayName: z.string().min(2),
  members: z.array(z.object({ value: z.string().min(3) })).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const organisationId = assertScimAuth(request);
    const repository = getRepository();
    const groups = await resolveScimGroups(repository, organisationId);
    return jsonOk(
      scimListResponse(
        groups.map((group) => ({
          id: group.id,
          displayName: group.displayName,
          members: group.members.map((value) => ({ value })),
          meta: {
            resourceType: "Group",
            created: group.meta.created,
            lastModified: group.meta.lastModified,
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
      surface: "scim_v2_groups_post",
    });
    const payload = groupCreateSchema.parse(await request.json());
    const now = new Date().toISOString();
    const group = {
      id: crypto.randomUUID(),
      displayName: payload.displayName,
      members: payload.members.map((item) => item.value),
      created: now,
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
        payload: group,
      }
    );
    return jsonOk(
      {
        id: group.id,
        displayName: group.displayName,
        members: group.members.map((value) => ({ value })),
        meta: {
          resourceType: "Group",
          created: now,
          lastModified: now,
        },
      },
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}
