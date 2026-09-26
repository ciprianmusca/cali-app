"use client";

import { useMemo, useState } from "react";
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
import { ModuleBadge, StatusBadge } from "@/components/observations/badges";
import { ObservationThumb } from "@/components/observations/observation-thumb";
import { useCaliStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import type { ObservationModule, UserRole } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey, roleKey } from "@/lib/i18n/labels";

const MODULES: ObservationModule[] = ["fenologie", "perturbari", "sol"];
const AUTHOR_ROLES: UserRole[] = ["turist", "rezident", "elev", "ranger"];

function ValidationQueue() {
  const { t } = useI18n();
  const observations = useCaliStore((s) => s.observations);
  const validateObservation = useCaliStore((s) => s.validateObservation);
  const [module, setModule] = useState<ObservationModule | "all">("all");
  const [authorRole, setAuthorRole] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);

  const pending = useMemo(
    () =>
      observations.filter((o) => {
        if (o.status !== "in_asteptare") return false;
        if (module !== "all" && o.module !== module) return false;
        if (authorRole !== "all" && o.authorRole !== authorRole) return false;
        return true;
      }),
    [observations, module, authorRole]
  );

  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  };

  const approveBatch = () => {
    selected.forEach((id) => {
      validateObservation(id, "aprobat", t("val.batchComment"));
    });
    setSelected([]);
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
        <Button disabled={!selected.length} onClick={approveBatch}>
          {t("val.approveSelected", { count: selected.length })}
        </Button>
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

      <div className="mt-6 divide-y rounded-lg border bg-card/80">
        {pending.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("val.empty")}</p>
        ) : (
          pending.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
            >
              <input
                type="checkbox"
                className="size-4"
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
                aria-label={`${t("val.open")} ${o.code}`}
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
          ))
        )}
      </div>
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
