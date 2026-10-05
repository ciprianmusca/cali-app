import type { ClassroomStatus, Observation } from "@/lib/types";

/** Effective classroom status (default: not yet discussed). */
export function classroomStatusOf(obs: Observation): ClassroomStatus {
  return obs.classroomStatus ?? "nediscutat";
}
