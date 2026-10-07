import { zipSync, strToU8 } from "fflate";
import type { Observation, Species } from "@/lib/types";
import { csvEscape } from "@/lib/format";
import { getSpeciesDef } from "@/lib/species";
import { sha256Hex } from "@/lib/token";
import { APP_FULL_NAME, GDPR_VERSION } from "@/lib/constants";

export type FairExportOptions = {
  /** ADM-02: all statuses + status column */
  full: boolean;
  /** ADM-01: include free-text details */
  includeDetails: boolean;
};

const BASE_FIELDS = [
  "code",
  "module",
  "created_at",
  "capture_at",
  "latitude",
  "longitude",
  "accuracy_m",
  "altitude_m",
  "author_role",
  "observer_pseudo_id",
  "validator_pseudo_id",
  "species_code",
  "species_scientific_name",
  "species_gbif_key",
  "species_original_code",
  "species_original_scientific_name",
  "validated_at",
  "photo_count",
  "location_adjusted",
  "crown_condition",
  "plot_size",
  "insect_type",
  "sentinel_tree_id",
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
] as const;

const FIELD_DESCRIPTIONS: Record<string, string> = {
  code: "Observation public code (PHEN-/DIST-/SOIL-NNNN)",
  module: "Module: fenologie | perturbari | sol",
  status: "Validation status (only in full export)",
  created_at: "Observation creation timestamp (ISO-8601)",
  capture_at: "GPS capture timestamp (ISO-8601)",
  latitude: "Latitude WGS84 (EPSG:4326), 5 decimal places",
  longitude: "Longitude WGS84 (EPSG:4326), 5 decimal places",
  accuracy_m: "GPS accuracy in metres",
  altitude_m: "Altitude in metres",
  author_role: "Author role (no personal name)",
  observer_pseudo_id: "Stable pseudonym of author (HMAC-SHA256)",
  validator_pseudo_id: "Stable pseudonym of validator (HMAC-SHA256)",
  species_code: "Internal species code",
  species_scientific_name: "Scientific species name (Latin)",
  species_gbif_key: "GBIF taxonKey when available",
  species_original_code: "Species code before ranger correction",
  species_original_scientific_name: "Scientific name before correction",
  validated_at: "Validation timestamp (ISO-8601)",
  photo_count: "Number of attached photos",
  details: "Optional free-text note (only when includeDetails)",
  location_adjusted: "1 if map pin was manually adjusted",
  crown_condition: "Crown health (phenology)",
  plot_size: "Soil protocol plot size",
  insect_type: "Insect type free text (disturbances)",
  sentinel_tree_id: "Linked sentinel tree id",
  phenology_stage: "Phenological stage 1–4",
  phenology_stage_original: "Stage before correction",
  disturbance_types: "Disturbance types (| separated)",
  disturbance_types_original: "Types before correction",
  severity: "Disturbance severity 1–5",
  severity_original: "Severity before correction",
  affected_area_sqm: "Affected area in m²",
  soil_moss_percentage: "Moss/lichen cover %",
  soil_litter_percentage: "Litter cover %",
  soil_plants_percentage: "Plant cover %",
  soil_bare_percentage: "Bare soil/rock %",
  soil_seedlings_present: "Seedlings present (0/1)",
};

export function fairHeaders(opts: FairExportOptions): string[] {
  const cols: string[] = [...BASE_FIELDS];
  if (opts.full) cols.splice(2, 0, "status");
  if (opts.includeDetails) {
    const i = cols.indexOf("photo_count");
    cols.splice(i + 1, 0, "details");
  }
  return cols;
}

export async function getExportPseudoSalt(): Promise<string> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const fromEnv = (env as { EXPORT_PSEUDO_SALT?: string; AUTH_SECRET?: string })
      .EXPORT_PSEUDO_SALT;
    if (fromEnv && fromEnv.length >= 8) return fromEnv;
    const auth = (env as { AUTH_SECRET?: string }).AUTH_SECRET;
    if (auth && auth.length >= 8) return auth;
  } catch {
    /* not in worker */
  }
  if (process.env.EXPORT_PSEUDO_SALT && process.env.EXPORT_PSEUDO_SALT.length >= 8) {
    return process.env.EXPORT_PSEUDO_SALT;
  }
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 8) {
    return process.env.AUTH_SECRET;
  }
  return "cali-lab-export-dev-salt";
}

/** ADM-01: stable pseudonym from id + secret salt. */
export async function observerPseudoId(
  id: string | undefined,
  salt: string
): Promise<string> {
  if (!id) return "";
  const digest = await sha256Hex(`${salt}|observer|${id}`);
  return `obs_${digest.slice(0, 16)}`;
}

export async function validatorPseudoId(
  id: string | undefined,
  salt: string
): Promise<string> {
  if (!id) return "";
  const digest = await sha256Hex(`${salt}|validator|${id}`);
  return `val_${digest.slice(0, 16)}`;
}

function speciesScientific(id: Species | string | undefined, other?: string): string {
  const def = getSpeciesDef(id);
  if (!def) return "";
  if (def.id === "alta") return other?.trim() || "";
  return def.scientific;
}

function speciesGbif(id: Species | string | undefined): string | number {
  const def = getSpeciesDef(id);
  return def?.gbifTaxonKey ?? "";
}

export function filterForFairExport(
  list: Observation[],
  opts: FairExportOptions
): Observation[] {
  // Sandbox demo observations never enter FAIR / public exports.
  const official = list.filter((o) => !o.isDemo);
  if (opts.full) return official;
  return official.filter((o) => o.status === "aprobat");
}

export async function fairRecord(
  o: Observation,
  opts: FairExportOptions,
  salt: string
): Promise<Record<string, string | number>> {
  const orig = o.originalFields;
  const observer = await observerPseudoId(o.authorId, salt);
  const validator = await validatorPseudoId(o.validatorId, salt);

  const rec: Record<string, string | number> = {
    code: o.code,
    module: o.module,
    created_at: o.createdAt,
    capture_at: o.location.capturedAt,
    latitude: o.location.latitude,
    longitude: o.location.longitude,
    accuracy_m: o.location.accuracy ?? "",
    altitude_m: o.location.altitude ?? "",
    author_role: o.authorRole,
    observer_pseudo_id: observer,
    validator_pseudo_id: validator,
    species_code: o.species ?? "",
    species_scientific_name: speciesScientific(o.species, o.speciesOther),
    species_gbif_key: speciesGbif(o.species),
    species_original_code: orig?.species ?? "",
    species_original_scientific_name: speciesScientific(
      orig?.species,
      orig?.speciesOther
    ),
    validated_at: o.validatedAt ?? "",
    photo_count: o.photos?.length ?? 0,
    location_adjusted: o.locationAdjusted ? "1" : "0",
    crown_condition: "",
    plot_size: "",
    insect_type: "",
    sentinel_tree_id: o.sentinelTreeId ?? "",
    phenology_stage: "",
    phenology_stage_original: "",
    disturbance_types: "",
    disturbance_types_original: "",
    severity: "",
    severity_original: "",
    affected_area_sqm: "",
    soil_moss_percentage: "",
    soil_litter_percentage: "",
    soil_plants_percentage: "",
    soil_bare_percentage: "",
    soil_seedlings_present: "",
  };

  if (opts.full) rec.status = o.status;
  if (opts.includeDetails) rec.details = o.details ?? "";

  if (o.module === "fenologie") {
    rec.phenology_stage = o.stage;
    rec.phenology_stage_original = orig?.stage ?? "";
    rec.crown_condition = o.crownCondition ?? "";
  } else if (o.module === "perturbari") {
    rec.disturbance_types = o.disturbanceTypes.join("|");
    rec.disturbance_types_original = (orig?.disturbanceTypes ?? []).join("|");
    rec.severity = o.severity;
    rec.severity_original = orig?.severity ?? "";
    rec.affected_area_sqm = o.affectedAreaSqm;
    rec.insect_type = o.insectType ?? "";
  } else if (o.module === "sol") {
    rec.plot_size = o.plotSize ?? "1x1m";
    rec.soil_moss_percentage = o.mossPct;
    rec.soil_litter_percentage = o.litterPct;
    rec.soil_plants_percentage = o.plantsPct;
    rec.soil_bare_percentage = o.barePct;
    rec.soil_seedlings_present = o.seedlingsPresent ? "1" : "0";
  }

  return rec;
}

export async function buildFairCsv(
  observations: Observation[],
  opts: FairExportOptions,
  salt: string
): Promise<string> {
  const headers = fairHeaders(opts);
  const rows = await Promise.all(
    filterForFairExport(observations, opts).map((o) => fairRecord(o, opts, salt))
  );
  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h] ?? "")).join(";")),
  ];
  return "\uFEFF" + lines.join("\n");
}

/** ADM-04: GeoJSON properties mirror CSV scientific fields (no person names). */
export async function buildFairGeoJson(
  observations: Observation[],
  opts: FairExportOptions,
  salt: string
): Promise<{
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: Record<string, string | number>;
  }>;
}> {
  const list = filterForFairExport(observations, opts);
  const features = await Promise.all(
    list.map(async (o) => {
      const props = await fairRecord(o, opts, salt);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [o.location.longitude, o.location.latitude] as [
            number,
            number,
          ],
        },
        properties: props,
      };
    })
  );
  return { type: "FeatureCollection", features };
}

export function buildDatapackage(
  opts: FairExportOptions,
  rowCount: number,
  exportedAt: string
): Record<string, unknown> {
  const fields = fairHeaders(opts).map((name) => ({
    name,
    description: FIELD_DESCRIPTIONS[name] ?? name,
  }));
  return {
    name: "cali-lab-fair-export",
    title: `${APP_FULL_NAME} FAIR observations export`,
    description:
      "Anonymised scientific forest observations for Climate-Smart Forestry / ForestWard Observatory.",
    version: GDPR_VERSION,
    created: exportedAt,
    licenses: [
      {
        name: "CC-BY-4.0",
        path: "https://creativecommons.org/licenses/by/4.0/",
        title: "Creative Commons Attribution 4.0 International",
      },
    ],
    sources: [
      {
        title: "CALI-LAB",
        path: "https://cali-lab.app",
      },
      {
        title:
          "ISV Suceava & APNC — Grant Agreement G-07-2025-2 (pilot partnership)",
      },
    ],
    spatial: {
      crs: "EPSG:4326",
      coordinateSystem: "WGS 84",
    },
    keywords: [
      "phenology",
      "forest disturbances",
      "soil cover",
      "citizen science",
      "FAIR",
    ],
    resources: [
      {
        name: "observations",
        path: "observations.csv",
        format: "csv",
        mediatype: "text/csv",
        encoding: "utf-8",
        dialect: { delimiter: ";", header: true },
        schema: { fields },
        bytes: null,
        rowCount,
      },
      {
        name: "observations-geojson",
        path: "observations.geojson",
        format: "geojson",
        mediatype: "application/geo+json",
        schema: { fields },
      },
    ],
    contributors: [
      { title: "ISV Suceava", role: "author" },
      { title: "APNC", role: "contributor" },
    ],
    exportOptions: {
      full: opts.full,
      includeDetails: opts.includeDetails,
      defaultFilter: opts.full ? "all_statuses" : "approved_only",
    },
  };
}

export function buildReadme(
  opts: FairExportOptions,
  rowCount: number,
  exportedAt: string
): string {
  return [
    `# ${APP_FULL_NAME} FAIR export`,
    "",
    `- **Licence:** CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)`,
    `- **Source:** CALI-LAB (https://cali-lab.app); ISV Suceava & APNC; Grant Agreement G-07-2025-2`,
    `- **Version:** ${GDPR_VERSION}`,
    `- **Exported at:** ${exportedAt}`,
    `- **Coordinate system:** EPSG:4326 (WGS 84)`,
    `- **Rows:** ${rowCount}`,
    `- **Filter:** ${opts.full ? "all statuses (full export)" : "approved only"}`,
    `- **Free text (details):** ${opts.includeDetails ? "included" : "excluded"}`,
    "",
    "Person names are not included. Observer and validator identifiers are stable pseudonyms derived with a server-side secret salt.",
    "",
    "See `datapackage.json` for per-column descriptions.",
    "",
  ].join("\n");
}

export async function buildFairZip(
  observations: Observation[],
  opts: FairExportOptions,
  salt: string
): Promise<Uint8Array> {
  const filtered = filterForFairExport(observations, opts);
  const exportedAt = new Date().toISOString();
  const csv = await buildFairCsv(observations, opts, salt);
  const geojson = await buildFairGeoJson(observations, opts, salt);
  const datapackage = buildDatapackage(opts, filtered.length, exportedAt);
  const readme = buildReadme(opts, filtered.length, exportedAt);

  return zipSync({
    "observations.csv": strToU8(csv),
    "observations.geojson": strToU8(JSON.stringify(geojson, null, 2)),
    "datapackage.json": strToU8(JSON.stringify(datapackage, null, 2)),
    "README.md": strToU8(readme),
  });
}
