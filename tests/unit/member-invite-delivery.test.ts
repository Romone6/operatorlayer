import { afterEach, describe, expect, it } from "vitest";

import {
  sendInviteEmail,
  shouldRequireInviteDelivery,
  type InviteEmailDispatch,
} from "@/lib/services/member-invites";

const envSnapshot = {
  OPERATORLAYER_SEND_INVITE_EMAILS: process.env.OPERATORLAYER_SEND_INVITE_EMAILS,
  OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY: process.env.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY,
  OPERATORLAYER_ENABLE_MAILTO_FALLBACK: process.env.OPERATORLAYER_ENABLE_MAILTO_FALLBACK,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  OPERATORLAYER_INVITE_FROM_EMAIL: process.env.OPERATORLAYER_INVITE_FROM_EMAIL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function restoreEnv() {
  process.env.OPERATORLAYER_SEND_INVITE_EMAILS = envSnapshot.OPERATORLAYER_SEND_INVITE_EMAILS;
  process.env.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY =
    envSnapshot.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY;
  process.env.OPERATORLAYER_ENABLE_MAILTO_FALLBACK = envSnapshot.OPERATORLAYER_ENABLE_MAILTO_FALLBACK;
  process.env.RESEND_API_KEY = envSnapshot.RESEND_API_KEY;
  process.env.OPERATORLAYER_INVITE_FROM_EMAIL = envSnapshot.OPERATORLAYER_INVITE_FROM_EMAIL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = envSnapshot.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = envSnapshot.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = envSnapshot.SUPABASE_SERVICE_ROLE_KEY;
}

async function dispatchForCurrentEnv(): Promise<InviteEmailDispatch> {
  return sendInviteEmail({
    email: "invitee@example.com",
    role: "member",
    organisationId: "org-1",
    inviteToken: "token-1",
    acceptUrl: "http://localhost:3000/invite/token-1",
  });
}

describe("member invite delivery", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("returns disabled when invite email sending is explicitly disabled", async () => {
    process.env.OPERATORLAYER_SEND_INVITE_EMAILS = "0";
    const dispatch = await dispatchForCurrentEnv();
    expect(dispatch.status).toBe("disabled");
  });

  it("returns not_configured when no delivery provider is configured", async () => {
    process.env.OPERATORLAYER_SEND_INVITE_EMAILS = "1";
    process.env.OPERATORLAYER_ENABLE_MAILTO_FALLBACK = "0";
    delete process.env.RESEND_API_KEY;
    delete process.env.OPERATORLAYER_INVITE_FROM_EMAIL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dispatch = await dispatchForCurrentEnv();
    expect(dispatch.status).toBe("not_configured");
  });

  it("returns manual_client when provider missing but mailto fallback enabled", async () => {
    process.env.OPERATORLAYER_SEND_INVITE_EMAILS = "1";
    process.env.OPERATORLAYER_ENABLE_MAILTO_FALLBACK = "1";
    delete process.env.RESEND_API_KEY;
    delete process.env.OPERATORLAYER_INVITE_FROM_EMAIL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dispatch = await dispatchForCurrentEnv();
    expect(dispatch.status).toBe("manual_client");
  });

  it("enables required-delivery mode only when explicitly configured", () => {
    process.env.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY = "0";
    expect(shouldRequireInviteDelivery()).toBe(false);
    process.env.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY = "1";
    expect(shouldRequireInviteDelivery()).toBe(true);
  });
});
