import type { Observation, User, UserRole } from "@/lib/types";
import { maskObservationNames } from "@/lib/privacy";
import { slimObservationPhotos } from "@/lib/photos";
import { canValidateObservations } from "@/lib/capabilities";

export type Viewer =
  | (Pick<User, "id" | "role"> & {
      canValidateObservations?: boolean;
      isDemo?: boolean;
    })
  | null;

/**
 * Official vs sandbox lanes never mix:
 * - demo viewer → only isDemo observations
 * - official / public → only non-demo observations
 */
export function sameDemoLane(
  obs: Observation,
  viewer: Viewer
): boolean {
  const obsDemo = Boolean(obs.isDemo);
  const viewerDemo = Boolean(viewer?.isDemo);
  return obsDemo === viewerDemo;
}

/**
 * Single server-side visibility rule (ROL-05 / SEC-04):
 * - visitor (null): approved only (official lane)
 * - turist / rezident / elev: approved + own (any status)
 * - admin / ranger with validation flag: all in their lane
 * - ranger without validation flag: approved + own (field)
 * - profesor: approved + own + observations on school activities
 *   (any status — classroom work does not require ranger approval).
 *   When `teacherActivityIds` is provided (server), only those activities;
 *   when omitted (client after bootstrap), any activity-linked row already
 *   in the store is treated as visible.
 *
 * Demo sandbox accounts never see official data and vice versa.
 */
export function canViewObservation(
  obs: Observation,
  viewer: Viewer,
  teacherActivityIds?: ReadonlySet<string>
): boolean {
  if (!sameDemoLane(obs, viewer)) return false;
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
