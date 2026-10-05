import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  listFieldActivitiesForUser,
  listObservations,
} from "@/lib/db";
import { maskObservationNames } from "@/lib/privacy";
import { slimObservationPhotos } from "@/lib/photos";

/**
 * Lesson prep hub for teachers: their activities + all linked observations
 * (any status — no ranger approval required for classroom use).
 */
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const role = auth.user.role;
  if (role !== "profesor" && role !== "admin" && role !== "ranger") {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  try {
    const db = await getDB();
    await ensureSchema(db);
    const activities = await listFieldActivitiesForUser(
      db,
      auth.user.id,
      auth.user.role
    );
    const activityIds = new Set(activities.map((a) => a.id));
    const observations = (await listObservations(db))
      .filter((o) => o.activityId && activityIds.has(o.activityId))
      .map((o) =>
        slimObservationPhotos(maskObservationNames(o, auth.user.role))
      );

    return NextResponse.json({
      ok: true,
      activities,
      observations,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "lesson_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
