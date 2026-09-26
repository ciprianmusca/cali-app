"use client";

import { useI18n } from "@/lib/i18n/use-i18n";

export default function PoliticaDatePage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 prose-none">
      <h1 className="font-display text-3xl text-forest">{t("policy.title")}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {t("policy.version")}
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <h2 className="font-display text-xl">{t("policy.operator")}</h2>
        <p>{t("policy.operatorText")}</p>

        <h2 className="font-display text-xl">{t("policy.categories")}</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("policy.cat1")}</li>
          <li>{t("policy.cat2")}</li>
          <li>{t("policy.cat3")}</li>
        </ul>

        <h2 className="font-display text-xl">{t("policy.purpose")}</h2>
        <p>{t("policy.purposeText")}</p>

        <h2 className="font-display text-xl">{t("policy.retention")}</h2>
        <p>{t("policy.retentionText")}</p>

        <h2 className="font-display text-xl">{t("policy.students")}</h2>
        <p>{t("policy.studentsText")}</p>
      </section>
    </div>
  );
}
