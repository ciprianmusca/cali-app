"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/layout/auth-gate";
import { ObservationsMap } from "@/components/map/observations-map";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge, ModuleBadge } from "@/components/observations/badges";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import { formatCoord, formatDate, formatDateTime } from "@/lib/format";
import { moduleKey, speciesKey } from "@/lib/i18n/labels";
import type { MessageKey } from "@/lib/i18n/types";
import type { FieldActivity, Observation, ObservationModule } from "@/lib/types";

function safeFormatDate(iso: string): string {
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return formatDate(d.toISOString());
  } catch {
    return iso;
  }
}

function speciesLabel(o: Observation, t: (key: MessageKey) => string): string {
  if (!("species" in o) || !o.species) return "—";
  if (o.species === "alta") {
    return o.speciesOther?.trim() || t(speciesKey("alta"));
  }
  return t(speciesKey(o.species));
}

function LessonHub() {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const [activities, setActivities] = useState<FieldActivity[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [activityId, setActivityId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    void fetch("/api/activities/lesson", { credentials: "include" })
      .then(async (r) => {
        const d = (await r.json()) as {
          ok?: boolean;
          activities?: FieldActivity[];
          observations?: Observation[];
        };
        if (!r.ok || !d.ok) {
          setError(true);
          return;
        }
        setActivities(d.activities ?? []);
        setObservations(d.observations ?? []);
        // Merge into local store so detail links work offline-ish.
        if (d.observations?.length) {
          useCaliStore.setState((s) => {
            const byId = new Map(s.observations.map((o) => [o.id, o]));
            for (const o of d.observations!) {
              const prev = byId.get(o.id);
              byId.set(o.id, prev ? { ...prev, ...o } : o);
            }
            return { observations: Array.from(byId.values()) };
          });
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (activityId === "all") return observations;
    return observations.filter((o) => o.activityId === activityId);
  }, [observations, activityId]);

  const analyzed = useMemo(
    () => filtered.filter((o) => o.status === "aprobat"),
    [filtered]
  );
  const pending = useMemo(
    () =>
      filtered.filter(
        (o) => o.status === "in_asteptare" || o.status === "clarificare"
      ),
    [filtered]
  );
  const rejected = useMemo(
    () => filtered.filter((o) => o.status === "respins"),
    [filtered]
  );

  const byModule = useMemo(() => {
    const counts: Record<ObservationModule, number> = {
      fenologie: 0,
      perturbari: 0,
      sol: 0,
    };
    for (const o of analyzed) counts[o.module] += 1;
    return counts;
  }, [analyzed]);

  const activityTitle = (id?: string) =>
    activities.find((a) => a.id === id)?.title ?? "—";

  if (!user) return null;

  if (
    user.role !== "profesor" &&
    user.role !== "admin" &&
    user.role !== "ranger"
  ) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>{t("lesson.forbidden")}</p>
        <Link href="/scoli" className="mt-4 inline-block text-primary underline">
          {t("school.back")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">
        {t("auth.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <p>{t("lesson.loadError")}</p>
        <Link href="/scoli" className="text-primary underline">
          {t("school.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 print:max-w-none">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/scoli" className="underline-offset-2 hover:underline">
              {t("school.back")}
            </Link>
            {" · "}
            {t("lesson.crumb")}
          </p>
          <h1 className="mt-1 font-display text-3xl text-forest">
            {t("lesson.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("lesson.sub")}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          {t("lesson.print")}
        </Button>
      </div>

      <div className="mt-6 print:mt-0">
        <h1 className="mb-4 hidden font-display text-2xl print:block">
          {t("lesson.title")}
          {activityId !== "all"
            ? ` — ${activityTitle(activityId)}`
            : ""}
        </h1>

        <div className="space-y-1 print:hidden">
          <Label htmlFor="lesson-activity">{t("lesson.filterActivity")}</Label>
          <select
            id="lesson-activity"
            className="flex h-9 w-full max-w-md rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
          >
            <option value="all">{t("lesson.allActivities")}</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} · {safeFormatDate(a.date)}
                {a.schoolName ? ` · ${a.schoolName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card/80 px-4 py-3">
            <div className="text-xs text-muted-foreground">{t("lesson.total")}</div>
            <div className="font-display text-2xl text-forest">
              {filtered.length}
            </div>
          </div>
          <div className="rounded-lg border border-amber-800/20 bg-amber-50/60 px-4 py-3">
            <div className="text-xs text-amber-950/80">{t("lesson.pending")}</div>
            <div className="font-display text-2xl text-amber-950">
              {pending.length}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-800/20 bg-emerald-50/60 px-4 py-3">
            <div className="text-xs text-emerald-900/80">
              {t("lesson.analyzed")}
            </div>
            <div className="font-display text-2xl text-emerald-900">
              {analyzed.length}
            </div>
          </div>
          <div className="rounded-lg border border-red-800/20 bg-red-50/40 px-4 py-3">
            <div className="text-xs text-red-900/80">{t("lesson.rejected")}</div>
            <div className="font-display text-2xl text-red-900">
              {rejected.length}
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl text-forest">{t("lesson.mapTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("lesson.mapSub")}
          </p>
          <div className="mt-4">
            {filtered.length === 0 ? (
              <p className="rounded-lg border bg-card/80 p-6 text-sm text-muted-foreground">
                {t("lesson.mapEmpty")}
              </p>
            ) : (
              <ObservationsMap observations={filtered} height={420} />
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-forest">
            {t("lesson.reportTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("lesson.reportSub")}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span>
              {t(moduleKey("fenologie"))}: <strong>{byModule.fenologie}</strong>
            </span>
            <span>
              {t(moduleKey("perturbari"))}:{" "}
              <strong>{byModule.perturbari}</strong>
            </span>
            <span>
              {t(moduleKey("sol"))}: <strong>{byModule.sol}</strong>
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border bg-card/80">
            {analyzed.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {t("lesson.reportEmpty")}
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("lesson.colCode")}</th>
                    <th className="px-3 py-2 font-medium">
                      {t("lesson.colStudent")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("lesson.colModule")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("lesson.colSpecies")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("lesson.colActivity")}
                    </th>
                    <th className="px-3 py-2 font-medium">{t("lesson.colWhen")}</th>
                    <th className="px-3 py-2 font-medium">{t("lesson.colLoc")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analyzed.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link
                          href={`/observatii/${o.id}`}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {o.code}
                        </Link>
                        <div className="mt-0.5">
                          <StatusBadge status={o.status} />
                        </div>
                      </td>
                      <td className="px-3 py-2">{o.authorName}</td>
                      <td className="px-3 py-2">
                        <ModuleBadge module={o.module} />
                      </td>
                      <td className="px-3 py-2">{speciesLabel(o, t)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {activityTitle(o.activityId)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDateTime(o.validatedAt ?? o.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {formatCoord(o.location.latitude)},{" "}
                        {formatCoord(o.location.longitude)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {pending.length > 0 ? (
          <section className="mt-10 print:hidden">
            <h2 className="font-display text-xl text-forest">
              {t("lesson.pendingTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("lesson.pendingSub")}
            </p>
            <ul className="mt-3 divide-y rounded-lg border bg-card/80">
              {pending.map((o) => (
                <li key={o.id}>
                  <Link
                    href={
                      o.activityId
                        ? `/scoli/${o.activityId}`
                        : `/observatii/${o.id}`
                    }
                    className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <span className="font-medium">{o.code}</span>
                    <StatusBadge status={o.status} />
                    <ModuleBadge module={o.module} />
                    <span className="text-muted-foreground">{o.authorName}</span>
                    <span className="text-muted-foreground">
                      {activityTitle(o.activityId)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default function LessonPage() {
  return (
    <AuthGate>
      <LessonHub />
    </AuthGate>
  );
}
