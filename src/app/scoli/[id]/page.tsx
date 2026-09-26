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
  const user = useCaliStore((s) => s.currentUser())!;
  const myPending = useCaliStore((s) =>
    s.observations.filter(
      (o) =>
        o.authorId === user.id &&
        !o.activityId &&
        (o.status === "in_asteptare" || o.status === "clarificare")
    )
  );
  const updateObservation = useCaliStore((s) => s.updateObservation);
  const flushOfflineQueue = useCaliStore((s) => s.flushOfflineQueue);
  const [activity, setActivity] = useState<FieldActivity | null>(null);
  const [linked, setLinked] = useState<Observation[]>([]);
  const [attachId, setAttachId] = useState<string>("");

  const load = () => {
    void fetch(`/api/activities/${id}`, { credentials: "include" })
      .then(
        (r) =>
          r.json() as Promise<{
            activity?: FieldActivity;
            observations?: Observation[];
          }>
      )
      .then((d) => {
        setActivity(d.activity ?? null);
        setLinked(d.observations ?? []);
      });
  };

  useEffect(() => {
    load();
  }, [id]);

  const attach = () => {
    if (!attachId) return;
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

  if (!activity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p>{t("school.empty")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted-foreground">{t("school.detail")}</p>
      <h1 className="font-display text-3xl text-forest">{activity.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDate(activity.date)} · {activity.zoneName} (±{activity.zoneRadiusM}{" "}
        m)
        {activity.schoolName ? ` · ${activity.schoolName}` : ""}
      </p>

      {user.role === "elev" || user.role === "profesor" ? (
        <div className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border bg-card/80 p-4">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-sm">{t("school.attach")}</label>
            <Select value={attachId} onValueChange={(v) => setAttachId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {myPending.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.code} · {formatDateTime(o.createdAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
