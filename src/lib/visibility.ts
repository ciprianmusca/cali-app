import type { Observation, User, UserRole } from "@/lib/types";
import { maskObservationNames } from "@/lib/privacy";
import { slimObservationPhotos } from "@/lib/photos";
import { canValidateObservations } from "@/lib/capabilities";

export type Viewer =
  | (Pick<User, "id" | "role"> & {
      canValidateObservations?: boolean;
    })
  | null;

/**
 * Single server-side visibility rule (ROL-05 / SEC-04):
 * - visitor (null): approved only
 * - turist / rezident / elev: approved + own (any status)
 * - admin / ranger with validation flag: all
 * - ranger without validation flag: approved + own (field)
 * - profesor: approved + own + observations on school activities
 *   (any status — classroom work does not require ranger approval).
 *   When `teacherActivityIds` is provided (server), only those activities;
 *   when omitted (client after bootstrap), any activity-linked row already
 *   in the store is treated as visible.
 */
export function canViewObservation(
  obs: Observation,
  viewer: Viewer,
  teacherActivityIds?: ReadonlySet<string>
): boolean {
  if (!viewer) return obs.status === "aprobat";
  if (viewer.role === "admin" || canValidateObservations(viewer)) return true;
  if (viewer.role === "profesor" && obs.activityId) {
    if (!teacherActivityIds || teacherActivityIds.has(obs.activityId)) {
      return true;
    }
  }
  // Field users (and rangers without validation flag): approved + own.
  return obs.status === "aprobat" || obs.authorId === viewer.id;
}

export function filterObservationsForViewer(
  list: Observation[],
  viewer: Viewer,
  teacherActivityIds?: ReadonlySet<string>
): Observation[] {
  return list.filter((o) =>
    canViewObservation(o, viewer, teacherActivityIds)
  );
}

export function isStaffRole(role?: UserRole | null): boolean {
  return role === "admin" || role === "ranger";
}

/** Filter → mask names → slim photo refs for API responses. */
export function prepareObservationsForApi(
  list: Observation[],
  viewer: Viewer,
  teacherActivityIds?: ReadonlySet<string>
): Observation[] {
  const role = viewer?.role ?? null;
  return filterObservationsForViewer(list, viewer, teacherActivityIds).map(
    (o) => slimObservationPhotos(maskObservationNames(o, role))
  );
}
