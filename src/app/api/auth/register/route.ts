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
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { User } from "@/lib/types";
import { isValidPassword } from "@/lib/format";
import { verifyTurnstileToken } from "@/lib/turnstile";

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
    // ADM-14/15: account activates only with GDPR policy acceptance.
    const user: User = {
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      email,
      name,
      role,
      status: "activ",
      password: await hashPassword(password),
      isAdult: true,
      gdprAcceptedAt: now,
      gdprVersion: body.gdprVersion,
      registeredAt: now,
    };
    await upsertUser(db, user);

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user: toPublicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "register_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
