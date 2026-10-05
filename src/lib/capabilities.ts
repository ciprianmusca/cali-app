import type { User, UserRole } from "@/lib/types";

/** Minimal user shape for capability checks (server User or client PublicUser). */
export type CapUser = {
  role: UserRole;
  canManageRegistrations?: boolean;
  canTeachSchool?: boolean;
};

/** Admin, or ranger with the registrations flag. */
export function canManageRegistrations(
  user: CapUser | null | undefined
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "ranger" && Boolean(user.canManageRegistrations);
}

/**
 * Full school/lesson powers (create activities, lesson hub, join as teacher).
 * Admin and profesor always; ranger only when the school flag is set.
 */
export function canTeachSchool(user: CapUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "profesor") return true;
  return user.role === "ranger" && Boolean(user.canTeachSchool);
}

/** Clear ranger-only flags when the role is not ranger. */
export function rangerFlagsForRole(
  role: UserRole,
  flags: {
    canManageRegistrations?: boolean;
    canTeachSchool?: boolean;
  }
): Pick<User, "canManageRegistrations" | "canTeachSchool"> {
  if (role !== "ranger") {
    return {
      canManageRegistrations: false,
      canTeachSchool: false,
    };
  }
  return {
    canManageRegistrations: Boolean(flags.canManageRegistrations),
    canTeachSchool: Boolean(flags.canTeachSchool),
  };
}
