/**
 * Password hashing with Web Crypto PBKDF2 (Workers-compatible).
 * Stored format: pbkdf2$sha256$<iterations>$<salt_b64>$<hash_b64>
 *
 * Legacy bcrypt ($2a$/$2b$/$2y$) and plaintext are accepted by verifyPassword
 * and upgraded to PBKDF2 on successful login / migration.
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEYLEN = 32;
const SALT_BYTES = 16;

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function isPbkdf2(value: string): boolean {
  return value.startsWith("pbkdf2$");
}

export function looksBcrypt(value: string): boolean {
  return (
    value.startsWith("$2a$") ||
    value.startsWith("$2b$") ||
    value.startsWith("$2y$")
  );
}

/** @deprecated use isPbkdf2 || looksBcrypt — kept for db migrate import name */
export function looksHashed(value: string): boolean {
  return isPbkdf2(value) || looksBcrypt(value);
}

async function derivePbkdf2(
  plain: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: PBKDF2_HASH,
      // Copy into a fresh ArrayBuffer-backed view (Cloudflare Workers typing).
      salt: Uint8Array.from(salt),
      iterations,
    },
    keyMaterial,
    PBKDF2_KEYLEN * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePbkdf2(plain, salt, PBKDF2_ITERATIONS);
  return [
    "pbkdf2",
    "sha256",
    String(PBKDF2_ITERATIONS),
    bytesToB64(salt),
    bytesToB64(hash),
  ].join("$");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function verifyPbkdf2(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[2]!, 10);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;
  try {
    const salt = b64ToBytes(parts[3]!);
    const expected = b64ToBytes(parts[4]!);
    const actual = await derivePbkdf2(plain, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  if (!stored) return false;
  if (isPbkdf2(stored)) {
    return verifyPbkdf2(plain, stored);
  }
  if (looksBcrypt(stored)) {
    // Legacy path — bcryptjs until rows are upgraded on login/migration.
    const bcrypt = (await import("bcryptjs")).default;
    return bcrypt.compare(plain, stored);
  }
  // Legacy plaintext
  return plain === stored;
}

/** True when the stored value should be rewritten to PBKDF2. */
export function needsRehash(stored: string): boolean {
  return !isPbkdf2(stored);
}
