import { NextResponse } from "next/server";
import { canValidate, getSessionUser, requireUser } from "@/lib/auth";
import {
  deleteObservation,
  ensureSchema,
  getDB,
  listObservations,
  upsertObservation,
} from "@/lib/db";
import type { Observation } from "@/lib/types";
import { maskObservationNames } from "@/lib/privacy";

/** Full observation including inline photos (bootstrap strips data-URIs). */
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
    if (!session) {
      if (existing.status !== "aprobat") {
        return NextResponse.json(
          { ok: false, error: "unauthorized" },
          { status: 401 }
        );
      }
      return NextResponse.json({
        ok: true,
        observation: maskObservationNames(existing, null),
      });
    }

    return NextResponse.json({
      ok: true,
      observation: maskObservationNames(existing, session.role),
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
    const isStaff = canValidate(auth.user.role);
    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    // Field users cannot change validation fields
    const safePatch = isStaff
      ? patch
      : {
          details: patch.details,
          photos: patch.photos,
          location: patch.location,
          species: patch.species,
        };

    const merged = { ...existing, ...safePatch, id } as Observation;
    await upsertObservation(db, merged);
    return NextResponse.json({
      ok: true,
      observation: maskObservationNames(merged, auth.user.role),
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
