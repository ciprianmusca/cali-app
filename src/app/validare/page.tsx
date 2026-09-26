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
import { useCaliStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import type { ObservationModule } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";

function ValidationQueue() {
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
      validateObservation(id, "aprobat", "Validare în lot");
    });
    setSelected([]);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest">Validare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Coadă de lucru: {pending.length} observații în așteptare
          </p>
        </div>
        <Button disabled={!selected.length} onClick={approveBatch}>
          Aprobă selecția ({selected.length})
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Modul</Label>
          <Select
            value={module}
            onValueChange={(v) => setModule((v ?? "all") as typeof module)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="fenologie">Fenologie</SelectItem>
              <SelectItem value="perturbari">Perturbări</SelectItem>
              <SelectItem value="sol">Sol</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Rol autor</Label>
          <Select
            value={authorRole}
            onValueChange={(v) => setAuthorRole(v ?? "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="turist">Turist</SelectItem>
              <SelectItem value="rezident">Rezident</SelectItem>
              <SelectItem value="elev">Elev</SelectItem>
              <SelectItem value="ranger">Ranger</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 divide-y rounded-lg border bg-card/80">
        {pending.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nu există observații de validat.
          </p>
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
                aria-label={`Selectează ${o.code}`}
              />
              <div className="h-14 w-20 overflow-hidden rounded bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.photos[0]}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
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
                  {o.code} · {o.authorName} ({ROLE_LABELS[o.authorRole]})
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
                Deschide
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
