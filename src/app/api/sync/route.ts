import { NextResponse } from "next/server";
import {
  ensureSchema,
  getDB,
  seedIfEmpty,
  upsertObservation,
} from "@/lib/db";
import type { Observation } from "@/lib/types";

/**
 * Upload offline observations into D1 (source of truth).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      observations?: Observation[];
    };
    const list = Array.isArray(body.observations) ? body.observations : [];
    if (!list.length) {
      return NextResponse.json(
        { ok: false, error: "empty" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);

    const ids: string[] = [];
    for (const obs of list) {
      if (!obs?.id || !obs.code || !obs.module || !obs.location) continue;
      await upsertObservation(db, obs);
      ids.push(obs.id);
    }

    return NextResponse.json({
      ok: true,
      received: ids.length,
      ids,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
