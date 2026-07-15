import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { GET as listSources } from "@/app/api/sources/route";

const originalEnv = {
  nodeEnv: process.env.NODE_ENV,
  bypass: process.env.OPERATORLAYER_TEST_AUTH_BYPASS,
  allowBypass: process.env.OPERATORLAYER_ALLOW_TEST_BYPASS,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

afterEach(() => {
  process.env.NODE_ENV = originalEnv.nodeEnv;
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = originalEnv.bypass;
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = originalEnv.allowBypass;
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.supabaseAnon;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.supabaseService;
});

describe("fail-closed auth behavior", () => {
  it("returns explicit setup error when supabase config is missing", async () => {
    process.env.NODE_ENV = "development";
    process.env.OPERATORLAYER_TEST_AUTH_BYPASS = "0";
    process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = "0";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await listSources(
      new NextRequest("http://localhost/api/sources", {
        headers: {
          "x-user-id": "test-user-001",
          "x-org-id": "test-org-001",
        },
      })
    );
    expect(response.status).toBe(503);
    const payload = (await response.json()) as {
      error: {
        code: string;
        details?: { missing?: string[] };
        severity: string;
        recoverable: boolean;
        traceId: string;
      };
    };
    expect(payload.error.code).toBe("supabase_config_missing");
    expect(payload.error.details?.missing?.length).toBeGreaterThan(0);
    expect(payload.error.severity).toBe("critical");
    expect(payload.error.recoverable).toBe(false);
    expect(payload.error.traceId.length).toBeGreaterThan(10);
    expect(response.headers.get("x-operatorlayer-trace-id")).toBe(payload.error.traceId);
  });
});
