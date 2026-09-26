"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { useCaliStore } from "@/lib/store";
import { PHENOLOGY_STAGES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { ModuleBadge, StatusBadge } from "@/components/observations/badges";
import type { DisturbanceType, PhenologyStage, UserRole } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  disturbanceKey,
  moduleKey,
  phenStageLabelKey,
  roleKey,
} from "@/lib/i18n/labels";

const DISTURBANCE_TYPES: DisturbanceType[] = [
  "atac_insecte",
  "doboratura_vant",
  "uscare",
  "rupturi_zapada",
  "ciuperci",
  "vatamari_vanat",
  "incendiu",
  "alta",
];

export function PublicStats() {
  const { t } = useI18n();
  const observations = useCaliStore((s) => s.observations);
  const users = useCaliStore((s) => s.users);
  const hydrated = useCaliStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t("stats.loading")}
      </div>
    );
  }

  const monthAgo = Date.now() - 30 * 86400000;
  const recent = observations.filter(
    (o) => new Date(o.createdAt).getTime() >= monthAgo
  );
  const activeUsers = users.filter(
    (u) =>
      u.lastLoginAt && new Date(u.lastLoginAt).getTime() >= monthAgo
  ).length;
  const validated = observations
    .filter((o) => o.status === "aprobat")
    .sort(
      (a, b) =>
        new Date(b.validatedAt ?? b.createdAt).getTime() -
        new Date(a.validatedAt ?? a.createdAt).getTime()
    )
    .slice(0, 5);

  const byRole = (["rezident", "turist", "elev"] as UserRole[]).map((role) => ({
    name: t(roleKey(role)),
    count: observations.filter((o) => o.authorRole === role).length,
  }));

  const byStage = ([1, 2, 3, 4, 5] as PhenologyStage[]).map((s) => ({
    name: t(phenStageLabelKey(s)),
    count: observations.filter(
      (o) => o.module === "fenologie" && o.stage === s
    ).length,
    fill: PHENOLOGY_STAGES[s].color,
  }));

  const disturbances = DISTURBANCE_TYPES.map((key) => ({
    name: t(disturbanceKey(key)),
    count: observations.filter(
      (o) =>
        o.module === "perturbari" && o.disturbanceTypes.includes(key)
    ).length,
  })).filter((d) => d.count > 0);

  const approvedCount = observations.filter((o) => o.status === "aprobat").length;

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("stats.activeUsers"), value: activeUsers },
          { label: t("stats.obsMonth"), value: recent.length },
          { label: t("stats.validated"), value: approvedCount },
          {
            label: t("stats.distMonth"),
            value: recent.filter((o) => o.module === "perturbari").length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border/70 bg-card/80 px-4 py-5"
          >
            <div className="text-3xl font-display font-semibold tracking-tight text-forest">
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-xl">{t("stats.byRole")}</h2>
          <div className="h-64 rounded-lg border bg-card/60 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRole}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c5d5c8" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">{t("stats.byRole")}</caption>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1">{t("stats.role")}</th>
                <th>{t("stats.count")}</th>
              </tr>
            </thead>
            <tbody>
              {byRole.map((r) => (
                <tr key={r.name} className="border-t">
                  <td className="py-1.5">{r.name}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl">{t("stats.phenStages")}</h2>
          <div className="h-64 rounded-lg border bg-card/60 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c5d5c8" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byStage.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">{t("stats.phenStages")}</caption>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1">{t("stats.stage")}</th>
                <th>{t("stats.count")}</th>
              </tr>
            </thead>
            <tbody>
              {byStage.map((r) => (
                <tr key={r.name} className="border-t">
                  <td className="py-1.5">{r.name}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {disturbances.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">{t("stats.distTypes")}</h2>
          <ul className="flex flex-wrap gap-2">
            {disturbances.map((d) => (
              <li
                key={d.name}
                className="rounded-md border bg-card/70 px-3 py-1.5 text-sm"
              >
                {d.name}: <strong>{d.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-xl">{t("stats.last5")}</h2>
        <div className="divide-y rounded-lg border bg-card/70">
          {validated.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t("stats.noneValidated")}
            </p>
          ) : (
            validated.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <ModuleBadge module={o.module} />
                <StatusBadge status={o.status} />
                <span className="font-medium">{o.code}</span>
                <span className="text-sm text-muted-foreground">
                  {t(moduleKey(o.module))} · {formatDate(o.createdAt)}
                </span>
                <Link
                  href={`/observatii/${o.id}`}
                  className="ml-auto text-sm text-primary underline-offset-2 hover:underline"
                >
                  {t("obs.details")}
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
