import { NextResponse } from "next/server";
import { canValidate, getSessionUser, requireUser } from "@/lib/auth";
import {
  deleteObservation,
  ensureSchema,
  getDB,
  getFieldActivity,
  listFieldActivities,
  listObservations,
  upsertObservation,
} from "@/lib/db";
import type { Observation } from "@/lib/types";
import { maskObservationNames } from "@/lib/privacy";
import { slimObservationPhotos } from "@/lib/photos";
import { getPhotosBucket, persistObservationPhotos } from "@/lib/r2";
import { canViewObservation } from "@/lib/visibility";

function presentObservation(
  obs: Observation,
  role: Parameters<typeof maskObservationNames>[1]
): Observation {
  return slimObservationPhotos(maskObservationNames(obs, role));
}

/** Full observation metadata; photos as visibility-gated API URLs. */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const db = await getDB();
    await ensureSchema(db);
    const all = await listObservations(db);
    const existing = all.find((o) => o.id === id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    const session = await getSessionUser();
    const viewer = session
      ? { id: session.id, role: session.role }
      : null;

    let teacherActivityIds: Set<string> | undefined;
    if (session?.role === "profesor") {
      const acts = await listFieldActivities(db);
      teacherActivityIds = new Set(
        acts.filter((a) => a.createdBy === session.id).map((a) => a.id)
      );
    }

    if (!canViewObservation(existing, viewer, teacherActivityIds)) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      observation: presentObservation(existing, session?.role ?? null),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "get_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    const patch = (await request.json()) as Partial<Observation>;
    const db = await getDB();
    await ensureSchema(db);
    const all = await listObservations(db);
    const existing = all.find((o) => o.id === id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    const isOwner = existing.authorId === auth.user.id;
    const isStaff = canValidate(auth.user);
    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const safePatch = isStaff
      ? patch
      : {
          details: patch.details,
          photos: patch.photos,
          location: patch.location,
          species: patch.species,
          activityId: patch.activityId,
        };

    let merged = { ...existing, ...safePatch, id } as Observation;
    // Classroom debate is owned by /classroom — never change via this PATCH.
    merged = {
      ...merged,
      classroomStatus: existing.classroomStatus,
      classroomComment: existing.classroomComment,
      classroomById: existing.classroomById,
      classroomByName: existing.classroomByName,
      classroomAt: existing.classroomAt,
      classroomHistory: existing.classroomHistory,
    };
    if (safePatch.photos) {
      const bucket = await getPhotosBucket();
      const photos = await persistObservationPhotos(
        bucket,
        id,
        safePatch.photos
      );
      merged = { ...merged, photos };
    }

    // Owners may only set activityId on an existing activity.
    if (
      !isStaff &&
      safePatch.activityId &&
      safePatch.activityId !== existing.activityId
    ) {
      const activity = await getFieldActivity(db, safePatch.activityId);
      if (!activity) {
        return NextResponse.json(
          { ok: false, error: "activity_not_found" },
          { status: 400 }
        );
      }
    }

    await upsertObservation(db, merged);
    return NextResponse.json({
      ok: true,
      observation: presentObservation(merged, auth.user.role),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "update_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    const db = await getDB();
    await ensureSchema(db);
    const all = await listObservations(db);
    const existing = all.find((o) => o.id === id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
    const isOwner = existing.authorId === auth.user.id;
    const isAdmin = auth.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }
    if (
      existing.status !== "in_asteptare" &&
      existing.status !== "clarificare" &&
      auth.user.role !== "admin"
    ) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    await deleteObservation(db, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "delete_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
