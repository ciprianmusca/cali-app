import { NextResponse } from "next/server";
import {
  ensureSchema,
  findUserByEmail,
  getDB,
  insertNotification,
  listUsers,
  seedIfEmpty,
  upsertUser,
  createPasswordReset,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { User } from "@/lib/types";
import { isValidPassword } from "@/lib/format";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  appBaseUrl,
  readMailEnv,
  sendAccountActivationEmail,
} from "@/lib/mail";
import { allowOutboundMail } from "@/lib/mail-rate-limit";
import { randomTokenHex, sha256Hex } from "@/lib/token";
import { canManageUsers } from "@/lib/capabilities";
import { writeAudit } from "@/lib/audit";

const ACTIVATION_HOURS = 24;

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

    const rate = await allowOutboundMail(db, { email, ip });
    if (!rate.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429 }
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
      sessionVersion: 0,
    };
    await upsertUser(db, user);

    const raw = randomTokenHex(32);
    const tokenHash = await sha256Hex(raw);
    await createPasswordReset(db, {
      id: `act-${crypto.randomUUID().slice(0, 10)}`,
      userId: user.id,
      tokenHash,
      purpose: "activate",
      expiresAt: new Date(
        Date.now() + ACTIVATION_HOURS * 3600_000
      ).toISOString(),
      createdAt: now,
    });

    const mailEnv = await readMailEnv();
    const activateUrl = `${appBaseUrl(mailEnv)}/activare?token=${raw}`;
    const mail = await sendAccountActivationEmail({
      to: user.email,
      name: user.name,
      activateUrl,
      expiresHours: ACTIVATION_HOURS,
    });

    await writeAudit(db, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "create_user",
      objectType: "user",
      objectId: user.id,
      detail: mail.sent
        ? "self_register_pending_email"
        : "self_register_pending_admin",
    });

    const managers = (await listUsers(db)).filter(
      (u) => !u.isDemo && u.status === "activ" && canManageUsers(u)
    );
    const notifBody = mail.sent
      ? `${user.name} (${user.email}) s-a înregistrat. Așteaptă activarea pe email.`
      : `${user.name} (${user.email}) s-a înregistrat. Emailul nu a putut fi trimis — activați contul din Administrare.`;
    for (const m of managers) {
      await insertNotification(db, {
        id: `n-${crypto.randomUUID().slice(0, 10)}`,
        userId: m.id,
        type: "info",
        title: "Cont nou de activat",
        body: notifBody,
        createdAt: now,
      });
    }

    return NextResponse.json({
      ok: true,
      needsActivation: true,
      mailSent: mail.sent,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "register_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
