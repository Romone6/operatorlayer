import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { ensureInviteDeliveryJob } from "@/lib/services/invite-delivery";
import {
  getInviteAcceptUrl,
  isInviteEmailDispatchActionable,
  isInviteEmailDispatchSent,
  sendInviteEmail,
  shouldRequireInviteDelivery,
} from "@/lib/services/member-invites";

type Params = { params: Promise<{ id: string }> };

function getAppOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
}

export async function POST(request: NextRequest, { params }: Params) {
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
      throw new AppError(409, "invite_already_accepted", "Accepted invites cannot be resent.");
    }

    const now = Date.now();
    if (new Date(invite.expiresAt).getTime() <= now) {
      await repository.updateMemberInviteStatus(invite.id, "expired");
      throw new AppError(410, "invite_expired", "Invite has expired and cannot be resent.");
    }

    const acceptUrl = getInviteAcceptUrl(getAppOrigin(request), invite.inviteToken);
    const emailDispatch = await sendInviteEmail({
      email: invite.email,
      role: invite.role,
      organisationId: invite.organisationId,
      inviteToken: invite.inviteToken,
      acceptUrl,
    });
    await appendEnterpriseEvent(repository, context, {
      action: "member_invite_resent",
      payload: {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
      },
    });

    if (shouldRequireInviteDelivery() && !isInviteEmailDispatchActionable(emailDispatch)) {
      const queuedJob = await ensureInviteDeliveryJob(
        repository,
        context.organisationId,
        invite.id,
        "resend_invite"
      );
      return jsonOk(
        {
          ...invite,
          acceptUrl,
          emailDispatch,
          deliveryQueued: true,
          deliveryJobId: queuedJob.id,
        },
        202
      );
    }

    return jsonOk({
      ...invite,
      acceptUrl,
      emailDispatch,
    }, isInviteEmailDispatchSent(emailDispatch) ? 200 : 202);
  } catch (error) {
    return jsonError(error);
  }
}
