"use client";

import { PartnerLogos } from "@/components/layout/partner-logos";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function DesprePage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-forest">{t("about.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("about.lead")}</p>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl text-forest">
          {t("about.projectTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-foreground/90">
          {t("about.projectBody")}
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl text-forest">
          {t("about.partnersTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("about.partnersBody")}</p>
        <div className="rounded-lg border bg-card/60 px-6 py-8">
          <PartnerLogos />
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl text-forest">
          {t("about.teamTitle")}
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>ISV</strong> — {t("about.teamIsv")}
          </li>
          <li>
            <strong>APNC</strong> — {t("about.teamApnc")}
          </li>
          <li>
            <strong>EFI / ForestWard</strong> — {t("about.teamEfi")}
          </li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-display text-2xl text-forest">
          {t("about.dataFlowTitle")}
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>{t("about.dataFlow1")}</li>
          <li>{t("about.dataFlow2")}</li>
          <li>{t("about.dataFlow3")}</li>
          <li>{t("about.dataFlow4")}</li>
        </ol>
      </section>
    </div>
  );
}
