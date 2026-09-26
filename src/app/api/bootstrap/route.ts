import { NextResponse } from "next/server";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  listObservations,
  listUsers,
  migratePasswords,
  seedIfEmpty,
} from "@/lib/db";
import { slimObservationPhotos } from "@/lib/photos";
import { maskObservations } from "@/lib/privacy";

/**
 * Canonical data from D1.
 * - Never returns passwords.
 * - Unauthenticated: only approved observations, no user directory, masked names.
 * - Authenticated: session user; full names only for admin/ranger.
 * - Inline photo payloads → /api/observations/:id/photo/:i URLs.
 */
export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    await migratePasswords(db);

    const session = await getSessionUser();
    const allObservations = (await listObservations(db)).map(
      slimObservationPhotos
    );

    if (!session) {
      return NextResponse.json({
        ok: true,
        user: null,
        users: [],
        observations: maskObservations(
          allObservations.filter((o) => o.status === "aprobat"),
          null
        ),
        serverTime: new Date().toISOString(),
      });
    }

    const users =
      session.role === "admin"
        ? (await listUsers(db)).map(toPublicUser)
        : [toPublicUser(session)];

    return NextResponse.json({
      ok: true,
      user: toPublicUser(session),
      users,
      observations: maskObservations(allObservations, session.role),
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "bootstrap_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
