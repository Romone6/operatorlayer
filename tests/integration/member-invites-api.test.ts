import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getInviteByToken } from "@/app/api/invites/[token]/route";
import { POST as acceptInviteByToken } from "@/app/api/invites/[token]/accept/route";
import { POST as createInvite, GET as listInvites } from "@/app/api/members/invites/route";
import { DELETE as revokeInvite } from "@/app/api/members/invites/[id]/route";
import { POST as resendInvite } from "@/app/api/members/invites/[id]/resend/route";
import { PATCH as patchSsoConfig } from "@/app/api/sso/config/route";
import { PATCH as patchGovernancePolicy } from "@/app/api/data-governance/policies/route";
import { GET as listJobs } from "@/app/api/jobs/route";
import { GET as listMembers } from "@/app/api/members/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function restoreEnvValue(key: string, previousValue: string | undefined) {
  if (previousValue === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = previousValue;
}

function request(
  url: string,
  {
    userId,
    email,
    orgId,
    role,
    method = "GET",
    body,
    headers,
  }: {
    userId: string;
    email: string;
    orgId?: string;
    role?: "owner" | "admin" | "reviewer" | "analyst" | "member";
    method?: string;
    body?: BodyInit | null;
    headers?: HeadersInit;
  }
) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("x-user-id", userId);
  nextHeaders.set("x-user-email", email);
  if (orgId) {
    nextHeaders.set("x-org-id", orgId);
  }
  if (role) {
    nextHeaders.set("x-user-role", role);
  }
  return new NextRequest(url, { method, headers: nextHeaders, body: body ?? null });
}

async function createOrg() {
  const response = await createOrganisation(
    request("http://localhost/api/organisations", {
      userId: "owner-user",
      email: "owner@example.com",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Invite Org" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("member invite APIs", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("creates, lists, and revokes an invite", async () => {
    const orgId = await createOrg();

    const createResponse = await createInvite(
      request("http://localhost/api/members/invites", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "reviewer@example.com",
          role: "reviewer",
        }),
      })
    );
    expect([201, 202]).toContain(createResponse.status);
    const createPayload = (await createResponse.json()) as {
      data: { id: string; status: string; acceptUrl: string };
    };
    expect(createPayload.data.status).toBe("pending");
    expect(createPayload.data.acceptUrl).toContain("/invite/");

    const listResponse = await listInvites(
      request("http://localhost/api/members/invites", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
      })
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      data: Array<{ id: string; email: string; role: string; status: string }>;
    };
    expect(listPayload.data).toHaveLength(1);
    expect(listPayload.data[0].email).toBe("reviewer@example.com");

    const forbiddenList = await listInvites(
      request("http://localhost/api/members/invites", {
        userId: "member-user",
        email: "member@example.com",
        orgId,
        role: "member",
      })
    );
    expect(forbiddenList.status).toBe(403);

    const resendResponse = await resendInvite(
      request(`http://localhost/api/members/invites/${createPayload.data.id}/resend`, {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "POST",
      }),
      { params: Promise.resolve({ id: createPayload.data.id }) }
    );
    expect([200, 202]).toContain(resendResponse.status);
    const resendPayload = (await resendResponse.json()) as {
      data: { emailDispatch: { status: string } };
    };
    expect(["not_configured", "disabled", "sent", "manual_client"]).toContain(
      resendPayload.data.emailDispatch.status
    );

    const revokeResponse = await revokeInvite(
      request(`http://localhost/api/members/invites/${createPayload.data.id}`, {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: createPayload.data.id }) }
    );
    expect(revokeResponse.status).toBe(200);
    const revokePayload = (await revokeResponse.json()) as { data: { status: string } };
    expect(revokePayload.data.status).toBe("revoked");
  });

  it("accepts invite and provisions membership for invitee", async () => {
    const orgId = await createOrg();

    const createResponse = await createInvite(
      request("http://localhost/api/members/invites", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "reviewer",
        }),
      })
    );
    expect([201, 202]).toContain(createResponse.status);
    const invitePayload = (await createResponse.json()) as {
      data: { inviteToken: string };
    };
    const inviteToken = invitePayload.data.inviteToken;
    expect(inviteToken).toBeTruthy();

    const invitePreview = await getInviteByToken(
      request(`http://localhost/api/invites/${inviteToken}`, {
        userId: "invitee-user",
        email: "invitee@example.com",
      }),
      { params: Promise.resolve({ token: inviteToken }) }
    );
    expect(invitePreview.status).toBe(200);

    const mismatchAccept = await acceptInviteByToken(
      request(`http://localhost/api/invites/${inviteToken}/accept`, {
        userId: "invitee-user",
        email: "different@example.com",
        method: "POST",
      }),
      { params: Promise.resolve({ token: inviteToken }) }
    );
    expect(mismatchAccept.status).toBe(403);

    const acceptResponse = await acceptInviteByToken(
      request(`http://localhost/api/invites/${inviteToken}/accept`, {
        userId: "invitee-user",
        email: "invitee@example.com",
        method: "POST",
      }),
      { params: Promise.resolve({ token: inviteToken }) }
    );
    expect(acceptResponse.status).toBe(200);
    const acceptPayload = (await acceptResponse.json()) as { data: { accepted: boolean } };
    expect(acceptPayload.data.accepted).toBe(true);

    const membersResponse = await listMembers(
      request("http://localhost/api/members", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
      })
    );
    expect(membersResponse.status).toBe(200);
    const membersPayload = (await membersResponse.json()) as {
      data: Array<{ email: string; role: string }>;
    };
    expect(membersPayload.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "invitee@example.com", role: "reviewer" }),
      ])
    );
  });

  it("queues invite delivery when delivery is required and no provider is configured", async () => {
    const previousRequire = process.env.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY;
    const previousSend = process.env.OPERATORLAYER_SEND_INVITE_EMAILS;
    const previousResendKey = process.env.RESEND_API_KEY;
    const previousResendFrom = process.env.OPERATORLAYER_INVITE_FROM_EMAIL;
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousSupabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const previousSupabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const previousMailtoFallback = process.env.OPERATORLAYER_ENABLE_MAILTO_FALLBACK;

    process.env.OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY = "1";
    process.env.OPERATORLAYER_SEND_INVITE_EMAILS = "1";
    delete process.env.RESEND_API_KEY;
    delete process.env.OPERATORLAYER_INVITE_FROM_EMAIL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.OPERATORLAYER_ENABLE_MAILTO_FALLBACK = "0";

    try {
      const orgId = await createOrg();
      const response = await createInvite(
        request("http://localhost/api/members/invites", {
          userId: "owner-user",
          email: "owner@example.com",
          orgId,
          role: "owner",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "undeliverable@example.com",
            role: "member",
          }),
        })
      );
      expect(response.status).toBe(202);
      const payload = (await response.json()) as {
        data: { deliveryQueued: boolean; deliveryJobId: string };
      };
      expect(payload.data.deliveryQueued).toBe(true);
      expect(payload.data.deliveryJobId).toBeTruthy();

      const jobsResponse = await listJobs(
        request("http://localhost/api/jobs", {
          userId: "owner-user",
          email: "owner@example.com",
          orgId,
          role: "owner",
        })
      );
      expect(jobsResponse.status).toBe(200);
      const jobsPayload = (await jobsResponse.json()) as {
        data: Array<{ id: string; jobType: string; status: string }>;
      };
      expect(
        jobsPayload.data.some(
          (job) => job.id === payload.data.deliveryJobId && job.jobType === "invite_delivery" && job.status === "queued"
        )
      ).toBe(true);
    } finally {
      restoreEnvValue("OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY", previousRequire);
      restoreEnvValue("OPERATORLAYER_SEND_INVITE_EMAILS", previousSend);
      restoreEnvValue("RESEND_API_KEY", previousResendKey);
      restoreEnvValue("OPERATORLAYER_INVITE_FROM_EMAIL", previousResendFrom);
      restoreEnvValue("NEXT_PUBLIC_SUPABASE_URL", previousSupabaseUrl);
      restoreEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", previousSupabaseAnon);
      restoreEnvValue("SUPABASE_SERVICE_ROLE_KEY", previousSupabaseService);
      restoreEnvValue("OPERATORLAYER_ENABLE_MAILTO_FALLBACK", previousMailtoFallback);
    }
  });

  it("enforces domain allowlist invite policy", async () => {
    const orgId = await createOrg();

    const ssoResponse = await patchSsoConfig(
      request("http://localhost/api/sso/config", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          idpEntityId: "https://idp.example.com",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
          domainAllowlist: ["example.com"],
        }),
      })
    );
    expect(ssoResponse.status).toBe(200);

    const governanceResponse = await patchGovernancePolicy(
      request("http://localhost/api/data-governance/policies", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: 365,
          legalHoldEnabled: false,
          deletionRequiresApproval: true,
          invitePolicy: "domain_allowlist_only",
          sessionDurationMinutes: 480,
          enforcedMfa: true,
          breakGlassAdminEnabled: true,
        }),
      })
    );
    expect(governanceResponse.status).toBe(200);

    const deniedInvite = await createInvite(
      request("http://localhost/api/members/invites", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "reviewer@outside.com",
          role: "reviewer",
        }),
      })
    );
    expect(deniedInvite.status).toBe(403);

    const allowedInvite = await createInvite(
      request("http://localhost/api/members/invites", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "reviewer@example.com",
          role: "reviewer",
        }),
      })
    );
    const allowedPayload = await allowedInvite.json().catch(() => ({}));
    if (![201, 202].includes(allowedInvite.status)) {
      throw new Error(
        `Expected invite success status, received ${allowedInvite.status}: ${JSON.stringify(allowedPayload)}`
      );
    }
  });

  it("blocks invite creation when invite policy is disabled", async () => {
    const orgId = await createOrg();

    const governanceResponse = await patchGovernancePolicy(
      request("http://localhost/api/data-governance/policies", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: 365,
          legalHoldEnabled: false,
          deletionRequiresApproval: true,
          invitePolicy: "disabled",
          sessionDurationMinutes: 480,
          enforcedMfa: true,
          breakGlassAdminEnabled: true,
        }),
      })
    );
    expect(governanceResponse.status).toBe(200);

    const blockedInvite = await createInvite(
      request("http://localhost/api/members/invites", {
        userId: "owner-user",
        email: "owner@example.com",
        orgId,
        role: "owner",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "member@example.com",
          role: "member",
        }),
      })
    );
    expect(blockedInvite.status).toBe(403);
  });
});
