import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encrypts POS access tokens before they are stored in pos_connections (AES-256-GCM).
// POS_ENCRYPTION_KEY: 32 random bytes in base64, server-only. Never log a token or send it to the browser.

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const encoded = process.env.POS_ENCRYPTION_KEY;
  if (!encoded) throw new Error("POS_ENCRYPTION_KEY is not set");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("POS_ENCRYPTION_KEY must be 32 bytes in base64");
  return key;
}

/** True when the server has a valid key, so routes can answer clearly instead of failing mid-way. */
export function hasEncryptionKey(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypts `token` for the given owner. The owner's id is bound to the ciphertext (additional
 * authenticated data), so a token copied onto another owner's row can't be decrypted.
 * Result: "v1:" + base64(iv | auth tag | ciphertext).
 */
export function encryptToken(token: string, ownerId: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAAD(Buffer.from(ownerId, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")}`;
}

/** Decrypts a value made by encryptToken for the same owner. Throws if it was tampered with. */
export function decryptToken(stored: string, ownerId: string): string {
  const [version, payload] = stored.split(":");
  if (version !== VERSION || !payload) throw new Error("Unknown encrypted token format");
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, IV_BYTES);
  const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = data.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAAD(Buffer.from(ownerId, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
