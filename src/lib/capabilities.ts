import type { User, UserRole } from "@/lib/types";

/** Minimal user shape for capability checks (server User or client PublicUser). */
export type CapUser = {
  role: UserRole;
  canManageUsers?: boolean;
  /** @deprecated alias kept while reading older persisted clients */
  canManageRegistrations?: boolean;
  canValidateObservations?: boolean;
  canTeachSchool?: boolean;
};

/** Admin, or ranger with the users flag (opt-in). */
export function canManageUsers(user: CapUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "ranger") return false;
  return (
    user.canManageUsers === true || user.canManageRegistrations === true
  );
}

/** @deprecated use canManageUsers */
export const canManageRegistrations = canManageUsers;

/**
 * Scientific validation of field observations (Validare queue).
 * Admin always; ranger only when the observations flag is set (opt-in).
 */
export function canValidateObservations(
  user: CapUser | null | undefined
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "ranger" && user.canValidateObservations === true;
}

/**
 * Full school/lesson powers (create activities, lesson hub, join codes).
 * Admin and profesor always; ranger only when the school flag is set (opt-in).
 */
export function canTeachSchool(user: CapUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "profesor") return true;
  return user.role === "ranger" && user.canTeachSchool === true;
}

/** Clear ranger-only flags when the role is not ranger. */
export function rangerFlagsForRole(
  role: UserRole,
  flags: {
    canManageUsers?: boolean;
    canValidateObservations?: boolean;
    canTeachSchool?: boolean;
  }
): Pick<
  User,
  "canManageUsers" | "canValidateObservations" | "canTeachSchool"
> {
  if (role !== "ranger") {
    return {
      canManageUsers: false,
      canValidateObservations: false,
      canTeachSchool: false,
    };
  }
  return {
    canManageUsers: Boolean(flags.canManageUsers),
    canValidateObservations: Boolean(flags.canValidateObservations),
    canTeachSchool: Boolean(flags.canTeachSchool),
  };
}
