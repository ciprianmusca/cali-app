import { NextResponse } from "next/server";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  listFieldActivities,
  listObservations,
  listUsers,
  migrateObservationRows,
  migratePasswords,
  migratePhotosToR2,
  seedIfEmpty,
} from "@/lib/db";
import { getPhotosBucket } from "@/lib/r2";
import { prepareObservationsForApi } from "@/lib/visibility";

/**
 * Canonical data from D1.
 * Visibility (ROL-05): visitor=approved; field=approved+own; staff=all;
 * profesor=approved+own+observations on their activities.
 * Never returns passwords or base64 photos.
 */
export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    await migratePasswords(db);
    try {
      await migrateObservationRows(db);
    } catch {
      /* ignore migration hiccups */
    }
    try {
      const bucket = await getPhotosBucket();
      await migratePhotosToR2(db, bucket);
    } catch {
      /* R2 may be unavailable in local next dev — skip photo migration */
    }

    const session = await getSessionUser();
    const allObservations = await listObservations(db);
    const viewer = session
      ? { id: session.id, role: session.role }
      : null;

    if (!session) {
      return NextResponse.json({
        ok: true,
        user: null,
        users: [],
        observations: prepareObservationsForApi(allObservations, null),
        serverTime: new Date().toISOString(),
      });
    }

    const users =
      session.role === "admin"
        ? (await listUsers(db)).map(toPublicUser)
        : [toPublicUser(session)];

    let teacherActivityIds: Set<string> | undefined;
    if (session.role === "profesor") {
      const acts = await listFieldActivities(db);
      teacherActivityIds = new Set(
        acts.filter((a) => a.createdBy === session.id).map((a) => a.id)
      );
    }

    return NextResponse.json({
      ok: true,
      user: toPublicUser(session),
      users,
      observations: prepareObservationsForApi(
        allObservations,
        viewer,
        teacherActivityIds
      ),
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "bootstrap_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
