import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  getSentinelTree,
  listObservations,
  seedIfEmpty,
} from "@/lib/db";
import { prepareObservationsForApi } from "@/lib/visibility";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const tree = await getSentinelTree(db, id);
    if (!tree) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
    const session = await getSessionUser();
    const viewer = session
      ? {
          id: session.id,
          role: session.role,
          canValidateObservations: session.canValidateObservations,
          isDemo: session.isDemo,
        }
      : null;
    const all = await listObservations(db);
    const linked = prepareObservationsForApi(
      all.filter((o) => o.sentinelTreeId === id || (o.isSentinelTree && !o.sentinelTreeId && false)),
      viewer
    ).filter((o) => o.sentinelTreeId === id);

    return NextResponse.json({ ok: true, tree, observations: linked });
  } catch (e) {
    const message = e instanceof Error ? e.message : "get_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
