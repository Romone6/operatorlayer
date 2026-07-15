import { NextRequest } from "next/server";
import { z } from "zod";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { resolveGovernancePolicy, resolveSsoConfig } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { ensureInviteDeliveryJob } from "@/lib/services/invite-delivery";
import {
  buildInviteMailtoUrl,
  getInviteAcceptUrl,
  isInviteEmailDispatchActionable,
  isInviteEmailDispatchSent,
  sendInviteEmail,
  shouldRequireInviteDelivery,
} from "@/lib/services/member-invites";
import { createMemberInviteSchema } from "@/lib/validation";

function getAppOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
}

function createInviteToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

function createExpiryIso(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function resolveEmailDomain(email: string) {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain && domain.length > 0 ? domain : null;
}

async function expireStalePendingInvites(organisationId: string) {
  const repository = getRepository();
  const now = Date.now();
  const invites = await repository.listMemberInvites(organisationId);
  await Promise.all(
    invites
      .filter((invite) => invite.status === "pending" && new Date(invite.expiresAt).getTime() <= now)
      .map((invite) => repository.updateMemberInviteStatus(invite.id, "expired"))
  );
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);

    await expireStalePendingInvites(context.organisationId);
    const repository = getRepository();
    const appOrigin = getAppOrigin(request);
    const jobs = await repository.listJobs(context.organisationId);
    const invites = await repository.listMemberInvites(context.organisationId);
    return jsonOk(
      invites.map((invite) => {
        const acceptUrl = `${appOrigin}/invite/${invite.inviteToken}`;
        return {
          ...invite,
          acceptUrl,
          mailtoUrl: buildInviteMailtoUrl({
            email: invite.email,
            role: invite.role,
            acceptUrl,
          }),
          deliveryState:
            jobs.find(
              (job) =>
                job.jobType === "invite_delivery" && String(job.payload.inviteId ?? "") === invite.id
            )?.status ?? "not_requested",
        };
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);

    const body = createMemberInviteSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const repository = getRepository();
    const governancePolicy = await resolveGovernancePolicy(repository, context.organisationId);

    if (body.role === "owner" && context.role !== "owner") {
      throw new AppError(403, "forbidden", "Only an owner can invite another owner.");
    }
    if (governancePolicy.invitePolicy === "disabled") {
      throw new AppError(
        403,
        "invite_policy_disabled",
        "Workspace invite policy is disabled by organisation governance controls."
      );
    }
    if (governancePolicy.invitePolicy === "domain_allowlist_only") {
      const inviteDomain = resolveEmailDomain(email);
      if (!inviteDomain) {
        throw new AppError(400, "invalid_invite_email", "Invite email domain is invalid.");
      }
      const ssoConfig = await resolveSsoConfig(repository, context.organisationId);
      const normalizedAllowlist = ssoConfig.domainAllowlist.map((domain) => domain.trim().toLowerCase());
      if (!normalizedAllowlist.length) {
        throw new AppError(
          409,
          "invite_domain_allowlist_not_configured",
          "Invite policy requires an organisation domain allowlist."
        );
      }
      if (!normalizedAllowlist.includes(inviteDomain)) {
        throw new AppError(
          403,
          "invite_domain_not_allowed",
          "Invite email domain is not in the organisation allowlist.",
          { inviteDomain }
        );
      }
    }

    const [members, invites] = await Promise.all([
      repository.listUsers(context.organisationId),
      repository.listMemberInvites(context.organisationId),
    ]);

    if (members.some((member) => member.email.toLowerCase() === email)) {
      throw new AppError(409, "member_already_exists", "A member with this email already exists.");
    }

    const now = Date.now();
    const activePendingInvite = invites.find(
      (invite) =>
        invite.email.toLowerCase() === email &&
        invite.status === "pending" &&
        new Date(invite.expiresAt).getTime() > now
    );
    if (activePendingInvite) {
      throw new AppError(409, "invite_already_pending", "A pending invite already exists for this email.");
    }

    const inviteToken = createInviteToken();
    const expiresAt = createExpiryIso(7);
    const invite = await repository.createMemberInvite({
      organisationId: context.organisationId,
      email,
      role: body.role,
      invitedBy: context.userId,
      inviteToken,
      expiresAt,
    });
    await appendEnterpriseEvent(repository, context, {
      action: "member_invite_created",
      payload: {
        inviteId: invite.id,
        email,
        role: body.role,
        expiresAt,
      },
    });

    const acceptUrl = getInviteAcceptUrl(getAppOrigin(request), inviteToken);
    const emailDispatch = await sendInviteEmail({
      email,
      role: body.role,
      organisationId: context.organisationId,
      inviteToken,
      acceptUrl,
    });

    if (shouldRequireInviteDelivery() && !isInviteEmailDispatchActionable(emailDispatch)) {
      const queuedJob = await ensureInviteDeliveryJob(
        repository,
        context.organisationId,
        invite.id,
        "create_invite"
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

    return jsonOk(
      {
        ...invite,
        acceptUrl,
        emailDispatch,
      },
      isInviteEmailDispatchSent(emailDispatch) ? 201 : 202
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid invite payload", error.flatten()));
    }
    return jsonError(error);
  }
}
