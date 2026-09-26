"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Trash2 } from "lucide-react";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleBadge, StatusBadge } from "@/components/observations/badges";
import { ObservationThumb } from "@/components/observations/observation-thumb";
import { SpeciesSelect } from "@/components/observations/species-select";
import { DirectionsButton } from "@/components/observations/directions-button";
import { GlossaryTip } from "@/components/glossary/glossary-tip";
import { ObservationsMap } from "@/components/map/observations-map";
import { useCaliStore } from "@/lib/store";
import type {
  DisturbanceType,
  FieldActivity,
  Observation,
  ObservationFieldSnapshot,
  PhenologyStage,
  Species,
  ValidationDecisionKind,
} from "@/lib/types";
import {
  displayAuthorName,
  displayValidatorName,
  formatCoord,
  formatDateTime,
} from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  crownKey,
  decisionKey,
  disturbanceKey,
  phenStageLabelKey,
  severityKey,
} from "@/lib/i18n/labels";
import { speciesDisplayLabel } from "@/lib/species";
import { canViewObservation } from "@/lib/visibility";
import { DISTURBANCE_LABELS } from "@/lib/constants";

type DecisionChoice =
  | "aprobat"
  | "respins"
  | "aprobat_cu_corectii"
  | "cere_clarificari"
  | "";

function ObservationDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const loc = locale === "en" ? "en" : "ro";
  const router = useRouter();
  const observations = useCaliStore((s) => s.observations);
  const user = useCaliStore((s) => s.currentUser())!;
  const validateObservation = useCaliStore((s) => s.validateObservation);
  const replyToClarification = useCaliStore((s) => s.replyToClarification);
  const deleteObservation = useCaliStore((s) => s.deleteObservation);
  const updateObservation = useCaliStore((s) => s.updateObservation);
  const [creatingTree, setCreatingTree] = useState(false);
  const [activity, setActivity] = useState<FieldActivity | null>(null);

  const candidate = observations.find((o) => o.id === id);
  const obs =
    candidate &&
    canViewObservation(candidate, { id: user.id, role: user.role })
      ? candidate
      : undefined;
  const [decision, setDecision] = useState<DecisionChoice>("");
  const [comment, setComment] = useState("");
  const [sentinel, setSentinel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarifyReply, setClarifyReply] = useState("");
  const [reopenComment, setReopenComment] = useState("");
  const [corrSpecies, setCorrSpecies] = useState<Species | "">("");
  const [corrSpeciesOther, setCorrSpeciesOther] = useState("");
  const [corrStage, setCorrStage] = useState<PhenologyStage | "">("");
  const [corrTypes, setCorrTypes] = useState<DisturbanceType[]>([]);
  const [corrSeverity, setCorrSeverity] = useState<1 | 2 | 3 | 4 | 5 | "">("");
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!obs) return;
    setCorrSpecies(obs.species ?? "");
    setCorrSpeciesOther(obs.speciesOther ?? "");
    if (obs.module === "fenologie") setCorrStage(obs.stage);
    if (obs.module === "perturbari") {
      setCorrTypes([...obs.disturbanceTypes]);
      setCorrSeverity(obs.severity);
    }
  }, [obs?.id, obs?.status]);

  useEffect(() => {
    if (!obs?.activityId) {
      setActivity(null);
      return;
    }
    void fetch(`/api/activities/${obs.activityId}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ activity?: FieldActivity }>)
      .then((d) => setActivity(d.activity ?? null))
      .catch(() => setActivity(null));
  }, [obs?.activityId]);

  // Prefer the server record (photos as /api/... URLs). Drop ghost local rows.
  useEffect(() => {
    if (!id || typeof navigator === "undefined" || !navigator.onLine) return;
    let cancelled = false;
    void fetch(`/api/observations/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404 || res.status === 403) {
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

  const isStaff = user.role === "ranger" || user.role === "admin";
  const canValidate = isStaff && obs.status === "in_asteptare";
  const canReopen =
    isStaff && (obs.status === "aprobat" || obs.status === "respins");
  const canDelete =
    (obs.status === "in_asteptare" || obs.status === "clarificare") &&
    obs.authorId === user.id;
  const canEdit =
    (obs.status === "in_asteptare" || obs.status === "clarificare") &&
    obs.authorId === user.id;
  const canReplyClarify =
    obs.status === "clarificare" && obs.authorId === user.id;
  const canCreateTree = isStaff && Boolean(obs.species);
  const isOwn = obs.authorId === user.id;

  const createSentinel = async () => {
    if (!obs.species) return;
    setCreatingTree(true);
    try {
      const res = await fetch("/api/trees", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          species: obs.species,
          speciesOther: obs.speciesOther,
          latitude: obs.location.latitude,
          longitude: obs.location.longitude,
          observationId: obs.id,
        }),
      });
      const data = (await res.json()) as {
        tree?: { id: string; code: string };
      };
      if (res.ok && data.tree) {
        updateObservation(obs.id, {
          isSentinelTree: true,
          sentinelTreeId: data.tree.id,
        });
        router.push(`/arbori/${data.tree.id}`);
      }
    } finally {
      setCreatingTree(false);
    }
  };

  const buildCorrections = (): ObservationFieldSnapshot | undefined => {
    if (decision !== "aprobat_cu_corectii") return undefined;
    const snap: ObservationFieldSnapshot = {};
    if (corrSpecies) {
      snap.species = corrSpecies;
      snap.speciesOther =
        corrSpecies === "alta" ? corrSpeciesOther.trim() : undefined;
    }
    if (obs.module === "fenologie" && corrStage) {
      snap.stage = corrStage;
    }
    if (obs.module === "perturbari") {
      if (corrTypes.length) snap.disturbanceTypes = corrTypes;
      if (corrSeverity) snap.severity = corrSeverity;
    }
    return snap;
  };

  const onValidate = () => {
    setError(null);
    if (!decision) {
      setError(t("error.selectDecision"));
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    if (decision === "aprobat_cu_corectii") {
      if (!corrSpecies) {
        setError(t("error.speciesRequired"));
        return;
      }
      if (corrSpecies === "alta" && !corrSpeciesOther.trim()) {
        setError(t("error.speciesOther"));
        return;
      }
      if (obs.module === "fenologie" && !corrStage) {
        setError(t("error.stageRequired"));
        return;
      }
      if (obs.module === "perturbari") {
        if (!corrTypes.length) {
          setError(t("error.disturbanceType"));
          return;
        }
        if (!corrSeverity) {
          setError(t("error.severityRequired"));
          return;
        }
      }
    }
    const res = validateObservation(
      obs.id,
      decision as ValidationDecisionKind,
      comment,
      {
        markSentinel: sentinel,
        corrections: buildCorrections(),
      }
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

  const onReopen = () => {
    setError(null);
    const res = validateObservation(obs.id, "reopen", reopenComment);
    if (!res.ok) {
      setError(res.error ?? t("obs.error"));
      return;
    }
    setReopenComment("");
  };

  const onClarifyReply = () => {
    setError(null);
    const res = replyToClarification(obs.id, clarifyReply);
    if (!res.ok) {
      setError(res.error ?? t("obs.error"));
      return;
    }
    setClarifyReply("");
  };

  const toggleDistType = (d: DisturbanceType) => {
    setCorrTypes((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const history = [...(obs.validationHistory ?? [])].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

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
      <div className="mt-3 flex flex-wrap gap-2">
        {canEdit ? (
          <Link
            href={`/observatii/${obs.id}/editare`}
            className="text-sm text-primary underline"
          >
            {t("obs.edit")}
          </Link>
        ) : null}
        {obs.sentinelTreeId ? (
          <Link
            href={`/arbori/${obs.sentinelTreeId}`}
            className="text-sm text-primary underline"
          >
            {t("tree.title")}
          </Link>
        ) : null}
        {canCreateTree && !obs.sentinelTreeId ? (
          <button
            type="button"
            className="text-sm text-primary underline disabled:opacity-50"
            disabled={creatingTree}
            onClick={() => void createSentinel()}
          >
            {t("obs.createSentinel")}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {obs.photos.map((src, i) => (
          <div key={`${obs.id}-${i}-${src}`} className="relative">
            <ObservationThumb
              module={obs.module}
              src={src}
              className="aspect-[4/3] w-full rounded-lg border"
              imgClassName="object-cover"
            />
            {user.role === "admin" ? (
              <Button
                size="sm"
                variant="destructive"
                className="absolute right-2 top-2"
                onClick={() => {
                  if (!confirm(t("admin.deletePhotoConfirm"))) return;
                  const photos = obs.photos.filter((_, idx) => idx !== i);
                  updateObservation(obs.id, {
                    photos,
                    syncStatus: "pending",
                  });
                  const next = {
                    ...obs,
                    photos,
                    syncStatus: "pending" as const,
                  };
                  useCaliStore.setState({
                    offlineQueue: [
                      next,
                      ...useCaliStore
                        .getState()
                        .offlineQueue.filter((o) => o.id !== obs.id),
                    ],
                  });
                  void fetch("/api/notifications", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "create",
                      notification: {
                        userId: obs.authorId,
                        type: "info",
                        title: t("obs.deletePhoto"),
                        body: obs.code,
                        observationId: obs.id,
                      },
                      audit: {
                        action: "delete_photo",
                        objectId: obs.id,
                        detail: `photo index ${i}`,
                      },
                    }),
                  }).catch(() => undefined);
                  void useCaliStore.getState().flushOfflineQueue();
                }}
              >
                {t("obs.deletePhoto")}
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {obs.species ? (
          <div>
            <dt className="text-sm text-muted-foreground">{t("obs.species")}</dt>
            <dd className="font-medium">
              {speciesDisplayLabel(obs.species, loc, obs.speciesOther)}
            </dd>
          </div>
        ) : null}
        {obs.module === "fenologie" ? (
          <>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("obs.stage")}
                <GlossaryTip term="stadiu" />
              </dt>
              <dd className="font-medium">
                {obs.stage} — {t(phenStageLabelKey(obs.stage))}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("phen.crownLabel")}
              </dt>
              <dd className="font-medium">
                {t(crownKey(obs.crownCondition ?? "sanatoasa"))}
              </dd>
            </div>
          </>
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
                <GlossaryTip term="severitate" />
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
              <dt className="text-sm text-muted-foreground">
                {t("soil.plotHint")}
              </dt>
              <dd className="font-medium">{obs.plotSize ?? "1x1m"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("obs.moss")}</dt>
              <dd className="font-medium">{obs.mossPct}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("obs.litter")}
                <GlossaryTip term="litiera" />
              </dt>
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
            {obs.locationAdjusted ? (
              <span className="ml-2 text-xs text-muted-foreground">
                ({t("obs.locationAdjusted")})
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {obs.originalFields ? (
        <div className="mt-6 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">{t("obs.originalValues")}</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {obs.originalFields.species ? (
              <li>
                {t("obs.species")}:{" "}
                {speciesDisplayLabel(
                  obs.originalFields.species,
                  loc,
                  obs.originalFields.speciesOther
                )}
              </li>
            ) : null}
            {obs.originalFields.stage != null ? (
              <li>
                {t("obs.stage")}: {obs.originalFields.stage} —{" "}
                {t(phenStageLabelKey(obs.originalFields.stage))}
              </li>
            ) : null}
            {obs.originalFields.disturbanceTypes?.length ? (
              <li>
                {t("obs.types")}:{" "}
                {obs.originalFields.disturbanceTypes
                  .map((d) => t(disturbanceKey(d)))
                  .join(", ")}
              </li>
            ) : null}
            {obs.originalFields.severity != null ? (
              <li>
                {t("obs.severity")}: {obs.originalFields.severity} —{" "}
                {t(severityKey(obs.originalFields.severity))}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {obs.details ? (
        <p className="mt-6 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          {obs.details}
        </p>
      ) : null}

      {obs.status === "clarificare" && obs.clarificationQuestion ? (
        <Alert className="mt-6">
          <AlertTitle>{t("obs.clarifyQuestion")}</AlertTitle>
          <AlertDescription>{obs.clarificationQuestion}</AlertDescription>
        </Alert>
      ) : null}

      {canReplyClarify ? (
        <section className="mt-6 space-y-3 rounded-xl border bg-card p-5">
          <Label htmlFor="clarify-reply">{t("obs.clarifyReply")}</Label>
          <Textarea
            id="clarify-reply"
            value={clarifyReply}
            onChange={(e) => setClarifyReply(e.target.value)}
            rows={3}
          />
          <Button onClick={onClarifyReply}>{t("obs.clarifyReplyBtn")}</Button>
        </section>
      ) : null}

      {obs.editHistory?.length ? (
        <div className="mt-6">
          <h2 className="font-display text-lg">{t("obs.editHistory")}</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {obs.editHistory.map((h, i) => (
              <li key={i}>
                {formatDateTime(h.at)} · {h.byName}: {h.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {history.length ? (
        <div className="mt-6">
          <h2 className="font-display text-lg">{t("obs.decisionHistory")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border px-3 py-2">
                <div className="font-medium">
                  {formatDateTime(h.at)} · {t(decisionKey(h.kind))} · {h.byName}
                </div>
                {h.comment ? (
                  <p className="mt-1 text-muted-foreground">{h.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="mb-2 font-display text-lg">{t("obs.miniMap")}</h2>
        <ObservationsMap observations={[obs]} height={240} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <DirectionsButton observation={obs} activity={activity} />
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
          {obs.isSentinelTree && isStaff ? (
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

      {canReopen ? (
        <section className="mt-8 space-y-3 rounded-xl border border-amber-800/20 bg-amber-50/50 p-5">
          <h2 className="font-display text-lg text-forest">{t("obs.reopen")}</h2>
          <p className="text-sm text-muted-foreground">{t("obs.reopenHint")}</p>
          <Textarea
            value={reopenComment}
            onChange={(e) => setReopenComment(e.target.value)}
            rows={2}
          />
          <div ref={errorRef}>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("obs.error")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <Button variant="outline" onClick={onReopen}>
            {t("obs.reopen")}
          </Button>
        </section>
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
                {obs.module === "fenologie" || obs.module === "perturbari" ? (
                  <Button
                    type="button"
                    variant={
                      decision === "aprobat_cu_corectii" ? "default" : "outline"
                    }
                    onClick={() => setDecision("aprobat_cu_corectii")}
                  >
                    {t("obs.approveCorrections")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={
                    decision === "cere_clarificari" ? "secondary" : "outline"
                  }
                  onClick={() => setDecision("cere_clarificari")}
                >
                  {t("obs.requestClarify")}
                </Button>
                <Button
                  type="button"
                  variant={decision === "respins" ? "destructive" : "outline"}
                  onClick={() => setDecision("respins")}
                >
                  {t("obs.reject")}
                </Button>
              </div>

              {decision === "aprobat_cu_corectii" ? (
                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">{t("obs.correctionsTitle")}</p>
                  {(obs.module === "fenologie" ||
                    obs.module === "perturbari") && (
                    <SpeciesSelect
                      species={corrSpecies}
                      speciesOther={corrSpeciesOther}
                      onSpeciesChange={setCorrSpecies}
                      onOtherChange={setCorrSpeciesOther}
                    />
                  )}
                  {obs.module === "fenologie" ? (
                    <div className="space-y-1">
                      <Label>{t("obs.stage")}</Label>
                      <Select
                        value={corrStage ? String(corrStage) : undefined}
                        onValueChange={(v) =>
                          setCorrStage(Number(v) as PhenologyStage)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {([1, 2, 3, 4] as PhenologyStage[]).map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              {s} — {t(phenStageLabelKey(s))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  {obs.module === "perturbari" ? (
                    <>
                      <div className="space-y-2">
                        <Label>{t("obs.types")}</Label>
                        <div className="flex flex-wrap gap-2">
                          {(
                            Object.keys(DISTURBANCE_LABELS) as DisturbanceType[]
                          ).map((d) => (
                            <label
                              key={d}
                              className="inline-flex items-center gap-1.5 text-sm"
                            >
                              <Checkbox
                                checked={corrTypes.includes(d)}
                                onCheckedChange={() => toggleDistType(d)}
                              />
                              {t(disturbanceKey(d))}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>{t("obs.severity")}</Label>
                        <Select
                          value={
                            corrSeverity ? String(corrSeverity) : undefined
                          }
                          onValueChange={(v) =>
                            setCorrSeverity(
                              Number(v) as 1 | 2 | 3 | 4 | 5
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {([1, 2, 3, 4, 5] as const).map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                {s} — {t(severityKey(s))}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              {obs.module === "perturbari" &&
              (decision === "aprobat" ||
                decision === "aprobat_cu_corectii") ? (
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
                  {decision === "cere_clarificari"
                    ? t("obs.clarifyQuestion")
                    : t("obs.comment")}
                  {decision === "respins" ||
                  decision === "cere_clarificari" ? (
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
