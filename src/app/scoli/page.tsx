"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlossaryTip } from "@/components/glossary/glossary-tip";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import { PARK_CENTER } from "@/lib/constants";
import type { FieldActivity } from "@/lib/types";
import { formatDate } from "@/lib/format";

function safeFormatDate(iso: string): string {
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return formatDate(d.toISOString());
  } catch {
    return iso;
  }
}

function SchoolsHome() {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const canCreate =
    !!user &&
    (user.role === "admin" ||
      user.role === "ranger" ||
      user.role === "profesor");
  const [activities, setActivities] = useState<FieldActivity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [radius, setRadius] = useState("500");
  const [trees, setTrees] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    void fetch("/api/activities", { credentials: "include" })
      .then((r) => r.json() as Promise<{ activities?: FieldActivity[] }>)
      .then((d) => setActivities(d.activities ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  if (!user) return null;

  const canDelete = (a: FieldActivity) =>
    user.role === "admin" ||
    user.role === "ranger" ||
    (user.role === "profesor" && user.id === a.createdBy);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/activities", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        date,
        zoneName,
        zoneLat: PARK_CENTER.lat,
        zoneLng: PARK_CENTER.lng,
        zoneRadiusM: Number(radius) || 500,
        treeIds: trees
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        schoolName: schoolName || undefined,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setTitle("");
      setDate("");
      setZoneName("");
      setSchoolName("");
      setTrees("");
      load();
    }
  };

  const onDelete = async (a: FieldActivity) => {
    if (!canDelete(a)) return;
    if (!window.confirm(t("school.deleteConfirm"))) return;
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/activities/${encodeURIComponent(a.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        useCaliStore.setState((s) => ({
          observations: s.observations.map((o) =>
            o.activityId === a.id ? { ...o, activityId: undefined } : o
          ),
        }));
        load();
      } else {
        window.alert(t("school.deleteError"));
      }
    } catch {
      window.alert(t("school.deleteError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-forest">
            {t("school.title")}
            <GlossaryTip term="zona_activitate" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("school.sub")}</p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? t("admin.close") : t("school.new")}
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={onCreate}
          className="mt-6 space-y-3 rounded-lg border bg-card/80 p-4"
        >
          <div className="space-y-1">
            <Label>{t("auth.name")}</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("school.date")}</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>
                {t("school.zone")}
                <GlossaryTip term="zona_activitate" />
              </Label>
              <Input
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("school.radius")}</Label>
              <Input
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("school.schoolName")}</Label>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>
              {t("school.trees")}
              <GlossaryTip term="arbore_santinela" />
            </Label>
            <Input value={trees} onChange={(e) => setTrees(e.target.value)} />
          </div>
          <Button type="submit">{t("school.save")}</Button>
        </form>
      ) : null}

      <div className="mt-8 divide-y rounded-lg border bg-card/80">
        {activities.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("school.empty")}</p>
        ) : (
          activities.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <Link href={`/scoli/${a.id}`} className="min-w-0 flex-1 hover:opacity-90">
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground">
                  {safeFormatDate(a.date)} · {a.zoneName}
                  {a.schoolName ? ` · ${a.schoolName}` : ""}
                </div>
              </Link>
              {canDelete(a) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === a.id}
                  onClick={() => void onDelete(a)}
                >
                  {t("school.delete")}
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ScoliPage() {
  return (
    <AuthGate>
      <SchoolsHome />
    </AuthGate>
  );
}
