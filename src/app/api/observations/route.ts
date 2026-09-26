import { NextResponse } from "next/server";
import {
  ensureSchema,
  getDB,
  listObservations,
  seedIfEmpty,
  upsertObservation,
} from "@/lib/db";
import type { Observation } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const observations = await listObservations(db);
    return NextResponse.json({ ok: true, observations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const obs = (await request.json()) as Observation;
    if (!obs?.id || !obs.code || !obs.module) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }
    const db = await getDB();
    await ensureSchema(db);
    await upsertObservation(db, obs);
    return NextResponse.json({ ok: true, id: obs.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
