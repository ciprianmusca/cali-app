"use client";

import Link from "next/link";
import { AuthGate } from "@/components/layout/auth-gate";
import { buttonVariants } from "@/components/ui/button";
import { useCaliStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { csvEscape, formatDateTime } from "@/lib/format";
import {
  DISTURBANCE_LABELS,
  MODULE_LABELS,
  ROLE_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";

function AdminHome() {
  const observations = useCaliStore((s) => s.observations);
  const users = useCaliStore((s) => s.users);
  const pending = observations.filter((o) => o.status === "in_asteptare").length;
  const recent = [...observations]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const exportFairCsv = () => {
    const headers = [
      "code",
      "module",
      "status",
      "created_at",
      "capture_at",
      "latitude",
      "longitude",
      "accuracy_m",
      "altitude_m",
      "author_role",
      "species",
      "validator",
      "validated_at",
      "photo_count",
      "details",
      "phenology_stage",
      "disturbance_types",
      "severity",
      "affected_area_sqm",
      "soil_moss_percentage",
      "soil_litter_percentage",
      "soil_plants_percentage",
      "soil_bare_percentage",
      "soil_seedlings_present",
    ];
    const rows = observations.map((o) => {
      const base = [
        o.code,
        o.module,
        o.status,
        o.createdAt,
        o.location.capturedAt,
        o.location.latitude,
        o.location.longitude,
        o.location.accuracy ?? "",
        o.location.altitude ?? "",
        o.authorRole,
        o.species ? SPECIES_LABELS[o.species] : "",
        o.validatorName ?? "",
        o.validatedAt ?? "",
        o.photos.length,
        o.details ?? "",
      ];
      if (o.module === "fenologie") {
        return [
          ...base,
          o.stage,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ];
      }
      if (o.module === "perturbari") {
        return [
          ...base,
          "",
          o.disturbanceTypes.map((t) => DISTURBANCE_LABELS[t]).join("|"),
          o.severity,
          o.affectedAreaSqm,
          "",
          "",
          "",
          "",
          "",
        ];
      }
      return [
        ...base,
        "",
        "",
        "",
        "",
        o.mossPct,
        o.litterPct,
        o.plantsPct,
        o.barePct,
        o.seedlingsPresent ? "1" : "0",
      ];
    });
    const csv = [
      headers.join(";"),
      ...rows.map((r) => r.map(csvEscape).join(";")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cali-fair-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl text-forest">Administrare</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Panou admin: observații de validat, utilizatori și export FAIR.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card/80 px-4 py-5">
          <div className="text-sm text-muted-foreground">De validat</div>
          <div className="font-display text-3xl text-forest">{pending}</div>
          <Link href="/validare" className="mt-2 inline-block text-sm text-primary underline">
            Deschide coada
          </Link>
        </div>
        <div className="rounded-lg border bg-card/80 px-4 py-5">
          <div className="text-sm text-muted-foreground">Utilizatori</div>
          <div className="font-display text-3xl text-forest">{users.length}</div>
          <Link
            href="/admin/utilizatori"
            className="mt-2 inline-block text-sm text-primary underline"
          >
            Gestiune utilizatori
          </Link>
        </div>
        <div className="rounded-lg border bg-card/80 px-4 py-5">
          <div className="text-sm text-muted-foreground">Export FAIR</div>
          <button
            type="button"
            onClick={exportFairCsv}
            className={cn(buttonVariants({ size: "sm" }), "mt-3")}
          >
            Descarcă CSV anonimizat
          </button>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl">Activitate recentă</h2>
        <div className="mt-3 divide-y rounded-lg border bg-card/80">
          {recent.map((o) => (
            <div key={o.id} className="flex flex-wrap gap-2 px-4 py-3 text-sm">
              <span className="font-medium">{formatDateTime(o.createdAt)}</span>
              <span>{o.code}</span>
              <span>{MODULE_LABELS[o.module]}</span>
              <span>{STATUS_LABELS[o.status]}</span>
              <span className="text-muted-foreground">
                {ROLE_LABELS[o.authorRole]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGate roles={["admin"]}>
      <AdminHome />
    </AuthGate>
  );
}
