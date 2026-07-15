import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimitState } from "@/lib/security/rate-limit";

describe("rate limit utility", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("allows requests within configured limits", () => {
    const first = checkRateLimit("ip:1", { maxRequests: 2, windowMs: 60_000 });
    const second = checkRateLimit("ip:1", { maxRequests: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("blocks requests over the configured limit", () => {
    checkRateLimit("ip:2", { maxRequests: 1, windowMs: 60_000 });
    const blocked = checkRateLimit("ip:2", { maxRequests: 1, windowMs: 60_000 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
