import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const { id } = await params;

    const repository = getRepository();
    const invites = await repository.listMemberInvites(context.organisationId);
    const invite = invites.find((item) => item.id === id);
    if (!invite) {
      throw new AppError(404, "invite_not_found", "Invite was not found.");
    }

    if (invite.status === "accepted") {
      throw new AppError(409, "invite_already_accepted", "Accepted invites cannot be revoked.");
    }

    const updated = await repository.updateMemberInviteStatus(invite.id, "revoked");
    if (!updated) {
      throw new AppError(404, "invite_not_found", "Invite was not found.");
    }
    await appendEnterpriseEvent(repository, context, {
      action: "member_invite_revoked",
      payload: {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
      },
    });

    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
