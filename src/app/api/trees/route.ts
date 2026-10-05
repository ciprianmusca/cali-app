import { NextResponse } from "next/server";
import { canValidate, requireUser } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  listSentinelTrees,
  nextTreeCode,
  seedIfEmpty,
  upsertSentinelTree,
} from "@/lib/db";
import { roundCoord } from "@/lib/format";
import type { SentinelTree, Species } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const trees = await listSentinelTrees(db);
    return NextResponse.json({ ok: true, trees });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  if (!canValidate(auth.user)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      species?: Species;
      speciesOther?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
      observationId?: string;
    };
    if (
      !body.species ||
      typeof body.latitude !== "number" ||
      typeof body.longitude !== "number"
    ) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }
    if (body.species === "alta" && !body.speciesOther?.trim()) {
      return NextResponse.json(
        { ok: false, error: "species_other" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    const tree: SentinelTree = {
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      code: await nextTreeCode(db),
      species: body.species,
      speciesOther: body.speciesOther?.trim(),
      latitude: roundCoord(body.latitude, 5),
      longitude: roundCoord(body.longitude, 5),
      createdBy: auth.user.id,
      createdByName: auth.user.name,
      createdAt: new Date().toISOString(),
      notes: body.notes?.trim(),
    };
    await upsertSentinelTree(db, tree);

    if (body.observationId) {
      const { getObservationById, upsertObservation } = await import("@/lib/db");
      const obs = await getObservationById(db, body.observationId);
      if (obs) {
        await upsertObservation(db, {
          ...obs,
          isSentinelTree: true,
          sentinelTreeId: tree.id,
        });
      }
    }

    return NextResponse.json({ ok: true, tree });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
