import { NextResponse } from "next/server";
import { canValidate, requireUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  seedIfEmpty,
  upsertObservation,
} from "@/lib/db";
import type { Observation } from "@/lib/types";

/**
 * Upload offline observations into D1. Requires authenticated session.
 * Users may only upsert their own observations unless ranger/admin.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const session = auth.user;

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

      const isOwner = obs.authorId === session.id;
      const isStaff = canValidate(session.role);
      if (!isOwner && !isStaff) continue;

      // Non-staff cannot forge another author's id
      const safe: Observation = isStaff
        ? obs
        : { ...obs, authorId: session.id, authorRole: session.role, authorName: session.name };

      await upsertObservation(db, safe);
      ids.push(safe.id);
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
