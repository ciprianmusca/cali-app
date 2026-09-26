import { NextResponse } from "next/server";
import {
  ensureSchema,
  getDB,
  listObservations,
  listUsers,
  seedIfEmpty,
} from "@/lib/db";

/** Ensure schema/seed, return canonical users + observations from D1. */
export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const [users, observations] = await Promise.all([
      listUsers(db),
      listObservations(db),
    ]);
    return NextResponse.json({
      ok: true,
      users,
      observations,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "bootstrap_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
