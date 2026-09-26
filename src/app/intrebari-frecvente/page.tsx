"use client";

import { useI18n } from "@/lib/i18n/use-i18n";

const FAQ_KEYS = [
  ["faq.q1", "faq.a1"],
  ["faq.q2", "faq.a2"],
  ["faq.q3", "faq.a3"],
  ["faq.q4", "faq.a4"],
  ["faq.q5", "faq.a5"],
  ["faq.q6", "faq.a6"],
] as const;

export default function FaqPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-forest">{t("faq.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("faq.lead")}</p>

      <div className="mt-10 space-y-4">
        {FAQ_KEYS.map(([q, a]) => (
          <details
            key={q}
            className="group rounded-lg border bg-card/70 px-4 py-3 open:bg-card"
          >
            <summary className="cursor-pointer list-none font-medium text-forest marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {t(q)}
                <span className="text-muted-foreground transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t(a)}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
