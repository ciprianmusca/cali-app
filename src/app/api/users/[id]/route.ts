import { NextResponse } from "next/server";
import { requireAdmin, toPublicUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  createPasswordReset,
  deleteUserKeepObservations,
  ensureSchema,
  findUserById,
  getDB,
  upsertUser,
} from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";
import { randomTokenHex, sha256Hex } from "@/lib/token";
import type { UserRole, UserStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      parentalConsent?: boolean;
      action?: "suspend" | "reactivate" | "reset_password";
    };

    const db = await getDB();
    await ensureSchema(db);
    const existing = await findUserById(db, id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    if (body.action === "reset_password") {
      const minutes = existing.role === "admin" ? 240 : 5;
      const raw = randomTokenHex(32);
      const tokenHash = await sha256Hex(raw);
      const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
      await createPasswordReset(db, {
        id: `pr-${crypto.randomUUID().slice(0, 10)}`,
        userId: existing.id,
        tokenHash,
        expiresAt,
        createdAt: new Date().toISOString(),
      });
      const origin = new URL(request.url).origin;
      const resetUrl = `${origin}/resetare-parola?token=${raw}`;
      const mail = await sendPasswordResetEmail({
        to: existing.email,
        resetUrl,
        expiresMinutes: minutes,
      });
      await writeAudit(db, {
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "reset_password",
        objectType: "user",
        objectId: existing.id,
        detail: existing.email,
      });
      return NextResponse.json({
        ok: true,
        demoResetUrl: mail.demoResetUrl,
      });
    }

    let status = body.status ?? existing.status;
    let auditAction:
      | "update_user"
      | "suspend_user"
      | "reactivate_user" = "update_user";
    if (body.action === "suspend") {
      status = "inactiv";
      auditAction = "suspend_user";
    }
    if (body.action === "reactivate") {
      if (!existing.gdprAcceptedAt) {
        return NextResponse.json(
          { ok: false, error: "gdpr_required" },
          { status: 400 }
        );
      }
      status = "activ";
      auditAction = "reactivate_user";
    }

    const updated = {
      ...existing,
      name: body.name?.trim() || existing.name,
      email: body.email?.trim() || existing.email,
      role: body.role ?? existing.role,
      status,
      parentalConsent:
        body.parentalConsent !== undefined
          ? body.parentalConsent
          : existing.parentalConsent,
    };
    await upsertUser(db, updated);
    await writeAudit(db, {
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      action: auditAction,
      objectType: "user",
      objectId: updated.id,
      detail: `${updated.email} → ${updated.status}`,
    });
    return NextResponse.json({ ok: true, user: toPublicUser(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "update_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    if (id === auth.user.id) {
      return NextResponse.json(
        { ok: false, error: "cannot_delete_self" },
        { status: 400 }
      );
    }
    const db = await getDB();
    await ensureSchema(db);
    const existing = await findUserById(db, id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
    await deleteUserKeepObservations(db, id);
    await writeAudit(db, {
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      action: "delete_user",
      objectType: "user",
      objectId: id,
      detail: existing.email,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "delete_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
