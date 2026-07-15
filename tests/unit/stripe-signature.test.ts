import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyStripeSignature } from "@/lib/security/stripe-signature";

describe("verifyStripeSignature", () => {
  it("accepts valid stripe-style signature", () => {
    const payload = JSON.stringify({ type: "invoice.paid" });
    const secret = "whsec_test_secret";
    const timestamp = "1700000000";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    expect(() =>
      verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret)
    ).not.toThrow();
  });

  it("rejects invalid signature", () => {
    const payload = JSON.stringify({ type: "invoice.paid" });
    const secret = "whsec_test_secret";
    expect(() => verifyStripeSignature(payload, "t=1700000000,v1=bad", secret)).toThrow();
  });
});
