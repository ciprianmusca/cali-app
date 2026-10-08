/**
 * Outbound mail anti-abuse limits (D1):
 * - max 3 messages / hour / email address
 * - max 10 messages / hour / IP
 */

import { sha256Hex } from "@/lib/token";

const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

function hourBucket(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

async function bump(
  db: D1Database,
  key: string,
  bucket: string,
  max: number
): Promise<boolean> {
  const id = `${key}:${bucket}`;
  const row = await db
    .prepare("SELECT count FROM mail_rate_limits WHERE id = ?")
    .bind(id)
    .first<{ count: number }>();
  const count = row?.count ?? 0;
  if (count >= max) return false;
  if (row) {
    await db
      .prepare(
        "UPDATE mail_rate_limits SET count = count + 1 WHERE id = ?"
      )
      .bind(id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO mail_rate_limits (id, window_start, count) VALUES (?, ?, 1)`
      )
      .bind(id, bucket)
      .run();
  }
  return true;
}

/** Returns false when either email or IP budget is exhausted. */
export async function allowOutboundMail(
  db: D1Database,
  opts: { email: string; ip?: string | null }
): Promise<{ ok: boolean; error?: "rate_email" | "rate_ip" }> {
  const bucket = hourBucket();
  const emailKey = `email:${await sha256Hex(opts.email.trim().toLowerCase())}`;
  const emailOk = await bump(db, emailKey, bucket, MAX_PER_EMAIL);
  if (!emailOk) return { ok: false, error: "rate_email" };

  const ip = (opts.ip || "unknown").trim() || "unknown";
  const ipKey = `ip:${await sha256Hex(ip)}`;
  const ipOk = await bump(db, ipKey, bucket, MAX_PER_IP);
  if (!ipOk) return { ok: false, error: "rate_ip" };

  return { ok: true };
}
