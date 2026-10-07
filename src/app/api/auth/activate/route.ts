import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  toPublicUser,
} from "@/lib/auth";
import {
  ensureSchema,
  findPasswordResetByHash,
  findUserById,
  getDB,
  markPasswordResetUsed,
  upsertUser,
} from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { sha256Hex } from "@/lib/token";

/** Activate account from the email link (token stored in D1). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim() ?? "";
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    const tokenHash = await sha256Hex(token);
    const row = await findPasswordResetByHash(db, tokenHash, "activate");
    if (!row || row.usedAt || new Date(row.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "token_invalid" },
        { status: 400 }
      );
    }

    const user = await findUserById(db, row.userId);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "token_invalid" },
        { status: 400 }
      );
    }

    const updated = {
      ...user,
      status: "activ" as const,
    };
    await upsertUser(db, updated);
    await markPasswordResetUsed(db, row.id);
    await writeAudit(db, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "update_user",
      objectType: "user",
      objectId: user.id,
      detail: "email_activation",
    });

    const session = await createSessionToken(updated);
    await setSessionCookie(session);

    return NextResponse.json({ ok: true, user: toPublicUser(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "activate_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
