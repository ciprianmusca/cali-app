"use client";

import Link from "next/link";
import { PublicStats } from "@/components/stats/public-stats";
import { PartnerLogos } from "@/components/layout/partner-logos";
import { buttonVariants } from "@/components/ui/button";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const startHref = user ? "/acasa" : "/inregistrare";

  return (
    <div>
      <section className="relative min-h-[88dvh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-calimani.jpg"
          alt={t("landing.heroAlt")}
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0a1610]/92 via-[#0a1610]/55 to-[#0a1610]/35"
          aria-hidden
        />
        <div
          className="animate-mist absolute top-[18%] left-[10%] h-24 w-2/3 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[88dvh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 text-white">
          <h1 className="animate-rise max-w-2xl font-display text-3xl font-medium leading-snug tracking-tight text-white sm:text-4xl md:text-5xl">
            {t("landing.headline")}
          </h1>
          <p className="animate-rise-delay-1 mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            {t("landing.sub")}
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href={startHref}
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-white text-forest hover:bg-white/90"
              )}
            >
              {t("landing.ctaStart")}
            </Link>
            <Link
              href="/harta"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-white/40 bg-transparent text-white hover:bg-white/10"
              )}
            >
              {t("landing.ctaMap")}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl tracking-tight text-forest">
            {t("landing.howTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("landing.howSub")}
          </p>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {(
              [
                ["landing.how1Title", "landing.how1Body"],
                ["landing.how2Title", "landing.how2Body"],
                ["landing.how3Title", "landing.how3Body"],
              ] as const
            ).map(([title, body], i) => (
              <li key={title} className="relative">
                <span className="font-display text-4xl text-moss/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-xl text-forest">
                  {t(title)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border/60 bg-mist/40">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {t("partners.band")}
          </p>
          <div className="rounded-lg border bg-white/90 px-6 py-6">
            <PartnerLogos />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-3xl tracking-tight text-forest">
            {t("landing.statsTitle")}
          </h2>
          <p className="mt-2 text-muted-foreground">{t("landing.statsSub")}</p>
        </div>
        <PublicStats />
      </section>
    </div>
  );
}
