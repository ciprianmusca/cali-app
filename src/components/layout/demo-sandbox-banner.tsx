"use client";

import Link from "next/link";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";

/** Persistent cue while signed into a sandbox demo account. */
export function DemoSandboxBanner() {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  if (!user?.isDemo) return null;

  return (
    <div className="border-b border-amber-500/35 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-50">
      <span className="font-medium">{t("demo.banner")}</span>
      {" · "}
      <Link href="/testeaza" className="underline underline-offset-2">
        {t("nav.tryApp")}
      </Link>
    </div>
  );
}
