import { NextRequest } from "next/server";

import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const repository = getRepository();
    const invite = await repository.getMemberInviteByToken(token);
    if (!invite) {
      throw new AppError(404, "invite_not_found", "Invite was not found.");
    }

    if (invite.status === "pending" && new Date(invite.expiresAt).getTime() <= Date.now()) {
      const expired = await repository.updateMemberInviteStatus(invite.id, "expired");
      if (expired) {
        return jsonOk({
          id: expired.id,
          organisationId: expired.organisationId,
          email: expired.email,
          role: expired.role,
          status: expired.status,
          expiresAt: expired.expiresAt,
        });
      }
    }

    return jsonOk({
      id: invite.id,
      organisationId: invite.organisationId,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    return jsonError(error);
  }
}

