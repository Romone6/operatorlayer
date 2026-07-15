import crypto from "node:crypto";

import { AppError } from "@/lib/errors";

export function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader
    .split(",")
    .map((item) => item.trim())
    .reduce<Record<string, string>>((acc, item) => {
      const [key, value] = item.split("=");
      if (key && value) acc[key] = value;
      return acc;
    }, {});
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    throw new AppError(400, "stripe_signature_invalid", "Malformed Stripe signature header.");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  if (signature.length !== expected.length) {
    throw new AppError(401, "stripe_signature_mismatch", "Stripe webhook signature mismatch.");
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AppError(401, "stripe_signature_mismatch", "Stripe webhook signature mismatch.");
  }
}
