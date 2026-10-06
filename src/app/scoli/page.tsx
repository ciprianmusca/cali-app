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
import { canTeachSchool } from "@/lib/capabilities";
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
  const activeActivityId = useCaliStore((s) => s.settings.activeActivityId);
  const setActiveActivityId = useCaliStore((s) => s.setActiveActivityId);
  const canCreate = canTeachSchool(user);
  const canJoin =
    !!user &&
    (user.role === "elev" ||
      user.role === "admin" ||
      canTeachSchool(user));
  const [activities, setActivities] = useState<FieldActivity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [radius, setRadius] = useState("500");
  const [trees, setTrees] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    (user.role === "ranger" && canTeachSchool(user)) ||
    (canTeachSchool(user) && user.id === a.createdBy);

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
      const data = (await res.json()) as { activity?: FieldActivity };
      setShowForm(false);
      setTitle("");
      setDate("");
      setZoneName("");
      setSchoolName("");
      setTrees("");
      if (data.activity?.joinCode) {
        setCreatedCode(data.activity.joinCode);
        setActiveActivityId(data.activity.id, data.activity.title);
      }
      load();
    }
  };

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    setJoinBusy(true);
    setJoinMsg(null);
    setJoinErr(null);
    try {
      const res = await fetch("/api/activities/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        activity?: FieldActivity;
      };
      if (!res.ok || !data.activity) {
        setJoinErr(t("school.joinError"));
        return;
      }
      setJoinMsg(t("school.joinOk"));
      setJoinCode("");
      setActiveActivityId(data.activity.id, data.activity.title);
      load();
    } catch {
      setJoinErr(t("school.joinError"));
    } finally {
      setJoinBusy(false);
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
          settings:
            s.settings.activeActivityId === a.id
              ? { ...s.settings, activeActivityId: undefined }
              : s.settings,
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

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const active = activities.find((a) => a.id === activeActivityId) ?? null;

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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/scoli/lectie"
              className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
            >
              {t("school.lessonCta")}
            </Link>
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t("admin.close") : t("school.new")}
            </Button>
          </div>
        ) : null}
      </div>

      {createdCode ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">{t("school.createdCode")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-background px-3 py-1 font-mono text-lg tracking-widest">
              {createdCode}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyCode(createdCode)}
            >
              {copied ? t("school.copied") : t("school.copyCode")}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("school.joinCodeHint")}
          </p>
        </div>
      ) : null}

      {canJoin ? (
        <form
          onSubmit={onJoin}
          className="mt-6 space-y-3 rounded-lg border bg-card/80 p-4"
        >
          <div>
            <h2 className="font-medium">{t("school.joinTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("school.joinSub")}</p>
            {user?.role === "elev" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("school.offlineJoinHint")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1 space-y-1">
              <Label htmlFor="join-code">{t("school.joinCode")}</Label>
              <Input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t("school.joinPlaceholder")}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>
            <Button type="submit" disabled={joinBusy || !joinCode.trim()}>
              {joinBusy ? t("auth.loading") : t("school.joinSubmit")}
            </Button>
          </div>
          {joinMsg ? (
            <p className="text-sm text-forest">{joinMsg}</p>
          ) : null}
          {joinErr ? (
            <p className="text-sm text-destructive">{joinErr}</p>
          ) : null}
        </form>
      ) : null}

      {active ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <div>
            <span className="font-medium">{t("school.active")}: </span>
            {active.title}
            <span className="text-muted-foreground">
              {" "}
              · {t("school.joinCode")} {active.joinCode}
            </span>
            <p className="text-xs text-muted-foreground">
              {user?.role === "elev"
                ? t("school.offlineJoinHint")
                : t("school.activeHint")}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveActivityId(undefined)}
          >
            {t("school.clearActive")}
          </Button>
        </div>
      ) : null}

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
          <p className="p-6 text-sm text-muted-foreground">
            {canJoin ? t("school.empty") : t("school.memberOnly")}
          </p>
        ) : (
          activities.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <Link
                href={`/scoli/${a.id}`}
                className="min-w-0 flex-1 hover:opacity-90"
              >
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground">
                  {safeFormatDate(a.date)} · {a.zoneName}
                  {a.schoolName ? ` · ${a.schoolName}` : ""}
                  {a.joinCode ? ` · ${t("school.joinCode")} ${a.joinCode}` : ""}
                </div>
              </Link>
              <div className="flex flex-wrap gap-2">
                {activeActivityId !== a.id ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveActivityId(a.id, a.title)}
                  >
                    {t("school.setActive")}
                  </Button>
                ) : null}
                {canDelete(a) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busyId === a.id}
                    onClick={() => void onDelete(a)}
                  >
                    {busyId === a.id ? t("auth.loading") : t("school.delete")}
                  </Button>
                ) : null}
              </div>
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
