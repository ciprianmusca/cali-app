import { NextResponse } from "next/server";
import {
  deleteObservation,
  ensureSchema,
  getDB,
  listObservations,
  upsertObservation,
} from "@/lib/db";
import type { Observation } from "@/lib/types";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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
    const merged = { ...existing, ...patch, id } as Observation;
    await upsertObservation(db, merged);
    return NextResponse.json({ ok: true, observation: merged });
  } catch (e) {
    const message = e instanceof Error ? e.message : "update_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const db = await getDB();
    await ensureSchema(db);
    await deleteObservation(db, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "delete_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
