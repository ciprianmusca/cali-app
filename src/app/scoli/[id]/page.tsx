"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, ModuleBadge } from "@/components/observations/badges";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import { formatDate, formatDateTime } from "@/lib/format";
import type { FieldActivity, Observation } from "@/lib/types";

function ActivityDetail({ id }: { id: string }) {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const observations = useCaliStore((s) => s.observations);
  const updateObservation = useCaliStore((s) => s.updateObservation);
  const flushOfflineQueue = useCaliStore((s) => s.flushOfflineQueue);
  const [activity, setActivity] = useState<FieldActivity | null>(null);
  const [linked, setLinked] = useState<Observation[]>([]);
  const [attachId, setAttachId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const myPending = user
    ? observations.filter(
        (o) =>
          o.authorId === user.id &&
          !o.activityId &&
          (o.status === "in_asteptare" || o.status === "clarificare")
      )
    : [];

  const load = () => {
    setLoading(true);
    setLoadError(false);
    void fetch(`/api/activities/${id}`, { credentials: "include" })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when id changes
  }, [id]);

  const attach = () => {
    if (!attachId || !user) return;
    updateObservation(attachId, { activityId: id, syncStatus: "pending" });
    const obs = useCaliStore.getState().observations.find((o) => o.id === attachId);
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted-foreground">
        <Link href="/scoli" className="underline-offset-2 hover:underline">
          {t("school.back")}
        </Link>
        {" · "}
        {t("school.detail")}
      </p>
      <h1 className="font-display text-3xl text-forest">{activity.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDate(activity.date)} · {activity.zoneName} (±{activity.zoneRadiusM}{" "}
        m)
        {activity.schoolName ? ` · ${activity.schoolName}` : ""}
      </p>

      {canAttach ? (
        <div className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border bg-card/80 p-4">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-sm">{t("school.attach")}</label>
            <Select
              value={attachId || undefined}
              onValueChange={(v) => setAttachId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("school.attachPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {myPending.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.code} · {formatDateTime(o.createdAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {myPending.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("school.attachEmpty")}
              </p>
            ) : null}
          </div>
          <Button disabled={!attachId} onClick={attach}>
            {t("school.attach")}
          </Button>
        </div>
      ) : null}

      <h2 className="mt-8 font-display text-xl">{t("school.observations")}</h2>
      <div className="mt-3 divide-y rounded-lg border bg-card/80">
        {linked.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("obs.empty")}</p>
        ) : (
          linked.map((o) => (
            <Link
              key={o.id}
              href={`/observatii/${o.id}`}
              className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-muted/40"
            >
              <span className="font-medium">{o.code}</span>
              <StatusBadge status={o.status} />
              <ModuleBadge module={o.module} />
              <span className="text-muted-foreground">
                {formatDateTime(o.createdAt)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGate>
      <ActivityDetail id={id} />
    </AuthGate>
  );
}
