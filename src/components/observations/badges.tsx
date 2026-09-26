import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, MODULE_LABELS } from "@/lib/constants";
import type { ObservationModule, ObservationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ObservationStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "aprobat" && "border-emerald-700/30 bg-emerald-50 text-emerald-800",
        status === "respins" && "border-red-700/30 bg-red-50 text-red-800",
        status === "in_asteptare" && "border-amber-700/30 bg-amber-50 text-amber-900"
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function ModuleBadge({ module }: { module: ObservationModule }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        module === "fenologie" && "bg-emerald-100 text-emerald-900",
        module === "perturbari" && "bg-orange-100 text-orange-900",
        module === "sol" && "bg-stone-200 text-stone-800"
      )}
    >
      {MODULE_LABELS[module]}
    </Badge>
  );
}
