import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export function looksHashed(value: string): boolean {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  if (looksHashed(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Temporary legacy path: plaintext rows until migration rewrites them.
  return plain === stored;
}
