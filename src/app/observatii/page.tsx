"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Shield } from "lucide-react";
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
import { ModuleBadge, StatusBadge } from "@/components/observations/badges";
import { useCaliStore } from "@/lib/store";
import {
  formatCoord,
  formatDateTime,
  mapsDirectionsUrl,
} from "@/lib/format";
import type { ObservationModule, ObservationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function ObservationsList() {
  const observations = useCaliStore((s) => s.observations);
  const user = useCaliStore((s) => s.currentUser());
  const [module, setModule] = useState<ObservationModule | "all">("all");
  const [status, setStatus] = useState<ObservationStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mineOnly, setMineOnly] = useState(false);

  const filtered = useMemo(() => {
    return observations.filter((o) => {
      if (module !== "all" && o.module !== module) return false;
      if (status !== "all" && o.status !== status) return false;
      if (mineOnly && o.authorId !== user?.id) return false;
      if (from && new Date(o.createdAt) < new Date(from)) return false;
      if (to && new Date(o.createdAt) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [observations, module, status, from, to, mineOnly, user?.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest">Observații</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toate observațiile din sistem. Numele autorilor altor utilizatori
            nu sunt afișate pentru rolurile de teren.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/observatii/nou/fenologie"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + Fenologie
          </Link>
          <Link
            href="/observatii/nou/perturbari"
            className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
          >
            + Perturbări
          </Link>
          <Link
            href="/observatii/nou/sol"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            + Sol
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-lg border bg-card/70 p-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <Label>Stare</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus((v ?? "all") as typeof status)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="in_asteptare">În așteptare</SelectItem>
              <SelectItem value="aprobat">Aprobat</SelectItem>
              <SelectItem value="respins">Respins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>De la</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Până la</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant={mineOnly ? "default" : "outline"}
            className="w-full"
            onClick={() => setMineOnly((v) => !v)}
          >
            Doar ale mele
          </Button>
        </div>
      </div>

      <div className="mt-6 divide-y rounded-lg border bg-card/80">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nicio observație pentru filtrele selectate.
          </p>
        ) : (
          filtered.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.photos[0]}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
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
                  {o.isSentinelTree ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-800">
                      <Shield className="size-3" /> Arbore santinelă
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
              <a
                href={mapsDirectionsUrl(
                  o.location.latitude,
                  o.location.longitude
                )}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "shrink-0"
                )}
              >
                <ExternalLink className="size-3.5" />
                Direcționează-mă
              </a>
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
