import { NextResponse } from "next/server";
import {
  ensureSchema,
  findPasswordResetByHash,
  findUserById,
  getDB,
  markPasswordResetUsed,
  upsertUser,
} from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isValidPassword } from "@/lib/format";
import { writeAudit } from "@/lib/audit";
import { sha256Hex } from "@/lib/token";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";
    if (!token || !isValidPassword(password)) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    const tokenHash = await sha256Hex(token);
    const row = await findPasswordResetByHash(db, tokenHash);
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

    await upsertUser(db, {
      ...user,
      password: await hashPassword(password),
    });
    await markPasswordResetUsed(db, row.id);
    await writeAudit(db, {
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "password_change",
      objectType: "user",
      objectId: user.id,
      detail: "reset_via_email",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "reset_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
