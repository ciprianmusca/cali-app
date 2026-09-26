"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { ObservationThumb } from "@/components/observations/observation-thumb";
import { ObservationsMap } from "@/components/map/observations-map";
import { useCaliStore } from "@/lib/store";
import type { Observation } from "@/lib/types";
import {
  displayAuthorName,
  displayValidatorName,
  formatCoord,
  formatDateTime,
  mapsDirectionsUrl,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  disturbanceKey,
  phenStageLabelKey,
  severityKey,
  speciesKey,
} from "@/lib/i18n/labels";
import { canViewObservation } from "@/lib/visibility";

function ObservationDetail({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const observations = useCaliStore((s) => s.observations);
  const user = useCaliStore((s) => s.currentUser())!;
  const validateObservation = useCaliStore((s) => s.validateObservation);
  const deleteObservation = useCaliStore((s) => s.deleteObservation);
  const updateObservation = useCaliStore((s) => s.updateObservation);

  const candidate = observations.find((o) => o.id === id);
  const obs =
    candidate &&
    canViewObservation(candidate, { id: user.id, role: user.role })
      ? candidate
      : undefined;
  const [decision, setDecision] = useState<"aprobat" | "respins" | "">("");
  const [comment, setComment] = useState("");
  const [sentinel, setSentinel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Prefer the server record (photos as /api/... URLs). Drop ghost local rows.
  useEffect(() => {
    if (!id || typeof navigator === "undefined" || !navigator.onLine) return;
    let cancelled = false;
    void fetch(`/api/observations/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404 || res.status === 403) {
          // Ghost local row (never made it to D1) — drop without DELETE API.
          useCaliStore.setState({
            observations: useCaliStore
              .getState()
              .observations.filter((o) => o.id !== id),
            offlineQueue: useCaliStore
              .getState()
              .offlineQueue.filter((o) => o.id !== id),
          });
          router.replace("/observatii");
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          observation?: Observation;
        };
        if (!data.observation) return;
        // Replace the whole row so stale local fields/photos cannot linger.
        useCaliStore.setState({
          observations: useCaliStore
            .getState()
            .observations.map((o) =>
              o.id === id
                ? { ...data.observation!, syncStatus: "synced" as const }
                : o
            ),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (!obs) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>{t("obs.notFound")}</p>
        <Link href="/observatii" className="text-primary underline">
          {t("obs.backList")}
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
      setError(t("error.selectDecision"));
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
      setError(res.error ?? t("obs.error"));
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
            <Shield className="size-3.5" /> {t("obs.sentinel")}
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
          <ObservationThumb
            key={`${obs.id}-${i}-${src}`}
            module={obs.module}
            src={src}
            className="aspect-[4/3] w-full rounded-lg border"
            imgClassName="object-cover"
          />
        ))}
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {obs.species ? (
          <div>
            <dt className="text-sm text-muted-foreground">{t("obs.species")}</dt>
            <dd className="font-medium">{t(speciesKey(obs.species))}</dd>
          </div>
        ) : null}
        {obs.module === "fenologie" ? (
          <div>
            <dt className="text-sm text-muted-foreground">{t("obs.stage")}</dt>
            <dd className="font-medium">
              {obs.stage} — {t(phenStageLabelKey(obs.stage))}
            </dd>
          </div>
        ) : null}
        {obs.module === "perturbari" ? (
          <>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.types")}</dt>
              <dd className="font-medium">
                {obs.disturbanceTypes
                  .map((d) => t(disturbanceKey(d)))
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("obs.severity")}
              </dt>
              <dd className="font-medium">
                {obs.severity} — {t(severityKey(obs.severity))}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.area")}</dt>
              <dd className="font-medium">{obs.affectedAreaSqm} m²</dd>
            </div>
            {obs.insectType ? (
              <div>
                <dt className="text-sm text-muted-foreground">{t("obs.insect")}</dt>
                <dd className="font-medium">{obs.insectType}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {obs.module === "sol" ? (
          <>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.moss")}</dt>
              <dd className="font-medium">{obs.mossPct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.litter")}</dt>
              <dd className="font-medium">{obs.litterPct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.plants")}</dt>
              <dd className="font-medium">{obs.plantsPct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.bare")}</dt>
              <dd className="font-medium">{obs.barePct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.seedlings")}</dt>
              <dd className="font-medium">
                {obs.seedlingsPresent
                  ? t("obs.seedlingsYes")
                  : t("obs.seedlingsNo")}
              </dd>
            </div>
          </>
        ) : null}
        <div>
          <dt className="text-sm text-muted-foreground">{t("obs.coords")}</dt>
          <dd className="font-medium">
            {formatCoord(obs.location.latitude)},{" "}
            {formatCoord(obs.location.longitude)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("obs.accuracy")}</dt>
          <dd className="font-medium">
            {obs.location.accuracy != null ? `${obs.location.accuracy} m` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("obs.altitude")}</dt>
          <dd className="font-medium">
            {obs.location.altitude != null ? `${obs.location.altitude} m` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("obs.gpsTime")}</dt>
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
        <h2 className="mb-2 font-display text-lg">{t("obs.miniMap")}</h2>
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
            {t("obs.directions")}
          </Button>
        </a>
        {canDelete ? (
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(t("obs.deleteConfirm"))) {
                deleteObservation(obs.id);
                router.push("/observatii");
              }
            }}
          >
            <Trash2 className="size-4" />
            {t("obs.delete")}
          </Button>
        ) : null}
      </div>

      {obs.validatedAt ? (
        <div className="mt-8 rounded-lg border bg-card/80 p-4 text-sm">
          <p>
            {t("obs.validatedBy")}{" "}
            <strong>
              {displayValidatorName(obs.validatorName, user.role)}
            </strong>{" "}
            {t("obs.at")} {formatDateTime(obs.validatedAt)}
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
                const reason = prompt(t("obs.unmarkPrompt"));
                if (!reason?.trim()) return;
                updateObservation(obs.id, {
                  isSentinelTree: false,
                  validationComment: `Demarcat: ${reason}`,
                });
              }}
            >
              {t("obs.unmarkSentinel")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {canValidate ? (
        <section className="mt-10 space-y-4 rounded-xl border border-primary/20 bg-card p-5">
          <h2 className="font-display text-xl text-forest">{t("obs.validation")}</h2>
          {obs.authorId === user.id && user.role === "ranger" ? (
            <Alert>
              <AlertTitle>{t("obs.selfValidateBlocked")}</AlertTitle>
              <AlertDescription>{t("obs.selfValidateMsg")}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={decision === "aprobat" ? "default" : "outline"}
                  onClick={() => setDecision("aprobat")}
                >
                  {t("obs.approve")}
                </Button>
                <Button
                  type="button"
                  variant={decision === "respins" ? "destructive" : "outline"}
                  onClick={() => setDecision("respins")}
                >
                  {t("obs.reject")}
                </Button>
              </div>
              {obs.module === "perturbari" && decision === "aprobat" ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={sentinel}
                    onCheckedChange={(v) => setSentinel(v === true)}
                  />
                  {t("obs.markSentinel")}
                </label>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="comment">
                  {t("obs.comment")}
                  {decision === "respins" ? (
                    <span className="text-destructive"> *</span>
                  ) : (
                    t("obs.commentOptional")
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
                    <AlertTitle>{t("obs.error")}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
              <Button onClick={onValidate}>{t("obs.saveDecision")}</Button>
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
