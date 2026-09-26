import type { Observation, User, UserRole } from "@/lib/types";
import { maskObservationNames } from "@/lib/privacy";
import { slimObservationPhotos } from "@/lib/photos";

export type Viewer = Pick<User, "id" | "role"> | null;

/**
 * Single server-side visibility rule (ROL-05 / SEC-04):
 * - visitor (null): approved only
 * - turist / rezident / elev: approved + own (any status)
 * - ranger / admin: all
 */
export function canViewObservation(
  obs: Observation,
  viewer: Viewer
): boolean {
  if (!viewer) return obs.status === "aprobat";
  if (viewer.role === "admin" || viewer.role === "ranger") return true;
  // Field users: approved + own (any status, incl. clarificare / pending).
  return obs.status === "aprobat" || obs.authorId === viewer.id;
}

export function filterObservationsForViewer(
  list: Observation[],
  viewer: Viewer
): Observation[] {
  return list.filter((o) => canViewObservation(o, viewer));
}

export function isStaffRole(role?: UserRole | null): boolean {
  return role === "admin" || role === "ranger";
}

/** Filter → mask names → slim photo refs for API responses. */
export function prepareObservationsForApi(
  list: Observation[],
  viewer: Viewer
): Observation[] {
  const role = viewer?.role ?? null;
  return filterObservationsForViewer(list, viewer).map((o) =>
    slimObservationPhotos(maskObservationNames(o, role))
  );
}
