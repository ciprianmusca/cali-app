import { NextResponse } from "next/server";
import {
  ensureSchema,
  getDB,
  listUsers,
  seedIfEmpty,
  upsertUser,
} from "@/lib/db";
import type { User } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const users = await listUsers(db);
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = (await request.json()) as User;
    if (!user?.id || !user.email) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }
    const db = await getDB();
    await ensureSchema(db);
    await upsertUser(db, user);
    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
