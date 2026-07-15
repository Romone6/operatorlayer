import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

export type InviteEmailDispatch =
  | { status: "sent" }
  | { status: "disabled" }
  | { status: "not_configured" }
  | { status: "manual_client"; mailtoUrl: string }
  | { status: "failed"; message: string };

type SendInviteEmailInput = {
  email: string;
  role: AppRole;
  organisationId: string;
  inviteToken: string;
  acceptUrl: string;
};

async function sendViaResend(input: SendInviteEmailInput): Promise<InviteEmailDispatch | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OPERATORLAYER_INVITE_FROM_EMAIL;
  if (!apiKey || !from) {
    return null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "You were invited to OperatorLayer",
      html: `<p>You were invited to OperatorLayer.</p><p><a href="${input.acceptUrl}">Accept invite</a></p>`,
      text: `You were invited to OperatorLayer. Accept invite: ${input.acceptUrl}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      status: "failed",
      message: `Resend delivery failed (${response.status}): ${body || "unknown error"}`,
    };
  }

  return { status: "sent" };
}

export function getInviteAcceptUrl(origin: string, inviteToken: string) {
  return `${origin.replace(/\/$/, "")}/invite/${inviteToken}`;
}

export function isInviteEmailDispatchSent(dispatch: InviteEmailDispatch) {
  return dispatch.status === "sent";
}

export function isInviteEmailDispatchActionable(dispatch: InviteEmailDispatch) {
  return dispatch.status === "sent" || dispatch.status === "manual_client";
}

export function buildInviteMailtoUrl(input: Pick<SendInviteEmailInput, "email" | "role" | "acceptUrl">) {
  const subject = encodeURIComponent("You were invited to OperatorLayer");
  const body = encodeURIComponent(
    `You were invited to OperatorLayer as ${input.role}.\n\nAccept invite: ${input.acceptUrl}`
  );
  return `mailto:${encodeURIComponent(input.email)}?subject=${subject}&body=${body}`;
}

export async function sendInviteEmail(input: SendInviteEmailInput): Promise<InviteEmailDispatch> {
  if (process.env.OPERATORLAYER_SEND_INVITE_EMAILS === "0") {
    return { status: "disabled" };
  }

  const resendDispatch = await sendViaResend(input);
  if (resendDispatch) {
    return resendDispatch;
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdminClient();
    const inviteResult = await supabase.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: input.acceptUrl,
      data: {
        operatorlayer_invite_token: input.inviteToken,
        operatorlayer_org_id: input.organisationId,
        operatorlayer_role: input.role,
      },
    });

    if (inviteResult.error) {
      return { status: "failed", message: inviteResult.error.message };
    }

    return { status: "sent" };
  }

  if (process.env.OPERATORLAYER_ENABLE_MAILTO_FALLBACK !== "0") {
    return { status: "manual_client", mailtoUrl: buildInviteMailtoUrl(input) };
  }

  return { status: "not_configured" };
}

export function shouldRequireInviteDelivery() {
  return process.env.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY === "1";
}
