import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  getFieldActivity,
  listObservations,
} from "@/lib/db";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    const db = await getDB();
    await ensureSchema(db);
    const activity = await getFieldActivity(db, id);
    if (!activity) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
    const observations = (await listObservations(db)).filter(
      (o) => o.activityId === id
    );
    return NextResponse.json({ ok: true, activity, observations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "get_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
