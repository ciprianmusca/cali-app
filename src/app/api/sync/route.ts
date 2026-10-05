import { NextResponse } from "next/server";
import { canValidate, requireUser } from "@/lib/auth";
import {
  ensureSchema,
  ensureUniqueObservationCode,
  getDB,
  getObservationById,
  seedIfEmpty,
  upsertObservation,
} from "@/lib/db";
import { getPhotosBucket, persistObservationPhotos } from "@/lib/r2";
import { slimObservationPhotos } from "@/lib/photos";
import type { Observation } from "@/lib/types";

function hasUploadablePhotos(photos: string[] | undefined): boolean {
  return (photos ?? []).some(
    (p) => typeof p === "string" && p.startsWith("data:")
  );
}

/**
 * Upload offline observations into D1 + R2. Requires authenticated session.
 * Photos (data-URI) are written to R2; D1 stores only r2: keys.
 * Users may only upsert their own observations unless ranger/admin.
 * Codes that collide with another id are remapped to the next free code.
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
    const bucket = await getPhotosBucket();

    const ids: string[] = [];
    const saved: Observation[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const obs of list) {
      if (!obs?.id || !obs.code || !obs.module || !obs.location) continue;

      const isOwner = obs.authorId === session.id;
      const isStaff = canValidate(session);
      if (!isOwner && !isStaff) {
        errors.push({ id: obs.id, error: "forbidden" });
        continue;
      }

      try {
        const existing = await getObservationById(db, obs.id);
        const base: Observation = isStaff
          ? obs
          : {
              ...obs,
              authorId: session.id,
              authorRole: session.role,
              authorName: session.name,
            };

        const unique = await ensureUniqueObservationCode(db, base);

        // Don't wipe R2 photos when staff syncs a validation with API/idb refs only.
        let photos: string[];
        if (hasUploadablePhotos(unique.photos)) {
          photos = await persistObservationPhotos(
            bucket,
            unique.id,
            unique.photos ?? []
          );
        } else if (existing?.photos?.length) {
          photos = existing.photos;
        } else {
          photos = await persistObservationPhotos(
            bucket,
            unique.id,
            unique.photos ?? []
          );
        }

        const safe: Observation = { ...unique, photos };
        await upsertObservation(db, safe);
        ids.push(safe.id);
        saved.push(slimObservationPhotos(safe));
      } catch (e) {
        errors.push({
          id: obs.id,
          error: e instanceof Error ? e.message : "upsert_failed",
        });
      }
    }

    if (!ids.length) {
      return NextResponse.json(
        {
          ok: false,
          error: errors[0]?.error ?? "sync_failed",
          errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      received: ids.length,
      ids,
      observations: saved,
      errors: errors.length ? errors : undefined,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
