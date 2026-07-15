import { afterEach, describe, expect, it } from "vitest";

import { assertSupabaseConfigured, getMissingSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/config";

const envKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof envKeys)[number],
  string | undefined
>;

function restoreEnv() {
  for (const key of envKeys) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("supabase auth configuration", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("reports the exact missing Supabase auth environment variables", () => {
    for (const key of envKeys) {
      delete process.env[key];
    }

    expect(isSupabaseConfigured()).toBe(false);
    expect(getMissingSupabaseEnv()).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
    expect(() => assertSupabaseConfigured()).toThrow("Supabase is not configured for this environment.");
  });

  it("accepts configuration only when every Supabase auth environment variable is present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    expect(getMissingSupabaseEnv()).toEqual([]);
    expect(isSupabaseConfigured()).toBe(true);
    expect(() => assertSupabaseConfigured()).not.toThrow();
  });
});
