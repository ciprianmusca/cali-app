"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, ModuleBadge } from "@/components/observations/badges";
import { useCaliStore } from "@/lib/store";
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
  const updateObservation = useCaliStore((s) => s.updateObservation);
  const validateObservation = useCaliStore((s) => s.validateObservation);
  const flushOfflineQueue = useCaliStore((s) => s.flushOfflineQueue);
  const activeActivityId = useCaliStore((s) => s.settings.activeActivityId);
  const setActiveActivityId = useCaliStore((s) => s.setActiveActivityId);
  const [activity, setActivity] = useState<FieldActivity | null>(null);
  const [linked, setLinked] = useState<Observation[]>([]);
  const [attachId, setAttachId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validateComment, setValidateComment] = useState("");
  const [busyObs, setBusyObs] = useState<string | null>(null);

  // All of the user's observations except those already on this activity.
  const attachable = user
    ? observations.filter(
        (o) => o.authorId === user.id && o.activityId !== id
      )
    : [];

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
        // Merge server-linked observations into local store for validation UI.
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

  const attach = () => {
    if (!attachId || !user) return;
    updateObservation(attachId, { activityId: id, syncStatus: "pending" });
    const obs = useCaliStore
      .getState()
      .observations.find((o) => o.id === attachId);
    if (obs) {
      useCaliStore.setState({
        offlineQueue: [
          { ...obs, activityId: id, syncStatus: "pending" },
          ...useCaliStore
            .getState()
            .offlineQueue.filter((o) => o.id !== attachId),
        ],
      });
      void flushOfflineQueue();
    }
    setAttachId("");
    setTimeout(load, 500);
  };

  const canDelete =
    !!user &&
    !!activity &&
    (user.role === "admin" ||
      user.role === "ranger" ||
      (user.role === "profesor" && user.id === activity.createdBy));

  const canValidateHere =
    !!user &&
    !!activity &&
    (user.role === "admin" ||
      user.role === "ranger" ||
      (user.role === "profesor" && user.id === activity.createdBy));

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

  const onValidate = (obsId: string, decision: "aprobat" | "respins") => {
    if (!canValidateHere) return;
    const comment =
      decision === "respins"
        ? validateComment.trim() || t("school.reject")
        : validateComment.trim();
    setBusyObs(obsId);
    const res = validateObservation(obsId, decision, comment);
    if (!res.ok) {
      window.alert(res.error ?? t("school.validateError"));
      setBusyObs(null);
      return;
    }
    setValidateComment("");
    setBusyObs(null);
    setTimeout(load, 400);
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

  const canAttach = user.role === "elev" || user.role === "profesor";
  const showCode =
    user.role === "admin" ||
    user.role === "ranger" ||
    user.role === "profesor";

  // Prefer server list, fall back to local store for offline.
  const displayLinked =
    linked.length > 0
      ? linked
      : observations.filter((o) => o.activityId === id);

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
            {activeActivityId !== id ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setActiveActivityId(id)}
              >
                {t("school.setActive")}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("school.activeHint")}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("school.joinCodeHint")}
          </p>
        </div>
      ) : null}

      {!showCode && activeActivityId !== id ? (
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveActivityId(id)}
          >
            {t("school.setActive")}
          </Button>
        </div>
      ) : null}

      {canAttach ? (
        <div className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border bg-card/80 p-4">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-sm" htmlFor="attach-obs">
              {t("school.attach")}
            </label>
            <select
              id="attach-obs"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={attachId}
              onChange={(e) => setAttachId(e.target.value)}
            >
              <option value="">{t("school.attachPlaceholder")}</option>
              {attachable.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {formatDateTime(o.createdAt)}
                </option>
              ))}
            </select>
            {attachable.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("school.attachEmpty")}
              </p>
            ) : null}
          </div>
          <Button type="button" disabled={!attachId} onClick={attach}>
            {t("school.attach")}
          </Button>
        </div>
      ) : null}

      <h2 className="mt-8 font-display text-xl">{t("school.observations")}</h2>
      {canValidateHere ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {t("lesson.sub")}
        </p>
      ) : null}

      {canValidateHere ? (
        <div className="mt-3 space-y-1">
          <label className="text-sm" htmlFor="val-comment">
            {t("school.validateComment")}
          </label>
          <Input
            id="val-comment"
            value={validateComment}
            onChange={(e) => setValidateComment(e.target.value)}
          />
        </div>
      ) : null}

      <div className="mt-3 divide-y rounded-lg border bg-card/80">
        {displayLinked.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("obs.empty")}</p>
        ) : (
          displayLinked.map((o) => {
            const pending = o.status === "in_asteptare";
            const canAct =
              canValidateHere && pending && o.authorId !== user.id;
            return (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
              >
                <Link
                  href={`/observatii/${o.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2 hover:bg-muted/40"
                >
                  <span className="font-medium">{o.code}</span>
                  <StatusBadge status={o.status} />
                  <ModuleBadge module={o.module} />
                  <span className="text-muted-foreground">{o.authorName}</span>
                  <span className="text-muted-foreground">
                    {formatDateTime(o.createdAt)}
                  </span>
                </Link>
                {canAct ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyObs === o.id}
                      onClick={() => onValidate(o.id, "aprobat")}
                    >
                      {t("school.approve")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busyObs === o.id}
                      onClick={() => onValidate(o.id, "respins")}
                    >
                      {t("school.reject")}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
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
