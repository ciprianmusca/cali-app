import type {
  FenologieObservation,
  Observation,
  ObservationFieldSnapshot,
  PerturbariObservation,
  ValidationDecision,
  ValidationDecisionKind,
  ObservationStatus,
} from "@/lib/types";

export function snapshotFields(obs: Observation): ObservationFieldSnapshot {
  const base: ObservationFieldSnapshot = {
    species: obs.species,
    speciesOther: obs.speciesOther,
    details: obs.details,
  };
  if (obs.module === "fenologie") {
    return {
      ...base,
      stage: obs.stage,
      crownCondition: obs.crownCondition,
    };
  }
  if (obs.module === "perturbari") {
    return {
      ...base,
      disturbanceTypes: obs.disturbanceTypes,
      severity: obs.severity,
      affectedAreaSqm: obs.affectedAreaSqm,
      insectType: obs.insectType,
    };
  }
  return base;
}

export function applyCorrections(
  obs: Observation,
  corrections: ObservationFieldSnapshot
): Observation {
  const next = { ...obs } as Observation;
  if (corrections.species) next.species = corrections.species;
  if (corrections.speciesOther !== undefined) {
    next.speciesOther = corrections.speciesOther;
  }
  if (corrections.details !== undefined) next.details = corrections.details;

  if (next.module === "fenologie") {
    const fen = next as FenologieObservation;
    if (corrections.stage) fen.stage = corrections.stage;
    if (corrections.crownCondition) fen.crownCondition = corrections.crownCondition;
    return fen;
  }
  if (next.module === "perturbari") {
    const dist = next as PerturbariObservation;
    if (corrections.disturbanceTypes) {
      dist.disturbanceTypes = corrections.disturbanceTypes;
    }
    if (corrections.severity) dist.severity = corrections.severity;
    if (corrections.affectedAreaSqm != null) {
      dist.affectedAreaSqm = corrections.affectedAreaSqm;
    }
    if (corrections.insectType !== undefined) {
      dist.insectType = corrections.insectType;
    }
    return dist;
  }
  return next;
}

export function statusForDecision(
  kind: ValidationDecisionKind
): ObservationStatus {
  if (kind === "aprobat" || kind === "aprobat_cu_corectii") return "aprobat";
  if (kind === "respins") return "respins";
  if (kind === "cere_clarificari") return "clarificare";
  if (kind === "reopen" || kind === "clarificare_raspuns") return "in_asteptare";
  return "in_asteptare";
}

export function appendDecision(
  obs: Observation,
  decision: ValidationDecision
): Observation {
  return {
    ...obs,
    validationHistory: [...(obs.validationHistory ?? []), decision],
  };
}

export function sortByCreatedDesc<T extends { createdAt: string }>(
  list: T[]
): T[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
