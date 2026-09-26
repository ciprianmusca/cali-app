import type { MsgKey } from "./store";
import type {
  CrownCondition,
  DisturbanceType,
  PhenologyStage,
  Species,
  UserRole,
  ObservationModule,
  ObservationStatus,
  ValidationDecisionKind,
} from "@/lib/types";
import { isConifer } from "@/lib/species";

export function roleKey(role: UserRole): MsgKey {
  return `role.${role}` as MsgKey;
}

export function moduleKey(module: ObservationModule): MsgKey {
  return `module.${module}` as MsgKey;
}

export function statusKey(status: ObservationStatus): MsgKey {
  return `status.${status}` as MsgKey;
}

export function decisionKey(kind: ValidationDecisionKind): MsgKey {
  return `decision.${kind}` as MsgKey;
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

/** DATA-03: different stage descriptions for conifers vs broadleaves. */
export function phenStageDescKey(
  stage: PhenologyStage,
  species?: Species | string
): MsgKey {
  const kind = isConifer(species) ? "conifer" : "deciduous";
  return `phen.stage${stage}desc.${kind}` as MsgKey;
}

export function crownKey(c: CrownCondition): MsgKey {
  return `phen.crown.${c}` as MsgKey;
}

export const PHENOLOGY_COLORS: Record<PhenologyStage, string> = {
  1: "#64748b",
  2: "#84cc16",
  3: "#22c55e",
  4: "#166534",
};
