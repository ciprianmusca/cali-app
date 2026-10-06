"use client";

import { useMemo, useState } from "react";
import { ObservationsMap } from "@/components/map/observations-map";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCaliStore } from "@/lib/store";
import type { ObservationModule, ObservationStatus } from "@/lib/types";
import { MODULE_COLORS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey, statusKey } from "@/lib/i18n/labels";
import { filterObservationsForViewer } from "@/lib/visibility";

const MODULES: ObservationModule[] = ["fenologie", "perturbari", "sol"];

export default function HartaPage() {
  const { t } = useI18n();
  const observations = useCaliStore((s) => s.observations);
  const user = useCaliStore((s) => s.currentUser());
  const hydrated = useCaliStore((s) => s.hydrated);
  const [module, setModule] = useState<ObservationModule | "all">("all");
  /** ROL-12: ranger default „În așteptare”; public = approved; others = all. */
  const [statusOverride, setStatusOverride] = useState<
    ObservationStatus | "all" | null
  >(null);
  const status: ObservationStatus | "all" =
    statusOverride ??
    (!user
      ? "aprobat"
      : user.role === "admin" || user.canValidateObservations === true
        ? "in_asteptare"
        : "all");

  const moduleLabel =
    module === "all" ? t("obs.all") : t(moduleKey(module));
  const statusLabel =
    status === "all" ? t("obs.all") : t(statusKey(status));

  const filtered = useMemo(() => {
    const viewer = user
      ? {
          id: user.id,
          role: user.role,
          canValidateObservations: user.canValidateObservations,
        }
      : null;
    let list = filterObservationsForViewer(observations, viewer);
    if (module !== "all") list = list.filter((o) => o.module === module);
    if (status !== "all") list = list.filter((o) => o.status === status);
    return list;
  }, [observations, module, status, user]);

  const exportGeoJSON = () => {
    window.location.href = "/api/export?format=geojson";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest">{t("map.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t("map.sub")}
            {user ? t("map.subAuth") : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={exportGeoJSON}
            className="rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted"
          >
            {t("map.export")}
          </button>
          <p className="max-w-xs text-right text-[11px] leading-snug text-muted-foreground">
            {t("map.exportLicense")}{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              CC BY 4.0
            </a>
            . {t("map.exportCite")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("obs.filterModule")}</Label>
          <Select
            value={module}
            onValueChange={(v) => setModule((v ?? "all") as typeof module)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{moduleLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("obs.all")}</SelectItem>
              {MODULES.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(moduleKey(m))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("obs.filterStatus")}</Label>
          <Select
            value={status}
            onValueChange={(v) =>
              setStatusOverride((v ?? "all") as ObservationStatus | "all")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue>{statusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("obs.all")}</SelectItem>
              <SelectItem value="aprobat">{t(statusKey("aprobat"))}</SelectItem>
              {!user ? null : (
                <>
                  <SelectItem value="in_asteptare">
                    {t(statusKey("in_asteptare"))}
                  </SelectItem>
                  <SelectItem value="respins">
                    {t(statusKey("respins"))}
                  </SelectItem>
                  <SelectItem value="clarificare">
                    {t(statusKey("clarificare"))}
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {MODULES.map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: MODULE_COLORS[m] }}
            />
            {t(moduleKey(m))}
          </span>
        ))}
      </div>

      <div className="mt-4">
        {hydrated ? (
          <ObservationsMap observations={filtered} height={520} />
        ) : (
          <div className="flex h-[520px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
            {t("map.loading")}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {filtered.length} {t("map.points")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("map.clusterHint")}</p>
    </div>
  );
}
