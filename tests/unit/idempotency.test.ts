import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";

describe("resolveRequestIdempotencyKey", () => {
  it("uses client-provided idempotency key when header is present", () => {
    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "idempotency-key": "my-client-key" },
    });

    const key = resolveRequestIdempotencyKey(request, "test_scope", { value: 1 });
    expect(key).toMatch(/^test_scope:client:/);
    expect(key).not.toContain("my-client-key");
  });

  it("derives stable key from fingerprint when header is absent", () => {
    const request = new NextRequest("http://localhost/api/test", { method: "POST" });

    const first = resolveRequestIdempotencyKey(request, "test_scope", {
      b: [2, { d: 4, c: 3 }],
      a: "x",
    });
    const second = resolveRequestIdempotencyKey(request, "test_scope", {
      a: "x",
      b: [2, { c: 3, d: 4 }],
    });
    const third = resolveRequestIdempotencyKey(request, "test_scope", {
      a: "y",
      b: [2, { c: 3, d: 4 }],
    });

    expect(first).toMatch(/^test_scope:derived:/);
    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });
});
