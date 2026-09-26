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

/**
 * Canonical data from D1.
 * - Never returns passwords.
 * - Unauthenticated: only approved observations, no user directory.
 * - Authenticated: observations (all for ranger/admin, else all for app use)
 *   + user directory only for admin (without passwords).
 */
export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    await migratePlaintextPasswords(db);

    const session = await getSessionUser();
    const allObservations = await listObservations(db);

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

    // Rangers/admins see all; field roles see all for list/map workflows
    // (author names are already masked client-side for privacy).
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
