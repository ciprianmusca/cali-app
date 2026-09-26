import { NextResponse } from "next/server";
import { getSessionUser, requireUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  listObservations,
  seedIfEmpty,
  upsertObservation,
} from "@/lib/db";
import type { Observation } from "@/lib/types";

function slimObservation(obs: Observation): Observation {
  const placeholder =
    obs.module === "fenologie"
      ? "/placeholders/tree-1.svg"
      : obs.module === "sol"
        ? "/placeholders/soil-1.svg"
        : "/placeholders/disturbance-1.svg";
  return {
    ...obs,
    photos: (obs.photos ?? []).map((src) =>
      typeof src === "string" && src.startsWith("data:") ? placeholder : src
    ),
  };
}

export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const session = await getSessionUser();
    const all = (await listObservations(db)).map(slimObservation);
    if (!session) {
      return NextResponse.json({
        ok: true,
        observations: all.filter((o) => o.status === "aprobat"),
      });
    }
    return NextResponse.json({ ok: true, observations: all });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const obs = (await request.json()) as Observation;
    if (!obs?.id || !obs.code || !obs.module) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }
    const safe: Observation = {
      ...obs,
      authorId: auth.user.id,
      authorRole: auth.user.role,
      authorName: auth.user.name,
    };
    const db = await getDB();
    await ensureSchema(db);
    await upsertObservation(db, safe);
    return NextResponse.json({ ok: true, id: safe.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
