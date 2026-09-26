"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Shield, Trash2 } from "lucide-react";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ModuleBadge, StatusBadge } from "@/components/observations/badges";
import { ObservationsMap } from "@/components/map/observations-map";
import { useCaliStore } from "@/lib/store";
import {
  DISTURBANCE_LABELS,
  PHENOLOGY_STAGES,
  SEVERITY_LABELS,
  SPECIES_LABELS,
} from "@/lib/constants";
import {
  displayAuthorName,
  formatCoord,
  formatDateTime,
  mapsDirectionsUrl,
} from "@/lib/format";

function ObservationDetail({ id }: { id: string }) {
  const router = useRouter();
  const observations = useCaliStore((s) => s.observations);
  const user = useCaliStore((s) => s.currentUser())!;
  const validateObservation = useCaliStore((s) => s.validateObservation);
  const deleteObservation = useCaliStore((s) => s.deleteObservation);
  const updateObservation = useCaliStore((s) => s.updateObservation);

  const obs = observations.find((o) => o.id === id);
  const [decision, setDecision] = useState<"aprobat" | "respins" | "">("");
  const [comment, setComment] = useState("");
  const [sentinel, setSentinel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  if (!obs) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>Observația nu a fost găsită.</p>
        <Link href="/observatii" className="text-primary underline">
          Înapoi la listă
        </Link>
      </div>
    );
  }

  const canValidate =
    (user.role === "ranger" || user.role === "admin") &&
    obs.status === "in_asteptare";
  const canDelete =
    obs.status === "in_asteptare" && obs.authorId === user.id;
  const isOwn = obs.authorId === user.id;

  const onValidate = () => {
    setError(null);
    if (!decision) {
      setError("Selectați o decizie.");
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    const res = validateObservation(
      obs.id,
      decision,
      comment,
      sentinel
    );
    if (!res.ok) {
      setError(res.error ?? "Eroare");
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    router.push("/validare");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-2">
        <ModuleBadge module={obs.module} />
        <StatusBadge status={obs.status} />
        {obs.isSentinelTree ? (
          <span className="inline-flex items-center gap-1 text-sm text-amber-800">
            <Shield className="size-3.5" /> Arbore santinelă
          </span>
        ) : null}
      </div>
      <h1 className="mt-3 font-display text-3xl text-forest">{obs.code}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDateTime(obs.createdAt)} ·{" "}
        {displayAuthorName(obs.authorName, obs.authorRole, user.role, isOwn)}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {obs.photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`Poză ${i + 1}`}
            className="w-full rounded-lg border object-cover"
          />
        ))}
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {obs.species ? (
          <div>
            <dt className="text-sm text-muted-foreground">Specie</dt>
            <dd className="font-medium">{SPECIES_LABELS[obs.species]}</dd>
          </div>
        ) : null}
        {obs.module === "fenologie" ? (
          <div>
            <dt className="text-sm text-muted-foreground">Stadiu</dt>
            <dd className="font-medium">
              {obs.stage} — {PHENOLOGY_STAGES[obs.stage].label}
            </dd>
          </div>
        ) : null}
        {obs.module === "perturbari" ? (
          <>
            <div>
              <dt className="text-sm text-muted-foreground">Tipuri</dt>
              <dd className="font-medium">
                {obs.disturbanceTypes
                  .map((t) => DISTURBANCE_LABELS[t])
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Severitate</dt>
              <dd className="font-medium">
                {obs.severity} — {SEVERITY_LABELS[obs.severity]}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Suprafață</dt>
              <dd className="font-medium">{obs.affectedAreaSqm} m²</dd>
            </div>
            {obs.insectType ? (
              <div>
                <dt className="text-sm text-muted-foreground">Insectă</dt>
                <dd className="font-medium">{obs.insectType}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {obs.module === "sol" ? (
          <>
            <div>
              <dt className="text-sm text-muted-foreground">Mușchi și licheni</dt>
              <dd className="font-medium">{obs.mossPct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Litieră</dt>
              <dd className="font-medium">{obs.litterPct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Plante</dt>
              <dd className="font-medium">{obs.plantsPct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Sol gol / rocă</dt>
              <dd className="font-medium">{obs.barePct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Puieți</dt>
              <dd className="font-medium">
                {obs.seedlingsPresent ? "Prezenți" : "Absenți"}
              </dd>
            </div>
          </>
        ) : null}
        <div>
          <dt className="text-sm text-muted-foreground">Coordonate</dt>
          <dd className="font-medium">
            {formatCoord(obs.location.latitude)},{" "}
            {formatCoord(obs.location.longitude)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Precizie GPS</dt>
          <dd className="font-medium">
            {obs.location.accuracy != null ? `${obs.location.accuracy} m` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Altitudine</dt>
          <dd className="font-medium">
            {obs.location.altitude != null ? `${obs.location.altitude} m` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Oră captură GPS</dt>
          <dd className="font-medium">
            {formatDateTime(obs.location.capturedAt)}
          </dd>
        </div>
      </dl>

      {obs.details ? (
        <p className="mt-6 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          {obs.details}
        </p>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-2 font-display text-lg">Mini-hartă</h2>
        <ObservationsMap observations={[obs]} height={240} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={mapsDirectionsUrl(
            obs.location.latitude,
            obs.location.longitude
          )}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline">
            <ExternalLink className="size-4" />
            Direcționează-mă
          </Button>
        </a>
        {canDelete ? (
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Ștergeți această observație?")) {
                deleteObservation(obs.id);
                router.push("/observatii");
              }
            }}
          >
            <Trash2 className="size-4" />
            Ștergere
          </Button>
        ) : null}
      </div>

      {obs.validatedAt ? (
        <div className="mt-8 rounded-lg border bg-card/80 p-4 text-sm">
          <p>
            Validat de <strong>{obs.validatorName}</strong> la{" "}
            {formatDateTime(obs.validatedAt)}
          </p>
          {obs.validationComment ? (
            <p className="mt-2 text-muted-foreground">{obs.validationComment}</p>
          ) : null}
          {obs.isSentinelTree &&
          (user.role === "ranger" || user.role === "admin") ? (
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => {
                const reason = prompt("Motiv demarcare (obligatoriu):");
                if (!reason?.trim()) return;
                updateObservation(obs.id, {
                  isSentinelTree: false,
                  validationComment: `Demarcat: ${reason}`,
                });
              }}
            >
              Demarcare arbore santinelă
            </Button>
          ) : null}
        </div>
      ) : null}

      {canValidate ? (
        <section className="mt-10 space-y-4 rounded-xl border border-primary/20 bg-card p-5">
          <h2 className="font-display text-xl text-forest">Validare</h2>
          {obs.authorId === user.id && user.role === "ranger" ? (
            <Alert>
              <AlertTitle>Auto-validare blocată</AlertTitle>
              <AlertDescription>
                Nu vă puteți valida propriile observații.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={decision === "aprobat" ? "default" : "outline"}
                  onClick={() => setDecision("aprobat")}
                >
                  Aprobă
                </Button>
                <Button
                  type="button"
                  variant={decision === "respins" ? "destructive" : "outline"}
                  onClick={() => setDecision("respins")}
                >
                  Respinge
                </Button>
              </div>
              {obs.module === "perturbari" && decision === "aprobat" ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={sentinel}
                    onCheckedChange={(v) => setSentinel(v === true)}
                  />
                  Marchează Arbore santinelă
                </label>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="comment">
                  Comentariu
                  {decision === "respins" ? (
                    <span className="text-destructive"> *</span>
                  ) : (
                    " (opțional)"
                  )}
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
              <div ref={errorRef}>
                {error ? (
                  <Alert variant="destructive">
                    <AlertTitle>Eroare</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
              <Button onClick={onValidate}>Salvează decizia</Button>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default function ObservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGate>
      <ObservationDetail id={id} />
    </AuthGate>
  );
}
