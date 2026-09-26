"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ModuleBadge,
  StatusBadge,
  SyncBadge,
} from "@/components/observations/badges";
import { ObservationThumb } from "@/components/observations/observation-thumb";
import { DirectionsButton } from "@/components/observations/directions-button";
import { useCaliStore } from "@/lib/store";
import { formatCoord, formatDateTime } from "@/lib/format";
import type {
  FieldActivity,
  ObservationModule,
  ObservationStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey, statusKey } from "@/lib/i18n/labels";
import { filterObservationsForViewer } from "@/lib/visibility";
import { sortByCreatedDesc } from "@/lib/validation";

const MODULES: ObservationModule[] = ["fenologie", "perturbari", "sol"];
const STATUSES: ObservationStatus[] = [
  "in_asteptare",
  "aprobat",
  "respins",
  "clarificare",
];

function ObservationsList() {
  const { t } = useI18n();
  const observations = useCaliStore((s) => s.observations);
  const user = useCaliStore((s) => s.currentUser());
  const [module, setModule] = useState<ObservationModule | "all">("all");
  const [status, setStatus] = useState<ObservationStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [activities, setActivities] = useState<FieldActivity[]>([]);

  useEffect(() => {
    void fetch("/api/activities", { credentials: "include" })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ activities?: FieldActivity[] }>)
          : null
      )
      .then((d) => setActivities(d?.activities ?? []))
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const viewer = user ? { id: user.id, role: user.role } : null;
    return sortByCreatedDesc(
      filterObservationsForViewer(observations, viewer).filter((o) => {
        if (module !== "all" && o.module !== module) return false;
        if (status !== "all" && o.status !== status) return false;
        if (mineOnly && o.authorId !== user?.id) return false;
        if (from && new Date(o.createdAt) < new Date(from)) return false;
        if (to && new Date(o.createdAt) > new Date(to + "T23:59:59"))
          return false;
        return true;
      })
    );
  }, [observations, module, status, from, to, mineOnly, user]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest">{t("obs.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("obs.listSub")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/observatii/nou/fenologie"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            {t("obs.addPhen")}
          </Link>
          <Link
            href="/observatii/nou/perturbari"
            className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
          >
            {t("obs.addDist")}
          </Link>
          <Link
            href="/observatii/nou/sol"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            {t("obs.addSoil")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-lg border bg-card/70 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label>{t("obs.filterModule")}</Label>
          <Select
            value={module}
            onValueChange={(v) => setModule((v ?? "all") as typeof module)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {module === "all" ? t("obs.all") : t(moduleKey(module))}
              </SelectValue>
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
            onValueChange={(v) => setStatus((v ?? "all") as typeof status)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {status === "all" ? t("obs.all") : t(statusKey(status))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("obs.all")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(statusKey(s))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("obs.filterFrom")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t("obs.filterTo")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant={mineOnly ? "default" : "outline"}
            className="w-full"
            onClick={() => setMineOnly((v) => !v)}
          >
            {t("obs.mineOnly")}
          </Button>
        </div>
      </div>

      <div className="mt-6 divide-y rounded-lg border bg-card/80">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("obs.empty")}</p>
        ) : (
          filtered.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
            >
              <ObservationThumb
                module={o.module}
                src={o.photos[0]}
                className="relative h-16 w-24 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/observatii/${o.id}`}
                    className="font-medium hover:underline"
                  >
                    {formatDateTime(o.createdAt)}
                  </Link>
                  <StatusBadge status={o.status} />
                  <ModuleBadge module={o.module} />
                  <SyncBadge status={o.syncStatus} />
                  {o.isSentinelTree ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-800">
                      <Shield className="size-3" /> {t("obs.sentinel")}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm">
                  <span className="font-medium">{o.code}</span>
                  {o.details ? (
                    <span className="text-muted-foreground"> — {o.details}</span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCoord(o.location.latitude)},{" "}
                  {formatCoord(o.location.longitude)}
                  {o.location.accuracy != null
                    ? ` · ±${o.location.accuracy} m`
                    : ""}
                </div>
              </div>
              <DirectionsButton
                observation={o}
                activity={
                  activities.find((a) => a.id === o.activityId) ?? null
                }
                variant="link"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ObservatiiPage() {
  return (
    <AuthGate>
      <ObservationsList />
    </AuthGate>
  );
}
