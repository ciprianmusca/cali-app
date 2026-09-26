import type { MsgKey } from "./store";
import type {
  DisturbanceType,
  PhenologyStage,
  Species,
  UserRole,
  ObservationModule,
  ObservationStatus,
} from "@/lib/types";

export function roleKey(role: UserRole): MsgKey {
  return `role.${role}` as MsgKey;
}

export function moduleKey(module: ObservationModule): MsgKey {
  return `module.${module}` as MsgKey;
}

export function statusKey(status: ObservationStatus): MsgKey {
  return `status.${status}` as MsgKey;
}

export function speciesKey(species: Species): MsgKey {
  return `sp.${species}` as MsgKey;
}

export function disturbanceKey(type: DisturbanceType): MsgKey {
  return `dist.${type}` as MsgKey;
}

export function severityKey(n: 1 | 2 | 3 | 4 | 5): MsgKey {
  return `dist.sev${n}` as MsgKey;
}

export function phenStageLabelKey(stage: PhenologyStage): MsgKey {
  return `phen.stage${stage}` as MsgKey;
}

export function phenStageDescKey(stage: PhenologyStage): MsgKey {
  return `phen.stage${stage}desc` as MsgKey;
}

export const PHENOLOGY_COLORS: Record<PhenologyStage, string> = {
  1: "#64748b",
  2: "#84cc16",
  3: "#22c55e",
  4: "#166534",
  5: "#ca8a04",
};
