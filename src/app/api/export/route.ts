import { NextResponse } from "next/server";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import {
  ensureSchema,
  getDB,
  listObservations,
  seedIfEmpty,
} from "@/lib/db";
import { csvEscape } from "@/lib/format";
import type { Observation } from "@/lib/types";
import { filterObservationsForViewer } from "@/lib/visibility";

function fairRow(o: Observation): (string | number)[] {
  const orig = o.originalFields;
  const base: (string | number)[] = [
    o.code,
    o.module,
    o.status,
    o.createdAt,
    o.location.capturedAt,
    o.location.latitude,
    o.location.longitude,
    o.location.accuracy ?? "",
    o.location.altitude ?? "",
    o.authorRole,
    o.species ?? "",
    orig?.species ?? "",
    o.validatedAt ?? "",
    o.photos?.length ?? 0,
    o.details ?? "",
  ];
  if (o.module === "fenologie") {
    return [
      ...base,
      o.stage,
      orig?.stage ?? "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ];
  }
  if (o.module === "perturbari") {
    return [
      ...base,
      "",
      "",
      o.disturbanceTypes.join("|"),
      (orig?.disturbanceTypes ?? []).join("|"),
      o.severity,
      orig?.severity ?? "",
      o.affectedAreaSqm,
      "",
      "",
      "",
      "",
      "",
    ];
  }
  return [
    ...base,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    o.mossPct,
    o.litterPct,
    o.plantsPct,
    o.barePct,
    o.seedlingsPresent ? "1" : "0",
  ];
}

const FAIR_HEADERS = [
  "code",
  "module",
  "status",
  "created_at",
  "capture_at",
  "latitude",
  "longitude",
  "accuracy_m",
  "altitude_m",
  "author_role",
  "species",
  "species_original",
  "validated_at",
  "photo_count",
  "details",
  "phenology_stage",
  "phenology_stage_original",
  "disturbance_types",
  "disturbance_types_original",
  "severity",
  "severity_original",
  "affected_area_sqm",
  "soil_moss_percentage",
  "soil_litter_percentage",
  "soil_plants_percentage",
  "soil_bare_percentage",
  "soil_seedlings_present",
];

/**
 * Server-side exports (SEC-04):
 * - format=csv (admin only): anonymised FAIR CSV of all observations
 * - format=geojson: GeoJSON of observations visible to the current session
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "geojson";

    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const all = await listObservations(db);

    if (format === "csv") {
      const auth = await requireAdmin();
      if (auth.error) return auth.error;
      const lines = [
        FAIR_HEADERS.join(";"),
        ...all.map((o) => fairRow(o).map(csvEscape).join(";")),
      ];
      const body = "\uFEFF" + lines.join("\n");
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="cali-fair-export.csv"',
        },
      });
    }

    const session = await getSessionUser();
    const viewer = session
      ? { id: session.id, role: session.role }
      : null;
    const visible = filterObservationsForViewer(all, viewer);
    const features = visible.map((o) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [o.location.longitude, o.location.latitude],
      },
      properties: {
        code: o.code,
        module: o.module,
        status: o.status,
        createdAt: o.createdAt,
        accuracy: o.location.accuracy,
        altitude: o.location.altitude,
        authorRole: o.authorRole,
      },
    }));

    return NextResponse.json(
      { type: "FeatureCollection", features },
      {
        headers: {
          "Content-Disposition":
            'attachment; filename="cali-observatii.geojson"',
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "export_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
