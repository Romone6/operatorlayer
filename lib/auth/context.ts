import { type NextRequest } from "next/server";

import { AppError } from "@/lib/errors";
import { assertSupabaseConfigured, isTestAuthBypassEnabled } from "@/lib/supabase/config";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { AdminCapability, AppRole } from "@/lib/types";

const adminCapabilities: AdminCapability[] = [
  "connector-admin",
  "billing-admin",
  "compliance-admin",
  "api-admin",
];

const adminCapabilitySet = new Set<AdminCapability>(adminCapabilities);

export type RequestContext = {
  userId: string;
  organisationId: string;
  role: AppRole;
  capabilities?: AdminCapability[];
  email: string | null;
};

export type AuthenticatedUser = {
  userId: string;
  email: string | null;
};

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7);
  }

  const cookieToken = request.cookies.get("sb-access-token")?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

function normalizeRole(value: string | null | undefined): AppRole {
  const role = String(value ?? "member").toLowerCase();
  if (role === "owner" || role === "admin" || role === "reviewer" || role === "analyst") {
    return role;
  }
  return "member";
}

function parseCapabilitiesHeader(raw: string | null): AdminCapability[] | null {
  if (raw === null) return null;
  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase())
    .filter((item): item is AdminCapability => adminCapabilitySet.has(item as AdminCapability));
  return Array.from(new Set(values));
}

function resolveCapabilities(role: AppRole, header: string | null): AdminCapability[] {
  if (role === "owner") return adminCapabilities;
  if (role !== "admin") return [];
  const parsed = parseCapabilitiesHeader(header);
  if (parsed !== null) return parsed;
  return adminCapabilities;
}

export async function getRequestContext(request: NextRequest): Promise<RequestContext> {
  const allowTestBypass = isTestAuthBypassEnabled();

  if (allowTestBypass) {
    const userId =
      request.headers.get("x-user-id") ??
      process.env.OPERATORLAYER_TEST_USER_ID ??
      "test-user-001";
    const organisationId =
      request.headers.get("x-org-id") ??
      process.env.OPERATORLAYER_TEST_ORG_ID ??
      "test-org-001";
    const role = normalizeRole(request.headers.get("x-user-role") ?? "admin");
    return {
      userId,
      organisationId,
      role,
      capabilities: resolveCapabilities(role, request.headers.get("x-user-capabilities")),
      email: request.headers.get("x-user-email") ?? "test@example.com",
    };
  }

  assertSupabaseConfigured();
  const authUser = await getAuthenticatedUser(request);
  const supabase = getSupabaseAdminClient();

  const profileResult = await supabase
    .from("users")
    .select("organisation_id, role")
    .eq("id", authUser.userId)
    .single();
  if (profileResult.error || !profileResult.data) {
    throw new AppError(403, "org_membership_missing", "User is not assigned to an organisation.");
  }

  const role = normalizeRole(String(profileResult.data.role ?? "member"));
  return {
    userId: authUser.userId,
    organisationId: String(profileResult.data.organisation_id),
    role,
    capabilities: resolveCapabilities(role, request.headers.get("x-user-capabilities")),
    email: authUser.email,
  };
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser> {
  const allowTestBypass = isTestAuthBypassEnabled();
  if (allowTestBypass) {
    return {
      userId: request.headers.get("x-user-id") ?? "test-user-001",
      email: request.headers.get("x-user-email") ?? "test@example.com",
    };
  }

  assertSupabaseConfigured();
  const token = getAccessToken(request);
  if (!token) {
    throw new AppError(401, "unauthorized", "Missing authenticated session.");
  }

  const supabase = getSupabaseAdminClient();
  const userResult = await supabase.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    throw new AppError(401, "unauthorized", "Invalid Supabase session token.");
  }

  return {
    userId: userResult.data.user.id,
    email: userResult.data.user.email ?? null,
  };
}
