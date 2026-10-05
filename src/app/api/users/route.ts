import { NextResponse } from "next/server";
import { requireUsersManager, toPublicUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { rangerFlagsForRole } from "@/lib/capabilities";
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

/** Users managers: full user directory (no passwords). */
export async function GET() {
  const auth = await requireUsersManager();
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

/** Create / update user. Password hashed if provided. */
export async function POST(request: Request) {
  const auth = await requireUsersManager();
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

    // Only admin may create/promote to admin.
    if (body.role === "admin" && auth.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);

    const existing = (await listUsers(db)).find((u) => u.id === body.id);
    if (existing?.role === "admin" && auth.user.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

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

    const role = body.role as UserRole;
    const flags = rangerFlagsForRole(role, {
      canManageUsers: body.canManageUsers,
      canValidateObservations: body.canValidateObservations,
      canTeachSchool: body.canTeachSchool,
    });

    const user: User = {
      id: body.id,
      email: body.email,
      name: body.name,
      role,
      status: body.status ?? "inactiv",
      password: passwordHash,
      isAdult: body.isAdult ?? body.role !== "elev",
      parentalConsent: body.parentalConsent,
      gdprAcceptedAt: body.gdprAcceptedAt,
      gdprVersion: body.gdprVersion,
      registeredAt: body.registeredAt ?? new Date().toISOString(),
      lastLoginAt: body.lastLoginAt,
      ...flags,
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
