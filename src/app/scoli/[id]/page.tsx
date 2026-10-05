"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import {
  StatusBadge,
  ModuleBadge,
  ClassroomBadge,
} from "@/components/observations/badges";
import { ClassroomDecisionPanel } from "@/components/observations/classroom-decision-panel";
import { useCaliStore } from "@/lib/store";
import { canTeachSchool } from "@/lib/capabilities";
import { classroomStatusOf } from "@/lib/classroom";
import { useI18n } from "@/lib/i18n/use-i18n";
import { formatDate, formatDateTime } from "@/lib/format";
import type { FieldActivity, Observation } from "@/lib/types";

function safeFormatDate(iso: string): string {
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return formatDate(d.toISOString());
  } catch {
    return iso;
  }
}

function ActivityDetail({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser());
  const observations = useCaliStore((s) => s.observations);
  const activeActivityId = useCaliStore((s) => s.settings.activeActivityId);
  const setActiveActivityId = useCaliStore((s) => s.setActiveActivityId);
  const [activity, setActivity] = useState<FieldActivity | null>(null);
  const [linked, setLinked] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    void fetch(`/api/activities/${encodeURIComponent(id)}`, {
      credentials: "include",
    })
      .then(async (r) => {
        const d = (await r.json()) as {
          ok?: boolean;
          activity?: FieldActivity;
          observations?: Observation[];
        };
        if (!r.ok || !d.activity) {
          setActivity(null);
          setLinked([]);
          setLoadError(true);
          return;
        }
        setActivity(d.activity);
        setLinked(d.observations ?? []);
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
      .catch(() => {
        setActivity(null);
        setLinked([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Elev opening an activity: auto-activate so new + free observations go here.
  useEffect(() => {
    if (!user || !activity) return;
    if (user.role !== "elev") return;
    if (activeActivityId === id) return;
    setActiveActivityId(id);
    const timer = window.setTimeout(load, 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activity?.id, id]);

  const canDelete =
    !!user &&
    !!activity &&
    (user.role === "admin" ||
      (user.role === "ranger" && canTeachSchool(user)) ||
      (canTeachSchool(user) && user.id === activity.createdBy));

  const canDecideClass = !!user && canTeachSchool(user);

  const applyClassroomUpdate = (updated: Observation) => {
    setLinked((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
    );
    useCaliStore.setState((s) => ({
      observations: s.observations.map((o) =>
        o.id === updated.id ? { ...o, ...updated } : o
      ),
    }));
  };

  const onDelete = async () => {
    if (!canDelete || !activity) return;
    if (!window.confirm(t("school.deleteConfirm"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        useCaliStore.setState((s) => ({
          observations: s.observations.map((o) =>
            o.activityId === id ? { ...o, activityId: undefined } : o
          ),
          settings:
            s.settings.activeActivityId === id
              ? { ...s.settings, activeActivityId: undefined }
              : s.settings,
        }));
        router.replace("/scoli");
        return;
      }
      window.alert(t("school.deleteError"));
    } catch {
      window.alert(t("school.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">
        {t("auth.loading")}
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <p>{loadError ? t("school.loadError") : t("school.empty")}</p>
        <Link
          href="/scoli"
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
        >
          {t("school.back")}
        </Link>
      </div>
    );
  }

  const showCode =
    user.role === "admin" ||
    user.role === "ranger" ||
    canTeachSchool(user);

  const displayLinked =
    linked.length > 0
      ? linked
      : observations.filter((o) => o.activityId === id);

  const isParticipant =
    user.role === "elev" || canTeachSchool(user);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted-foreground">
        <Link href="/scoli" className="underline-offset-2 hover:underline">
          {t("school.back")}
        </Link>
        {" · "}
        {t("school.detail")}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-forest">
            {activity.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {safeFormatDate(activity.date)} · {activity.zoneName} (±
            {activity.zoneRadiusM} m)
            {activity.schoolName ? ` · ${activity.schoolName}` : ""}
          </p>
        </div>
        {canDelete ? (
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void onDelete()}
          >
            {deleting ? t("auth.loading") : t("school.delete")}
          </Button>
        ) : null}
      </div>

      {showCode && activity.joinCode ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">{t("school.joinCode")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-background px-3 py-1 font-mono text-lg tracking-widest">
              {activity.joinCode}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyCode(activity.joinCode)}
            >
              {copied ? t("school.copied") : t("school.copyCode")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("school.joinCodeHint")}
          </p>
        </div>
      ) : null}

      {isParticipant ? (
        <div className="mt-4 rounded-lg border bg-card/80 p-4 text-sm">
          <p className="font-medium text-forest">{t("school.autoLinkTitle")}</p>
          <p className="mt-1 text-muted-foreground">
            {activeActivityId === id
              ? t("school.autoLinkActive")
              : t("school.autoLinkHint")}
          </p>
        </div>
      ) : null}

      <h2 className="mt-8 font-display text-xl">{t("school.observations")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("school.obsDiscussHint")}
      </p>

      <div className="mt-3 space-y-3">
        {displayLinked.length === 0 ? (
          <p className="rounded-lg border bg-card/80 p-4 text-sm text-muted-foreground">
            {t("obs.empty")}
          </p>
        ) : (
          displayLinked.map((o) => (
            <div key={o.id} className="rounded-lg border bg-card/80 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href={`/observatii/${o.id}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {o.code}
                </Link>
                <ClassroomBadge status={classroomStatusOf(o)} />
                <ModuleBadge module={o.module} />
                <span className="text-xs text-muted-foreground">
                  {t("class.parkStatus")}:
                </span>
                <StatusBadge status={o.status} />
                <span className="text-muted-foreground">{o.authorName}</span>
                <span className="text-muted-foreground">
                  {formatDateTime(o.createdAt)}
                </span>
              </div>
              {canDecideClass ? (
                <div className="mt-3">
                  <ClassroomDecisionPanel
                    observation={o}
                    compact
                    onUpdated={applyClassroomUpdate}
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const params = useParams<{ id: string }>();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  return (
    <AuthGate>
      {id ? <ActivityDetail id={id} /> : null}
    </AuthGate>
  );
}
