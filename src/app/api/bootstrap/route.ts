import { NextResponse } from "next/server";
import { getSessionUser, toPublicUser, canValidate } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  listObservations,
  listUsers,
  migratePlaintextPasswords,
  seedIfEmpty,
} from "@/lib/db";
import { slimObservationPhotos } from "@/lib/photos";

/**
 * Canonical data from D1.
 * - Never returns passwords.
 * - Unauthenticated: only approved observations, no user directory.
 * - Authenticated: observations + user directory only for admin.
 * - Inline photo payloads are replaced with /api/observations/:id/photo/:i URLs.
 */
export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    await migratePlaintextPasswords(db);

    const session = await getSessionUser();
    const allObservations = (await listObservations(db)).map(
      slimObservationPhotos
    );

    if (!session) {
      return NextResponse.json({
        ok: true,
        user: null,
        users: [],
        observations: allObservations.filter((o) => o.status === "aprobat"),
        serverTime: new Date().toISOString(),
      });
    }

    const users =
      session.role === "admin"
        ? (await listUsers(db)).map(toPublicUser)
        : [toPublicUser(session)];

    const observations = canValidate(session.role)
      ? allObservations
      : allObservations;

    return NextResponse.json({
      ok: true,
      user: toPublicUser(session),
      users,
      observations,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "bootstrap_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
