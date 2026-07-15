import { NextRequest } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const repository = getRepository();
    const invite = await repository.getMemberInviteByToken(token);
    if (!invite) {
      throw new AppError(404, "invite_not_found", "Invite was not found.");
    }

    if (invite.status === "revoked") {
      throw new AppError(409, "invite_revoked", "This invite has been revoked.");
    }
    if (invite.status === "expired") {
      throw new AppError(410, "invite_expired", "This invite has expired.");
    }

    const authUser = await getAuthenticatedUser(request);
    const authEmail = authUser.email?.toLowerCase();
    if (!authEmail) {
      throw new AppError(400, "auth_email_missing", "Authenticated user has no email.");
    }
    if (authEmail !== invite.email.toLowerCase()) {
      throw new AppError(
        403,
        "invite_email_mismatch",
        "This invite email does not match the signed-in account."
      );
    }

    if (invite.status === "accepted") {
      if (invite.acceptedBy !== authUser.userId) {
        throw new AppError(409, "invite_already_accepted", "This invite was already accepted.");
      }
      const existingMember = await repository.upsertUserMembership({
        organisationId: invite.organisationId,
        userId: authUser.userId,
        email: authEmail,
        role: invite.role,
      });
      return jsonOk({
        accepted: true,
        organisationId: invite.organisationId,
        role: existingMember.role,
      });
    }

    if (new Date(invite.expiresAt).getTime() <= Date.now()) {
      await repository.updateMemberInviteStatus(invite.id, "expired");
      throw new AppError(410, "invite_expired", "This invite has expired.");
    }

    const member = await repository.upsertUserMembership({
      organisationId: invite.organisationId,
      userId: authUser.userId,
      email: authEmail,
      role: invite.role,
    });
    await repository.updateMemberInviteStatus(invite.id, "accepted", {
      acceptedBy: authUser.userId,
      acceptedAt: new Date().toISOString(),
    });
    await repository.createIngestionLog({
      organisationId: invite.organisationId,
      sourceId: null,
      action: "enterprise:member_invite_accepted",
      details: {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
        actorId: authUser.userId,
      },
    });

    return jsonOk({
      accepted: true,
      organisationId: invite.organisationId,
      role: member.role,
    });
  } catch (error) {
    return jsonError(error);
  }
}
