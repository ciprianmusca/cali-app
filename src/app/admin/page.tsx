"use client";

import Link from "next/link";
import { AuthGate } from "@/components/layout/auth-gate";
import { buttonVariants } from "@/components/ui/button";
import { useCaliStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey, roleKey, statusKey } from "@/lib/i18n/labels";
import type { Observation } from "@/lib/types";

/** ADM-16: last action = validatedAt ?? createdAt (exports appear via audit page). */
function lastActionAt(o: Observation): number {
  return new Date(o.validatedAt ?? o.createdAt).getTime();
}

function AdminHome() {
  const { t } = useI18n();
  const observations = useCaliStore((s) => s.observations);
  const users = useCaliStore((s) => s.users);
  const pending = observations.filter((o) => o.status === "in_asteptare").length;
  const recent = [...observations]
    .sort((a, b) => lastActionAt(b) - lastActionAt(a))
    .slice(0, 8);

  const exportFairCsv = () => {
    window.location.href = "/api/export?format=csv";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl text-forest">{t("admin.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.sub")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card/80 px-4 py-5">
          <div className="text-sm text-muted-foreground">{t("admin.toValidate")}</div>
          <div className="font-display text-3xl text-forest">{pending}</div>
          <Link href="/validare" className="mt-2 inline-block text-sm text-primary underline">
            {t("admin.openQueue")}
          </Link>
        </div>
        <div className="rounded-lg border bg-card/80 px-4 py-5">
          <div className="text-sm text-muted-foreground">{t("admin.users")}</div>
          <div className="font-display text-3xl text-forest">{users.length}</div>
          <Link
            href="/admin/utilizatori"
            className="mt-2 inline-block text-sm text-primary underline"
          >
            {t("admin.manageUsers")}
          </Link>
        </div>
        <div className="rounded-lg border bg-card/80 px-4 py-5">
          <div className="text-sm text-muted-foreground">{t("admin.auditTitle")}</div>
          <Link
            href="/admin/jurnal"
            className="mt-3 inline-block text-sm text-primary underline"
          >
            {t("admin.openAudit")}
          </Link>
        </div>
        <div className="rounded-lg border bg-card/80 px-4 py-5">
          <div className="text-sm text-muted-foreground">{t("admin.fairExport")}</div>
          <button
            type="button"
            onClick={exportFairCsv}
            className={cn(buttonVariants({ size: "sm" }), "mt-3")}
          >
            {t("admin.downloadCsv")}
          </button>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl">{t("admin.recent")}</h2>
        <div className="mt-3 divide-y rounded-lg border bg-card/80">
          {recent.map((o) => (
            <Link
              key={o.id}
              href={`/observatii/${o.id}`}
              className="flex flex-wrap gap-2 px-4 py-3 text-sm hover:bg-muted/40"
            >
              <span className="font-medium">
                {formatDateTime(o.validatedAt ?? o.createdAt)}
              </span>
              <span>{o.code}</span>
              <span>{t(moduleKey(o.module))}</span>
              <span>{t(statusKey(o.status))}</span>
              <span className="text-muted-foreground">
                {t(roleKey(o.authorRole))}
              </span>
              {o.validatedAt ? (
                <span className="text-xs text-muted-foreground">
                  ({t("obs.validatedBy")})
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGate roles={["admin"]}>
      <AdminHome />
    </AuthGate>
  );
}
