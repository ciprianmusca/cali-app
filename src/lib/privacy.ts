import type { Observation, UserRole } from "@/lib/types";

/** Public labels used when full names must not be exposed. */
export const PUBLIC_ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrator",
  ranger: "Ranger",
  profesor: "Profesor",
  rezident: "Rezident",
  turist: "Turist",
  elev: "Elev",
};

/** Pseudonym for deleted accounts (ADM-06). */
export const DELETED_USER_LABEL = "Utilizator șters";

export function canSeeFullNames(role?: UserRole | null): boolean {
  return role === "admin" || role === "ranger";
}

export function publicRoleLabel(role: UserRole): string {
  return PUBLIC_ROLE_LABEL[role] ?? "Utilizator";
}

/**
 * Strip person names for unauthenticated visitors and field roles
 * (turist / rezident / elev). Admin and ranger keep full names.
 */
export function maskObservationNames(
  obs: Observation,
  viewerRole?: UserRole | null
): Observation {
  if (canSeeFullNames(viewerRole)) return obs;

  return {
    ...obs,
    authorName: publicRoleLabel(obs.authorRole),
    validatorName: obs.validatorName
      ? PUBLIC_ROLE_LABEL.ranger
      : undefined,
  };
}

export function maskObservations(
  list: Observation[],
  viewerRole?: UserRole | null
): Observation[] {
  if (canSeeFullNames(viewerRole)) return list;
  return list.map((o) => maskObservationNames(o, viewerRole));
}
