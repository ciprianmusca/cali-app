import { NextResponse } from "next/server";
import { requireAdmin, toPublicUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  ensureSchema,
  findUserByEmail,
  getDB,
  listUsers,
  seedIfEmpty,
  upsertUser,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { User, UserRole } from "@/lib/types";

/** Admin-only directory. Passwords are never returned. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const users = (await listUsers(db)).map(toPublicUser);
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Admin-only user create / update. Password hashed if provided. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Partial<User> & {
      password?: string;
    };
    if (!body.id || !body.email || !body.name || !body.role) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);

    const existing = (await listUsers(db)).find((u) => u.id === body.id);
    const emailOwner = await findUserByEmail(db, body.email);
    if (emailOwner && emailOwner.id !== body.id) {
      return NextResponse.json(
        { ok: false, error: "email_used" },
        { status: 409 }
      );
    }

    let passwordHash = existing?.password;
    if (body.password && body.password.length > 0) {
      passwordHash = await hashPassword(body.password);
    }
    if (!passwordHash) {
      return NextResponse.json(
        { ok: false, error: "password_required" },
        { status: 400 }
      );
    }

    const user: User = {
      id: body.id,
      email: body.email,
      name: body.name,
      role: body.role as UserRole,
      status: body.status ?? "inactiv",
      password: passwordHash,
      isAdult: body.isAdult ?? body.role !== "elev",
      parentalConsent: body.parentalConsent,
      gdprAcceptedAt: body.gdprAcceptedAt,
      gdprVersion: body.gdprVersion,
      registeredAt: body.registeredAt ?? new Date().toISOString(),
      lastLoginAt: body.lastLoginAt,
    };

    await upsertUser(db, user);
    await writeAudit(db, {
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      action: existing ? "update_user" : "create_user",
      objectType: "user",
      objectId: user.id,
      detail: `${user.email} (${user.role})`,
    });
    return NextResponse.json({ ok: true, user: toPublicUser(user) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
