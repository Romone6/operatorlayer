import { AppError } from "@/lib/errors";

const requiredSupabaseEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function getMissingSupabaseEnv() {
  return requiredSupabaseEnv.filter((key) => !process.env[key]);
}

export function assertSupabaseConfigured() {
  const missing = getMissingSupabaseEnv();
  if (missing.length > 0) {
    throw new AppError(
      503,
      "supabase_config_missing",
      "Supabase is not configured for this environment.",
      { missing }
    );
  }
}

export function isSupabaseConfigured() {
  return getMissingSupabaseEnv().length === 0;
}

export function isTestAuthBypassEnabled() {
  if (process.env.NODE_ENV === "test") {
    return true;
  }

  if (process.env.OPERATORLAYER_TEST_AUTH_BYPASS !== "1") {
    return false;
  }

  return process.env.OPERATORLAYER_ALLOW_TEST_BYPASS === "1";
}
