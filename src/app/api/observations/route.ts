import { NextResponse } from "next/server";
import { getSessionUser, requireUser } from "@/lib/auth";
import {
  ensureSchema,
  ensureUniqueObservationCode,
  getDB,
  listObservations,
  seedIfEmpty,
  upsertObservation,
} from "@/lib/db";
import { getPhotosBucket, persistObservationPhotos } from "@/lib/r2";
import { prepareObservationsForApi } from "@/lib/visibility";
import type { Observation } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const session = await getSessionUser();
    const all = await listObservations(db);
    const viewer = session
      ? { id: session.id, role: session.role }
      : null;
    return NextResponse.json({
      ok: true,
      observations: prepareObservationsForApi(all, viewer),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

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
    const unique = await ensureUniqueObservationCode(db, {
      ...obs,
      authorId: auth.user.id,
      authorRole: auth.user.role,
      authorName: auth.user.name,
    });
    const bucket = await getPhotosBucket();
    const photos = await persistObservationPhotos(
      bucket,
      unique.id,
      unique.photos ?? []
    );
    const safe: Observation = { ...unique, photos };
    await upsertObservation(db, safe);
    return NextResponse.json({ ok: true, id: safe.id, code: safe.code });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
