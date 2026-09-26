import type {
  CrownCondition,
  FenologieObservation,
  Observation,
  PhenologyStage,
  SolObservation,
} from "@/lib/types";
import { roundCoord } from "@/lib/format";

const GPS_AHEAD_TOLERANCE_MS = 10 * 60 * 1000;

/**
 * Normalize legacy observation shapes (DATA-03, DATA-05, DATA-06, DATA-07).
 * - Phenology stage 5 → stage 4 + crownCondition uscare/decolorare
 * - Ensure crownCondition default
 * - Soil plotSize default 1x1m
 * - Round coords to 5 decimals
 * - Clamp GPS capturedAt if after createdAt (+10 min tolerance)
 */
export function migrateObservation(raw: Observation): Observation {
  let obs = { ...raw } as Observation;

  // Coords → 5 decimals (DATA-06); accuracy kept as-is on location.
  if (obs.location) {
    obs = {
      ...obs,
      location: {
        ...obs.location,
        latitude: roundCoord(obs.location.latitude, 5),
        longitude: roundCoord(obs.location.longitude, 5),
      },
    };
  }

  // GPS time ≤ createdAt + 10 min (DATA-07)
  if (obs.location?.capturedAt && obs.createdAt) {
    const cap = new Date(obs.location.capturedAt).getTime();
    const created = new Date(obs.createdAt).getTime();
    if (
      Number.isFinite(cap) &&
      Number.isFinite(created) &&
      cap > created + GPS_AHEAD_TOLERANCE_MS
    ) {
      obs = {
        ...obs,
        location: {
          ...obs.location,
          capturedAt: new Date(created).toISOString(),
        },
      };
    }
  }

  if (obs.module === "fenologie") {
    const fen = obs as FenologieObservation & { stage: number };
    let stage = fen.stage as number;
    let crown: CrownCondition =
      fen.crownCondition ?? ("sanatoasa" as CrownCondition);

    // Legacy: stage 5 was "Stres" — map to maturity + crown stress.
    if (stage === 5) {
      stage = 4;
      if (!fen.crownCondition || fen.crownCondition === "sanatoasa") {
        crown = "decolorare_puternica";
      }
    }
    if (stage < 1 || stage > 4) stage = 4;

    return {
      ...fen,
      stage: stage as PhenologyStage,
      crownCondition: crown,
      species: fen.species,
    };
  }

  if (obs.module === "sol") {
    const sol = obs as SolObservation;
    return {
      ...sol,
      plotSize: sol.plotSize ?? "1x1m",
    };
  }

  return obs;
}

export function migrateObservationList(list: Observation[]): Observation[] {
  return list.map(migrateObservation);
}

/** Client-side validation before save (DATA-07). */
export function validateGpsNotAfterCreated(
  capturedAt: string,
  createdAt: string
): boolean {
  const cap = new Date(capturedAt).getTime();
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(cap) || !Number.isFinite(created)) return true;
  return cap <= created + GPS_AHEAD_TOLERANCE_MS;
}
