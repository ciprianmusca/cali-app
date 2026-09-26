"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/layout/auth-gate";
import { useI18n } from "@/lib/i18n/use-i18n";
import { formatDateTime } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";
import { roleKey } from "@/lib/i18n/labels";

function AuditJournal() {
  const { t } = useI18n();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/audit", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { events?: AuditEvent[] };
        setEvents(data.events ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl text-forest">{t("admin.auditTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.auditSub")}</p>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("map.loading")}</p>
      ) : events.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {t("admin.auditEmpty")}
        </p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-lg border bg-card/80 md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("admin.auditWhen")}</th>
                  <th className="px-3 py-2">{t("admin.auditWho")}</th>
                  <th className="px-3 py-2">{t("admin.auditAction")}</th>
                  <th className="px-3 py-2">{t("admin.auditObject")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{formatDateTime(e.at)}</td>
                    <td className="px-3 py-2">
                      {e.actorName} ({t(roleKey(e.actorRole))})
                    </td>
                    <td className="px-3 py-2">{e.action}</td>
                    <td className="px-3 py-2">
                      {e.objectType}:{e.objectId}
                      {e.detail ? (
                        <span className="block text-xs text-muted-foreground">
                          {e.detail}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 space-y-3 md:hidden">
            {events.map((e) => (
              <div key={e.id} className="rounded-lg border bg-card/80 p-3 text-sm">
                <div className="font-medium">{e.action}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(e.at)} · {e.actorName}
                </div>
                <div className="mt-1 text-xs">
                  {e.objectType}:{e.objectId}
                </div>
                {e.detail ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {e.detail}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <AuthGate roles={["admin"]}>
      <AuditJournal />
    </AuthGate>
  );
}
