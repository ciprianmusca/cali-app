import { NextResponse } from "next/server";
import {
  createPasswordReset,
  ensureSchema,
  findUserByEmail,
  getDB,
  seedIfEmpty,
} from "@/lib/db";
import {
  appBaseUrl,
  readMailEnv,
  sendPasswordResetEmail,
} from "@/lib/mail";
import { allowOutboundMail } from "@/lib/mail-rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { randomTokenHex, sha256Hex } from "@/lib/token";

const RESET_MINUTES = 60;

/** Always the same body — no email enumeration, no links in the response. */
const GENERIC_OK = { ok: true as const };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      turnstileToken?: string;
    };
    const email = body.email?.trim() ?? "";
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const captchaOk = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!captchaOk) {
      return NextResponse.json(
        { ok: false, error: "captcha" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);

    const rate = await allowOutboundMail(db, { email, ip });
    if (!rate.ok) {
      // Still generic OK to avoid leaking whether the address exists / is throttled.
      return NextResponse.json(GENERIC_OK);
    }

    const user = await findUserByEmail(db, email);
    if (!user) {
      return NextResponse.json(GENERIC_OK);
    }

    const raw = randomTokenHex(32);
    const tokenHash = await sha256Hex(raw);
    await createPasswordReset(db, {
      id: `pr-${crypto.randomUUID().slice(0, 10)}`,
      userId: user.id,
      tokenHash,
      purpose: "reset",
      expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const mailEnv = await readMailEnv();
    const resetUrl = `${appBaseUrl(mailEnv)}/resetare-parola/confirmare?token=${raw}`;
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresMinutes: RESET_MINUTES,
    });

    return NextResponse.json(GENERIC_OK);
  } catch (e) {
    const message = e instanceof Error ? e.message : "forgot_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
