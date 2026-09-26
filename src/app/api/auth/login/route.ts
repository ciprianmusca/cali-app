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
  migratePasswords,
  seedIfEmpty,
  upsertUser,
} from "@/lib/db";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    await migratePasswords(db);

    const user = await findUserByEmail(db, email);
    if (!user || user.status !== "activ") {
      return NextResponse.json(
        { ok: false, error: "invalid_login" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "invalid_login" },
        { status: 401 }
      );
    }

    const lastLoginAt = new Date().toISOString();
    const updated = {
      ...user,
      lastLoginAt,
      // Upgrade legacy bcrypt/plaintext to PBKDF2 after a successful check.
      password: needsRehash(user.password)
        ? await hashPassword(password)
        : user.password,
    };
    await upsertUser(db, updated);

    const token = await createSessionToken(updated);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: toPublicUser(updated),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "login_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
