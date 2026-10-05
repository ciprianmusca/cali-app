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
import { canTeachSchool } from "@/lib/capabilities";
import { moduleKey, speciesKey } from "@/lib/i18n/labels";
import type { MessageKey } from "@/lib/i18n/types";
import type { FieldActivity, Observation, ObservationModule } from "@/lib/types";
import { cn } from "@/lib/utils";

type ReportView = "total" | "tip" | "elev";

const MODULES: ObservationModule[] = ["fenologie", "perturbari", "sol"];

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

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

type StudentRow = {
  authorId: string;
  authorName: string;
  total: number;
  pending: number;
  analyzed: number;
  rejected: number;
  byModule: Record<ObservationModule, number>;
};

function LessonHub() {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const [activities, setActivities] = useState<FieldActivity[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [activityId, setActivityId] = useState<string>("all");
  const [reportView, setReportView] = useState<ReportView>("total");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
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
  };

  useEffect(() => {
    load();
  }, []);

  const selectedActivity =
    activityId === "all"
      ? null
      : (activities.find((a) => a.id === activityId) ?? null);

  const canDeleteSelected =
    !!user &&
    !!selectedActivity &&
    (user.role === "admin" ||
      (user.role === "ranger" && canTeachSchool(user)) ||
      (canTeachSchool(user) && selectedActivity.createdBy === user.id));

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

  const byModuleAll = useMemo(() => {
    const init = () =>
      ({
        fenologie: { total: 0, analyzed: 0, pending: 0, rejected: 0 },
        perturbari: { total: 0, analyzed: 0, pending: 0, rejected: 0 },
        sol: { total: 0, analyzed: 0, pending: 0, rejected: 0 },
      }) as Record<
        ObservationModule,
        { total: number; analyzed: number; pending: number; rejected: number }
      >;
    const counts = init();
    for (const o of filtered) {
      counts[o.module].total += 1;
      if (o.status === "aprobat") counts[o.module].analyzed += 1;
      else if (o.status === "respins") counts[o.module].rejected += 1;
      else counts[o.module].pending += 1;
    }
    return counts;
  }, [filtered]);

  const byStudent = useMemo(() => {
    const map = new Map<string, StudentRow>();
    for (const o of filtered) {
      let row = map.get(o.authorId);
      if (!row) {
        row = {
          authorId: o.authorId,
          authorName: o.authorName,
          total: 0,
          pending: 0,
          analyzed: 0,
          rejected: 0,
          byModule: { fenologie: 0, perturbari: 0, sol: 0 },
        };
        map.set(o.authorId, row);
      }
      row.total += 1;
      row.byModule[o.module] += 1;
      if (o.status === "aprobat") row.analyzed += 1;
      else if (o.status === "respins") row.rejected += 1;
      else row.pending += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.authorName.localeCompare(b.authorName, "ro")
    );
  }, [filtered]);

  const activityTitle = (id?: string) =>
    activities.find((a) => a.id === id)?.title ?? "—";

  const onDeleteSelected = async () => {
    if (!canDeleteSelected || !selectedActivity) return;
    if (!window.confirm(t("school.deleteConfirm"))) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/activities/${encodeURIComponent(selectedActivity.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        window.alert(t("school.deleteError"));
        return;
      }
      useCaliStore.setState((s) => ({
        observations: s.observations.map((o) =>
          o.activityId === selectedActivity.id
            ? { ...o, activityId: undefined }
            : o
        ),
        settings:
          s.settings.activeActivityId === selectedActivity.id
            ? { ...s.settings, activeActivityId: undefined }
            : s.settings,
      }));
      setActivityId("all");
      load();
    } catch {
      window.alert(t("school.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  if (!canTeachSchool(user)) {
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

  const reportTabs: { id: ReportView; label: string }[] = [
    { id: "total", label: t("lesson.tabTotal") },
    { id: "tip", label: t("lesson.tabType") },
    { id: "elev", label: t("lesson.tabStudent") },
  ];

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

      {/* Flow strip: how classroom work is organized */}
      <ol className="mt-6 grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-3 print:hidden">
        <li>
          <span className="font-medium text-forest">1. {t("lesson.flow1Title")}</span>
          <p className="mt-0.5 text-muted-foreground">{t("lesson.flow1Body")}</p>
        </li>
        <li>
          <span className="font-medium text-forest">2. {t("lesson.flow2Title")}</span>
          <p className="mt-0.5 text-muted-foreground">{t("lesson.flow2Body")}</p>
        </li>
        <li>
          <span className="font-medium text-forest">3. {t("lesson.flow3Title")}</span>
          <p className="mt-0.5 text-muted-foreground">{t("lesson.flow3Body")}</p>
        </li>
      </ol>

      <div className="mt-6 print:mt-0">
        <h1 className="mb-4 hidden font-display text-2xl print:block">
          {t("lesson.title")}
          {selectedActivity ? ` — ${selectedActivity.title}` : ""}
        </h1>

        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div className="min-w-[200px] flex-1 space-y-1">
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
          {selectedActivity ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/scoli/${selectedActivity.id}`}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm hover:bg-muted"
              >
                {t("lesson.openActivity")}
              </Link>
              {canDeleteSelected ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-9"
                  disabled={deleting}
                  onClick={() => void onDeleteSelected()}
                >
                  {deleting ? t("auth.loading") : t("school.delete")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* KPI total */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border bg-card/80 px-4 py-3">
            <div className="text-xs text-muted-foreground">{t("lesson.total")}</div>
            <div className="font-display text-2xl text-forest">
              {filtered.length}
            </div>
          </div>
          <div className="rounded-lg border bg-card/80 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              {t("lesson.students")}
            </div>
            <div className="font-display text-2xl text-forest">
              {byStudent.length}
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

        {/* Map */}
        <section className="mt-10">
          <h2 className="font-display text-xl text-forest">{t("lesson.mapTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("lesson.mapSub")}</p>
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

        {/* Reports */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-forest">
                {t("lesson.reportsTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("lesson.reportsSub")}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 print:hidden" role="tablist">
              {reportTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={reportView === tab.id}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    reportView === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background hover:bg-muted"
                  )}
                  onClick={() => setReportView(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {reportView === "total" ? (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto rounded-lg border bg-card/80">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colMetric")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colCount")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colShare")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2">{t("lesson.total")}</td>
                      <td className="px-3 py-2 font-medium">{filtered.length}</td>
                      <td className="px-3 py-2 text-muted-foreground">100%</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">{t("lesson.pending")}</td>
                      <td className="px-3 py-2 font-medium">{pending.length}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {pct(pending.length, filtered.length)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">{t("lesson.analyzed")}</td>
                      <td className="px-3 py-2 font-medium">{analyzed.length}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {pct(analyzed.length, filtered.length)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">{t("lesson.rejected")}</td>
                      <td className="px-3 py-2 font-medium">{rejected.length}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {pct(rejected.length, filtered.length)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">{t("lesson.students")}</td>
                      <td className="px-3 py-2 font-medium">{byStudent.length}</td>
                      <td className="px-3 py-2 text-muted-foreground">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-lg border bg-card/80">
                {analyzed.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    {t("lesson.reportEmpty")}
                  </p>
                ) : (
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          {t("lesson.colCode")}
                        </th>
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
                        <th className="px-3 py-2 font-medium">
                          {t("lesson.colWhen")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("lesson.colLoc")}
                        </th>
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
            </div>
          ) : null}

          {reportView === "tip" ? (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto rounded-lg border bg-card/80">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colModule")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colCount")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.analyzed")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.pending")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.rejected")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colShare")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {MODULES.map((m) => {
                      const row = byModuleAll[m];
                      return (
                        <tr key={m}>
                          <td className="px-3 py-2">
                            <ModuleBadge module={m} />
                          </td>
                          <td className="px-3 py-2 font-medium">{row.total}</td>
                          <td className="px-3 py-2">{row.analyzed}</td>
                          <td className="px-3 py-2">{row.pending}</td>
                          <td className="px-3 py-2">{row.rejected}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {pct(row.total, filtered.length)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {MODULES.map((m) => {
                const list = filtered.filter((o) => o.module === m);
                if (!list.length) return null;
                return (
                  <div key={`list-${m}`}>
                    <h3 className="mb-2 text-sm font-medium">
                      {t(moduleKey(m))} ({list.length})
                    </h3>
                    <ul className="divide-y rounded-lg border bg-card/80">
                      {list.map((o) => (
                        <li key={o.id}>
                          <Link
                            href={`/observatii/${o.id}`}
                            className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/40"
                          >
                            <span className="font-medium">{o.code}</span>
                            <StatusBadge status={o.status} />
                            <span className="text-muted-foreground">
                              {o.authorName}
                            </span>
                            <span className="text-muted-foreground">
                              {speciesLabel(o, t)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {filtered.length === 0 ? (
                <p className="rounded-lg border bg-card/80 p-6 text-sm text-muted-foreground">
                  {t("lesson.mapEmpty")}
                </p>
              ) : null}
            </div>
          ) : null}

          {reportView === "elev" ? (
            <div className="mt-4 overflow-x-auto rounded-lg border bg-card/80">
              {byStudent.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  {t("lesson.mapEmpty")}
                </p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colStudent")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.colCount")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.analyzed")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.pending")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("lesson.rejected")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t(moduleKey("fenologie"))}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t(moduleKey("perturbari"))}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t(moduleKey("sol"))}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {byStudent.map((row) => (
                      <tr key={row.authorId} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">
                          {row.authorName}
                        </td>
                        <td className="px-3 py-2">{row.total}</td>
                        <td className="px-3 py-2 text-emerald-800">
                          {row.analyzed}
                        </td>
                        <td className="px-3 py-2 text-amber-900">
                          {row.pending}
                        </td>
                        <td className="px-3 py-2 text-red-800">
                          {row.rejected}
                        </td>
                        <td className="px-3 py-2">{row.byModule.fenologie}</td>
                        <td className="px-3 py-2">{row.byModule.perturbari}</td>
                        <td className="px-3 py-2">{row.byModule.sol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
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
