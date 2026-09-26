import { NextResponse } from "next/server";
import { requireUser, toPublicUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  deleteUserKeepObservations,
  ensureSchema,
  getDB,
  listObservations,
  upsertUser,
} from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isValidPassword } from "@/lib/format";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const db = await getDB();
    await ensureSchema(db);
    const mine = (await listObservations(db)).filter(
      (o) => o.authorId === auth.user.id
    );
    return NextResponse.json({
      ok: true,
      user: toPublicUser(auth.user),
      observations: mine,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "profile_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as {
      action?: "change_password" | "delete_account" | "export";
      currentPassword?: string;
      newPassword?: string;
    };
    const db = await getDB();
    await ensureSchema(db);

    if (body.action === "export") {
      const mine = (await listObservations(db)).filter(
        (o) => o.authorId === auth.user.id
      );
      return NextResponse.json({
        ok: true,
        export: {
          user: toPublicUser(auth.user),
          observations: mine,
          exportedAt: new Date().toISOString(),
        },
      });
    }

    if (body.action === "change_password") {
      if (!body.currentPassword || !isValidPassword(body.newPassword ?? "")) {
        return NextResponse.json(
          { ok: false, error: "invalid" },
          { status: 400 }
        );
      }
      const ok = await verifyPassword(
        body.currentPassword,
        auth.user.password
      );
      if (!ok) {
        return NextResponse.json(
          { ok: false, error: "bad_password" },
          { status: 400 }
        );
      }
      await upsertUser(db, {
        ...auth.user,
        password: await hashPassword(body.newPassword!),
      });
      await writeAudit(db, {
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "password_change",
        objectType: "user",
        objectId: auth.user.id,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete_account") {
      await writeAudit(db, {
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "account_delete_request",
        objectType: "user",
        objectId: auth.user.id,
      });
      await deleteUserKeepObservations(db, auth.user.id);
      return NextResponse.json({ ok: true, deleted: true });
    }

    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "profile_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
