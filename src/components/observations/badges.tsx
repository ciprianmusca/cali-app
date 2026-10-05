"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey, statusKey } from "@/lib/i18n/labels";
import type {
  ClassroomStatus,
  ObservationModule,
  ObservationStatus,
  SyncStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ObservationStatus }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "aprobat" &&
          "border-emerald-700/30 bg-emerald-50 text-emerald-800",
        status === "respins" && "border-red-700/30 bg-red-50 text-red-800",
        status === "in_asteptare" &&
          "border-amber-700/30 bg-amber-50 text-amber-900",
        status === "clarificare" && "border-sky-700/30 bg-sky-50 text-sky-900"
      )}
    >
      {t(statusKey(status))}
    </Badge>
  );
}

export function ClassroomBadge({
  status,
}: {
  status?: ClassroomStatus | null;
}) {
  const { t } = useI18n();
  const s = status ?? "nediscutat";
  return (
    <Badge
      variant="outline"
      className={cn(
        s === "admis" && "border-emerald-700/30 bg-emerald-50 text-emerald-800",
        s === "respins" && "border-red-700/30 bg-red-50 text-red-800",
        s === "nediscutat" && "border-amber-700/30 bg-amber-50 text-amber-900"
      )}
    >
      {t(`class.status.${s}`)}
    </Badge>
  );
}

export function ModuleBadge({ module }: { module: ObservationModule }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="secondary"
      className={cn(
        module === "fenologie" && "bg-emerald-100 text-emerald-900",
        module === "perturbari" && "bg-orange-100 text-orange-900",
        module === "sol" && "bg-stone-200 text-stone-800"
      )}
    >
      {t(moduleKey(module))}
    </Badge>
  );
}

export function SyncBadge({ status }: { status?: SyncStatus }) {
  const { t } = useI18n();
  if (!status || status === "synced") return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "pending" && "border-sky-700/30 bg-sky-50 text-sky-900",
        status === "error" && "border-red-700/30 bg-red-50 text-red-800"
      )}
    >
      {status === "error"
        ? t("offline.statusError")
        : t("offline.statusPending")}
    </Badge>
  );
}
