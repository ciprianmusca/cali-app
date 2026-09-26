"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModuleBadge, StatusBadge } from "@/components/observations/badges";
import { ObservationThumb } from "@/components/observations/observation-thumb";
import { ObservationsMap } from "@/components/map/observations-map";
import { useCaliStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import type { Observation, ObservationModule, UserRole } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  disturbanceKey,
  moduleKey,
  phenStageLabelKey,
  roleKey,
  severityKey,
} from "@/lib/i18n/labels";
import { speciesDisplayLabel } from "@/lib/species";
import { sortByCreatedDesc } from "@/lib/validation";
import { cn } from "@/lib/utils";

const MODULES: ObservationModule[] = ["fenologie", "perturbari", "sol"];
const AUTHOR_ROLES: UserRole[] = ["turist", "rezident", "elev", "ranger"];

function queueMeta(
  o: Observation,
  label: (key: string) => string,
  loc: "ro" | "en"
): string {
  const parts: string[] = [];
  if (o.species) {
    parts.push(speciesDisplayLabel(o.species, loc, o.speciesOther));
  }
  if (o.module === "fenologie") {
    parts.push(`${o.stage} — ${label(phenStageLabelKey(o.stage))}`);
  }
  if (o.module === "perturbari") {
    parts.push(
      o.disturbanceTypes.map((d) => label(disturbanceKey(d))).join(", ")
    );
    parts.push(`${o.severity} — ${label(severityKey(o.severity))}`);
  }
  return parts.filter(Boolean).join(" · ");
}

function ValidationQueue() {
  const { t, locale } = useI18n();
  const loc = locale === "en" ? "en" : "ro";
  const observations = useCaliStore((s) => s.observations);
  const validateObservation = useCaliStore((s) => s.validateObservation);
  const undoValidationBatch = useCaliStore((s) => s.undoValidationBatch);
  const [module, setModule] = useState<ObservationModule | "all">("all");
  const [authorRole, setAuthorRole] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<"list" | "map">("list");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [undoVisible, setUndoVisible] = useState(false);

  const pending = useMemo(
    () =>
      sortByCreatedDesc(
        observations.filter((o) => {
          if (o.status !== "in_asteptare") return false;
          if (module !== "all" && o.module !== module) return false;
          if (authorRole !== "all" && o.authorRole !== authorRole) return false;
          return true;
        })
      ),
    [observations, module, authorRole]
  );

  useEffect(() => {
    if (!undoVisible) return;
    const timer = window.setTimeout(() => setUndoVisible(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [undoVisible, undoCount]);

  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  const runBatchApprove = () => {
    const ids = [...selected];
    ids.forEach((id) => {
      validateObservation(id, "aprobat", t("val.batchComment"));
    });
    setSelected([]);
    setConfirmOpen(false);
    setUndoCount(ids.length);
    setUndoVisible(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest">{t("val.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("val.queue", { count: pending.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-card p-0.5">
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              onClick={() => setView("list")}
            >
              {t("val.viewList")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                view === "map" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              onClick={() => setView("map")}
            >
              {t("val.viewMap")}
            </button>
          </div>
          <Button
            disabled={!selected.length}
            onClick={() => setConfirmOpen(true)}
          >
            {t("val.approveSelected", { count: selected.length })}
          </Button>
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
              <SelectValue />
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
          <Label>{t("val.authorRole")}</Label>
          <Select
            value={authorRole}
            onValueChange={(v) => setAuthorRole(v ?? "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("obs.all")}</SelectItem>
              {AUTHOR_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(roleKey(r))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-6">
          {pending.length === 0 ? (
            <p className="rounded-lg border bg-card/80 p-6 text-sm text-muted-foreground">
              {t("val.empty")}
            </p>
          ) : (
            <ObservationsMap observations={pending} height={480} />
          )}
        </div>
      ) : (
        <div className="mt-6 divide-y rounded-lg border bg-card/80">
          {pending.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("val.empty")}</p>
          ) : (
            pending.map((o) => {
              const meta = queueMeta(o, (k) => t(k as Parameters<typeof t>[0]), loc);
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selected.includes(o.id)}
                    onChange={() => toggle(o.id)}
                    aria-label={`${t("val.select")} ${o.code}`}
                  />
                  <ObservationThumb
                    module={o.module}
                    src={o.photos[0]}
                    className="h-14 w-20 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/observatii/${o.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatDateTime(o.createdAt)}
                      </Link>
                      <StatusBadge status={o.status} />
                      <ModuleBadge module={o.module} />
                    </div>
                    <div className="text-sm">
                      {o.code} · {o.authorName} ({t(roleKey(o.authorRole))})
                    </div>
                    {meta ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {meta}
                      </div>
                    ) : null}
                    {o.details ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {o.details}
                      </div>
                    ) : null}
                  </div>
                  <Link
                    href={`/observatii/${o.id}`}
                    className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] hover:bg-muted"
                  >
                    {t("val.open")}
                  </Link>
                </div>
              );
            })
          )}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("val.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("val.confirmBatch", { count: selected.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("val.confirmCancel")}
            </Button>
            <Button onClick={runBatchApprove}>{t("val.confirmOk")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {undoVisible ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg"
        >
          <span>{t("val.undoToast", { count: undoCount })}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const res = undoValidationBatch();
              if (res.ok) setUndoVisible(false);
            }}
          >
            {t("val.undo")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function ValidarePage() {
  return (
    <AuthGate roles={["ranger", "admin"]}>
      <ValidationQueue />
    </AuthGate>
  );
}
