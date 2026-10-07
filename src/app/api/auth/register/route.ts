import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  toPublicUser,
} from "@/lib/auth";
import {
  ensureSchema,
  findUserByEmail,
  getDB,
  seedIfEmpty,
  upsertUser,
  createPasswordReset,
  markPasswordResetUsed,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { User } from "@/lib/types";
import { isValidPassword } from "@/lib/format";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { allowDevMailLinks, sendAccountActivationEmail } from "@/lib/mail";
import { randomTokenHex, sha256Hex } from "@/lib/token";
import { writeAudit } from "@/lib/audit";

const ACTIVATION_HOURS = 48;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: "turist" | "rezident";
      isAdult?: boolean;
      gdprAccepted?: boolean;
      gdprVersion?: string;
      turnstileToken?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const role = body.role === "rezident" ? "rezident" : "turist";

    if (!name || !email || !password) {
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
    if (!body.isAdult) {
      return NextResponse.json(
        { ok: false, error: "must_be_adult" },
        { status: 400 }
      );
    }
    if (!body.gdprAccepted || !body.gdprVersion) {
      return NextResponse.json(
        { ok: false, error: "gdpr_required" },
        { status: 400 }
      );
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { ok: false, error: "password_rules" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);

    if (await findUserByEmail(db, email)) {
      return NextResponse.json(
        { ok: false, error: "email_exists" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const user: User = {
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      email,
      name,
      role,
      status: "inactiv",
      password: await hashPassword(password),
      isAdult: true,
      gdprAcceptedAt: now,
      gdprVersion: body.gdprVersion,
      registeredAt: now,
      isDemo: false,
    };
    await upsertUser(db, user);

    const raw = randomTokenHex(32);
    const tokenHash = await sha256Hex(raw);
    const tokenId = `act-${crypto.randomUUID().slice(0, 10)}`;
    await createPasswordReset(db, {
      id: tokenId,
      userId: user.id,
      tokenHash,
      purpose: "activate",
      expiresAt: new Date(
        Date.now() + ACTIVATION_HOURS * 3600_000
      ).toISOString(),
      createdAt: now,
    });

    const origin = new URL(request.url).origin;
    const activateUrl = `${origin}/activare-cont?token=${raw}`;
    const mail = await sendAccountActivationEmail({
      to: user.email,
      name: user.name,
      activateUrl,
      expiresHours: ACTIVATION_HOURS,
    });

    // When outbound mail works: keep inactive until the email link is opened.
    if (mail.sent) {
      return NextResponse.json({
        ok: true,
        needsActivation: true,
        mailSent: true,
      });
    }

    // Mail not configured / failed: do not leave the user stuck without a link.
    // Activate immediately and start a session (no token exposed in the UI).
    const active: User = { ...user, status: "activ" };
    await upsertUser(db, active);
    await markPasswordResetUsed(db, tokenId);
    await writeAudit(db, {
      actorId: active.id,
      actorName: active.name,
      actorRole: active.role,
      action: "update_user",
      objectType: "user",
      objectId: active.id,
      detail: "auto_activate_mail_unavailable",
    });
    const session = await createSessionToken(active);
    await setSessionCookie(session);

    return NextResponse.json({
      ok: true,
      needsActivation: false,
      mailSent: false,
      user: toPublicUser(active),
      // Localhost only — never on cali-lab.app.
      demoActivateUrl: allowDevMailLinks(request.url)
        ? mail.demoResetUrl
        : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "register_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
