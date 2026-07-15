import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("retained Supabase auth target contract", () => {
  it("keeps Supabase Auth as the installed auth target and Better Auth as future scope", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    expect(dependencies["@supabase/ssr"]).toBeTruthy();
    expect(dependencies["@supabase/supabase-js"]).toBeTruthy();
    expect(dependencies["better-auth"]).toBeUndefined();
  });

  it("wires sign-in and sign-up pages through the Supabase email auth form", () => {
    const signInPage = read("app/sign-in/page.tsx");
    const signUpPage = read("app/sign-up/page.tsx");
    const emailAuthForm = read("components/auth/email-auth-form.tsx");

    expect(signInPage).toContain('<EmailAuthForm mode="sign-in"');
    expect(signInPage).toContain("nextPath={next ?? null}");
    expect(signInPage).toContain("initialEmail={email ?? null}");

    expect(signUpPage).toContain('<EmailAuthForm mode="sign-up"');
    expect(signUpPage).toContain("nextPath={next ?? null}");
    expect(signUpPage).toContain("initialEmail={email ?? null}");

    expect(emailAuthForm).toContain('props.mode === "sign-up"');
    expect(emailAuthForm).toContain("supabase.auth.signUp");
    expect(emailAuthForm).toContain("supabase.auth.signInWithPassword");
    expect(emailAuthForm).toContain("Supabase browser auth is not configured.");
  });

  it("keeps protected app access fail-closed through Supabase session and membership checks", () => {
    const layout = read("app/app/layout.tsx");
    const authContext = read("lib/auth/context.ts");

    expect(layout).toContain("isSupabaseConfigured()");
    expect(layout).toContain('redirect("/setup-required")');
    expect(layout).toContain("supabase.auth.getUser()");
    expect(layout).toContain('redirect("/sign-in")');
    expect(layout).toContain('supabase.from("users").select("id").eq("id", user.id).maybeSingle()');
    expect(layout).toContain('redirect("/onboarding")');

    expect(authContext).toContain("assertSupabaseConfigured()");
    expect(authContext).toContain("Missing authenticated session.");
    expect(authContext).toContain("Invalid Supabase session token.");
    expect(authContext).toContain('.from("users")');
    expect(authContext).toContain("org_membership_missing");
  });

  it("keeps invite acceptance and organisation creation tied to authenticated users", () => {
    const organisationsRoute = read("app/api/organisations/route.ts");
    const inviteAcceptRoute = read("app/api/invites/[token]/accept/route.ts");
    const invitePage = read("app/invite/[token]/page.tsx");

    expect(organisationsRoute).toContain("getAuthenticatedUser(request)");
    expect(organisationsRoute).toContain("userId: authUser.userId");
    expect(organisationsRoute).toContain('email: authUser.email ?? "unknown@example.com"');

    expect(inviteAcceptRoute).toContain("getAuthenticatedUser(request)");
    expect(inviteAcceptRoute).toContain("invite_email_mismatch");
    expect(inviteAcceptRoute).toContain("repository.upsertUserMembership");
    expect(inviteAcceptRoute).toContain("enterprise:member_invite_accepted");

    expect(invitePage).toContain("/sign-in?next=");
    expect(invitePage).toContain("/sign-up?next=");
    expect(invitePage).toContain("Accept invite");
  });
});
