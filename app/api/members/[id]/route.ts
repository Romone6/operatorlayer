import { NextRequest } from "next/server";
import { z } from "zod";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const patchMemberSchema = z.object({
  role: z.enum(["owner", "admin", "reviewer", "analyst", "member"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);

    const { id } = await params;
    const body = patchMemberSchema.parse(await request.json());
    const repository = getRepository();

    const members = await repository.listUsers(context.organisationId);
    const target = members.find((member) => member.id === id);
    if (!target) {
      throw new AppError(404, "member_not_found", "Member was not found.");
    }

    if (target.role === "owner" && body.role !== "owner") {
      const ownerCount = members.filter((member) => member.role === "owner").length;
      if (ownerCount <= 1) {
        throw new AppError(400, "last_owner_blocked", "At least one owner must remain in the organisation.");
      }
    }

    if (body.role === "owner" && context.role !== "owner") {
      throw new AppError(403, "forbidden", "Only an owner can assign owner role.");
    }

    const updated = await repository.updateUserRole(context.organisationId, id, body.role);
    if (!updated) {
      throw new AppError(404, "member_not_found", "Member was not found.");
    }
    await appendEnterpriseEvent(repository, context, {
      action: "member_role_updated",
      payload: {
        memberId: id,
        previousRole: target.role,
        newRole: body.role,
      },
    });

    return jsonOk(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid member payload", error.flatten()));
    }
    return jsonError(error);
  }
}
