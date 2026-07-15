import crypto from "node:crypto";

import { AppError } from "@/lib/errors";

function getSecretKey() {
  const raw = process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new AppError(
      503,
      "secret_encryption_key_missing",
      "OPERATORLAYER_SECRET_ENCRYPTION_KEY is required for encrypted secret storage."
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string) {
  const key = getSecretKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string) {
  const [ivB64, tagB64, cipherB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !cipherB64) {
    throw new AppError(500, "secret_payload_invalid", "Encrypted secret payload is invalid.");
  }
  const key = getSecretKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
