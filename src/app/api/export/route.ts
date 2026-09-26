import { NextResponse } from "next/server";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  ensureSchema,
  getDB,
  listObservations,
  seedIfEmpty,
} from "@/lib/db";
import {
  buildFairCsv,
  buildFairZip,
  fairRecord,
  filterForFairExport,
  getExportPseudoSalt,
  type FairExportOptions,
} from "@/lib/fair-export";
import { filterObservationsForViewer } from "@/lib/visibility";

function parseFairOpts(url: URL): FairExportOptions {
  return {
    full:
      url.searchParams.get("full") === "1" ||
      url.searchParams.get("full") === "true",
    includeDetails:
      url.searchParams.get("includeDetails") === "1" ||
      url.searchParams.get("includeDetails") === "true",
  };
}

/**
 * Server-side exports (SEC-04, ADM-01–05):
 * - format=zip|csv (admin): anonymised FAIR package (ZIP with CSV+GeoJSON+metadata)
 * - format=geojson: GeoJSON with the same scientific fields (no person names)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "geojson";
    const opts = parseFairOpts(url);
    const salt = await getExportPseudoSalt();

    const db = await getDB();
    await ensureSchema(db);
    await seedIfEmpty(db);
    const all = await listObservations(db);

    if (format === "csv" || format === "zip") {
      const auth = await requireAdmin();
      if (auth.error) return auth.error;

      const filtered = filterForFairExport(all, opts);
      const stamp = new Date().toISOString().slice(0, 10);

      await writeAudit(db, {
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "export",
        objectType: "observations",
        objectId: format === "zip" ? "fair-zip" : "fair-csv",
        detail: `${filtered.length} rows; full=${opts.full}; details=${opts.includeDetails}`,
      });

      if (format === "zip") {
        const zip = await buildFairZip(all, opts, salt);
        const body = new Blob([Uint8Array.from(zip)], {
          type: "application/zip",
        });
        return new NextResponse(body, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="cali-lab-fair-${stamp}.zip"`,
          },
        });
      }

      const csv = await buildFairCsv(all, opts, salt);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cali-lab-fair-${stamp}.csv"`,
        },
      });
    }

    // ADM-04: map GeoJSON — same scientific fields as CSV, no person names.
    // Visibility filter applies; status included; free-text details excluded.
    const session = await getSessionUser();
    const viewer = session
      ? { id: session.id, role: session.role }
      : null;
    const visible = filterObservationsForViewer(all, viewer);
    const geoOpts: FairExportOptions = { full: true, includeDetails: false };
    const features = await Promise.all(
      visible.map(async (o) => {
        const properties = await fairRecord(o, geoOpts, salt);
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [o.location.longitude, o.location.latitude] as [
              number,
              number,
            ],
          },
          properties,
        };
      })
    );

    return NextResponse.json(
      { type: "FeatureCollection", features },
      {
        headers: {
          "Content-Disposition":
            'attachment; filename="cali-lab-observatii.geojson"',
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "export_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
