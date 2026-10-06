"use client";

import Link from "next/link";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";

/** Cue on new-observation forms for elevi: linked activity + offline reminder. */
export function ActiveActivityHint() {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const activeId = useCaliStore((s) => s.settings.activeActivityId);
  const title = useCaliStore((s) => s.settings.activeActivityTitle);
  const pending = useCaliStore((s) => s.offlineQueue.length);

  if (user?.role !== "elev") return null;

  if (!activeId) {
    return (
      <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {t("school.offlineNoActivity")}{" "}
        <Link href="/scoli" className="text-primary underline">
          {t("nav.schools")}
        </Link>
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
      <p className="font-medium text-forest">
        {t("school.active")}: {title?.trim() || activeId}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("school.offlineCaptureHint")}
        {pending > 0
          ? ` · ${t("offline.pending", { count: pending })}`
          : ""}
      </p>
    </div>
  );
}
