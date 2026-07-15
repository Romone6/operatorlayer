import crypto from "node:crypto";

import type { NextRequest } from "next/server";

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function toCanonicalValue(value: unknown): CanonicalValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (Array.isArray(value)) return value.map((item) => toCanonicalValue(item));
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, toCanonicalValue(nested)] as const);
    return Object.fromEntries(entries);
  }
  return String(value);
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function resolveRequestIdempotencyKey(
  request: NextRequest,
  scope: string,
  fingerprint: Record<string, unknown>
) {
  const header = request.headers.get("idempotency-key")?.trim();
  if (header) {
    return `${scope}:client:${hash(header)}`;
  }
  return `${scope}:derived:${hash(JSON.stringify(toCanonicalValue(fingerprint)))}`;
}
