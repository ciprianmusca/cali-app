import { NextResponse } from "next/server";
import {
  createPasswordReset,
  ensureSchema,
  findUserByEmail,
  getDB,
  seedIfEmpty,
} from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";
import { randomTokenHex, sha256Hex } from "@/lib/token";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);

    const user = await findUserByEmail(db, email);
    // Always OK to avoid email enumeration.
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const minutes = user.role === "admin" ? 240 : 5;
    const raw = randomTokenHex(32);
    const tokenHash = await sha256Hex(raw);
    await createPasswordReset(db, {
      id: `pr-${crypto.randomUUID().slice(0, 10)}`,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/resetare-parola?token=${raw}`;
    const mail = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresMinutes: minutes,
    });

    return NextResponse.json({
      ok: true,
      demoResetUrl: mail.demoResetUrl,
      expiresMinutes: minutes,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "forgot_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
