"use client";

import { useI18n } from "@/lib/i18n/use-i18n";

const MODULES = [
  {
    id: "fenologie",
    titleKey: "guide.phenTitle" as const,
    bodyKey: "guide.phenBody" as const,
    good: "/guide/fenologie-bun.jpg",
    bad: "/guide/fenologie-gresit.jpg",
  },
  {
    id: "perturbari",
    titleKey: "guide.distTitle" as const,
    bodyKey: "guide.distBody" as const,
    good: "/guide/perturbari-bun.jpg",
    bad: "/guide/perturbari-gresit.jpg",
  },
  {
    id: "sol",
    titleKey: "guide.soilTitle" as const,
    bodyKey: "guide.soilBody" as const,
    good: "/guide/sol-bun.jpg",
    bad: "/guide/sol-gresit.jpg",
  },
];

export default function GhidPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl text-forest">{t("guide.title")}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("guide.lead")}</p>

      <div className="mt-12 space-y-14">
        {MODULES.map((m) => (
          <section key={m.id} id={m.id} className="space-y-4">
            <h2 className="font-display text-2xl text-forest">{t(m.titleKey)}</h2>
            <p className="text-sm leading-relaxed text-foreground/90">
              {t(m.bodyKey)}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <figure className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.good}
                  alt={t("guide.goodAlt")}
                  className="aspect-[8/5] w-full rounded-md object-cover"
                />
                <figcaption className="text-xs font-medium text-emerald-800">
                  {t("guide.goodCaption")}
                </figcaption>
              </figure>
              <figure className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.bad}
                  alt={t("guide.badAlt")}
                  className="aspect-[8/5] w-full rounded-md object-cover"
                />
                <figcaption className="text-xs font-medium text-amber-900">
                  {t("guide.badCaption")}
                </figcaption>
              </figure>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
