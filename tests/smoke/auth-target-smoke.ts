import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";

process.env.OPERATORLAYER_DATA_BACKEND = "memory";
process.env.OPERATORLAYER_TEST_AUTH_BYPASS = "1";
process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = "1";
process.env.OPERATORLAYER_TEST_USER_ID = "auth-smoke-owner";
process.env.OPERATORLAYER_TEST_ORG_ID = "auth-smoke-bootstrap";
process.env.OPERATORLAYER_PROCESSING_MODE = "deterministic";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function request(
  url: string,
  {
    userId,
    email,
    orgId,
    role = "owner",
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
  nextHeaders.set("x-user-role", role);
  if (orgId) {
    nextHeaders.set("x-org-id", orgId);
  }
  return new NextRequest(url, { method, headers: nextHeaders, body: body ?? null });
}

async function main() {
  const packageJson = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  assert.ok(dependencies["@supabase/ssr"], "Supabase SSR dependency must remain installed");
  assert.ok(dependencies["@supabase/supabase-js"], "Supabase JS dependency must remain installed");
  assert.equal(dependencies["better-auth"], undefined, "Better Auth must remain future scope until explicitly approved");

  const completionPlan = read("docs/product-side-completion-plan.md");
  assert.match(completionPlan, /Pass 2 - Auth Target Decision And Future Better Auth Path/);
  assert.match(completionPlan, /Supabase Auth remains the current implemented auth provider/);

  const { resetMemoryRepository } = await import("@/lib/repository/memory");
  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { GET: listMembers } = await import("@/app/api/members/route");
  const { POST: createInvite } = await import("@/app/api/members/invites/route");
  const { POST: acceptInvite } = await import("@/app/api/invites/[token]/accept/route");
  const { GET: listSources } = await import("@/app/api/sources/route");

  resetMemoryRepository();

  const createOrgResponse = await createOrganisation(
    request("http://localhost/api/organisations", {
      userId: "auth-smoke-owner",
      email: "owner@example.com",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Auth Target Smoke Org", industry: "Technology" }),
    })
  );
  assert.equal(createOrgResponse.status, 201, "authenticated organisation creation should return 201");
  const orgPayload = (await createOrgResponse.json()) as { data: { id: string } };
  assert.ok(orgPayload.data.id, "organisation creation must return an id");

  const membersResponse = await listMembers(
    request("http://localhost/api/members", {
      userId: "auth-smoke-owner",
      email: "owner@example.com",
      orgId: orgPayload.data.id,
      role: "owner",
    })
  );
  assert.equal(membersResponse.status, 200, "owner should be able to list members");
  const membersPayload = (await membersResponse.json()) as { data: Array<{ email: string; role: string }> };
  assert.ok(
    membersPayload.data.some((member) => member.email === "owner@example.com" && member.role === "owner"),
    "organisation creator should be recorded as owner"
  );

  const inviteResponse = await createInvite(
    request("http://localhost/api/members/invites", {
      userId: "auth-smoke-owner",
      email: "owner@example.com",
      orgId: orgPayload.data.id,
      role: "owner",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invitee@example.com", role: "reviewer" }),
    })
  );
  assert.ok([201, 202].includes(inviteResponse.status), "owner should be able to create member invite");
  const invitePayload = (await inviteResponse.json()) as { data: { inviteToken: string } };
  assert.ok(invitePayload.data.inviteToken, "invite creation must return a token");

  const acceptedResponse = await acceptInvite(
    request(`http://localhost/api/invites/${invitePayload.data.inviteToken}/accept`, {
      userId: "auth-smoke-invitee",
      email: "invitee@example.com",
      method: "POST",
    }),
    { params: Promise.resolve({ token: invitePayload.data.inviteToken }) }
  );
  assert.equal(acceptedResponse.status, 200, "authenticated invitee should be able to accept matching invite");

  const previousBypass = process.env.OPERATORLAYER_TEST_AUTH_BYPASS;
  const previousAllowBypass = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS;
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousSupabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousSupabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    process.env.OPERATORLAYER_TEST_AUTH_BYPASS = "0";
    process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = "0";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const failClosedResponse = await listSources(new NextRequest("http://localhost/api/sources"));
    assert.equal(failClosedResponse.status, 503, "missing Supabase configuration must fail closed");
    const failClosedPayload = (await failClosedResponse.json()) as { error: { code: string } };
    assert.equal(failClosedPayload.error.code, "supabase_config_missing");
  } finally {
    process.env.OPERATORLAYER_TEST_AUTH_BYPASS = previousBypass;
    process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = previousAllowBypass;
    if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    if (previousSupabaseAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousSupabaseAnon;
    if (previousSupabaseService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseService;
  }

  console.log("auth-target-smoke:ok");
}

main().catch((error) => {
  console.error("auth-target-smoke:failed", error);
  process.exitCode = 1;
});
