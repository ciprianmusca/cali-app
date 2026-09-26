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
import { MODULE_COLORS, MODULE_LABELS } from "@/lib/constants";

export default function HartaPage() {
  const observations = useCaliStore((s) => s.observations);
  const user = useCaliStore((s) => s.currentUser());
  const hydrated = useCaliStore((s) => s.hydrated);
  const [module, setModule] = useState<ObservationModule | "all">("all");
  const [status, setStatus] = useState<ObservationStatus | "all">(
    user ? "all" : "aprobat"
  );

  const filtered = useMemo(() => {
    let list = observations;
    // Public: only approved, rounded already in store coords
    if (!user) {
      list = list.filter((o) => o.status === "aprobat");
    }
    if (module !== "all") list = list.filter((o) => o.module === module);
    if (status !== "all") list = list.filter((o) => o.status === status);
    return list;
  }, [observations, module, status, user]);

  const exportGeoJSON = () => {
    const features = filtered.map((o) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [o.location.longitude, o.location.latitude],
      },
      properties: {
        code: o.code,
        module: o.module,
        status: o.status,
        createdAt: o.createdAt,
        accuracy: o.location.accuracy,
        altitude: o.location.altitude,
        ...(user ? {} : { author: undefined }),
      },
    }));
    const blob = new Blob(
      [JSON.stringify({ type: "FeatureCollection", features }, null, 2)],
      { type: "application/geo+json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cali-observatii.geojson";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest">Hartă</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Toate observațiile pe OpenTopoMap. Public: doar aprobate.
            {user ? " Ranger/admin: toate, coordonate exacte." : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={exportGeoJSON}
          className="rounded-md border bg-card px-3 py-2 text-sm hover:bg-muted"
        >
          Export GeoJSON
        </button>
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
              <SelectItem value="aprobat">Aprobat</SelectItem>
              {!user ? null : (
                <>
                  <SelectItem value="in_asteptare">În așteptare</SelectItem>
                  <SelectItem value="respins">Respins</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {(Object.keys(MODULE_LABELS) as (keyof typeof MODULE_LABELS)[]).map(
          (m) => (
            <span key={m} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: MODULE_COLORS[m] }}
              />
              {MODULE_LABELS[m]}
            </span>
          )
        )}
      </div>

      <div className="mt-4">
        {hydrated ? (
          <ObservationsMap observations={filtered} height={520} />
        ) : (
          <div className="flex h-[520px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
            Se încarcă…
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {filtered.length} puncte afișate · încadrare automată pe date
      </p>
    </div>
  );
}
