"use client";

import Link from "next/link";
import { PartnerLogos } from "@/components/layout/partner-logos";
import { useI18n } from "@/lib/i18n/use-i18n";

export function AppFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-border/60 bg-forest text-primary-foreground">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
          <div className="space-y-3 text-sm leading-relaxed text-primary-foreground/90">
            <div className="flex flex-wrap items-center gap-4">
              {/* Official EU funded emblem (flag + text) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/eu-funded.svg"
                alt={t("footer.euEmblem")}
                className="h-16 w-auto rounded-sm bg-white px-2 py-1 shadow-sm sm:h-20"
                width={120}
                height={104}
              />
              <div>
                <p className="font-medium">{t("footer.fundedBy")}</p>
                <p className="text-primary-foreground/70">
                  EFI · FORWARDS · Climate-Smart Forestry
                </p>
              </div>
            </div>
            <p className="max-w-2xl text-xs text-primary-foreground/65">
              {t("footer.disclaimer")}
            </p>
            <p className="text-xs text-primary-foreground/70">
              CALI-LAB · Grant Agreement G-07-2025-2 · ISV &amp;{" "}
              {t("footer.apncFull")}
            </p>
            <p className="text-xs">
              <a
                href="mailto:contact@ipsv.ro"
                className="underline-offset-2 hover:underline"
              >
                contact@ipsv.ro
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <Link href="/despre" className="underline-offset-2 hover:underline">
              {t("nav.about")}
            </Link>
            <Link href="/ghid" className="underline-offset-2 hover:underline">
              {t("nav.guide")}
            </Link>
            <Link
              href="/intrebari-frecvente"
              className="underline-offset-2 hover:underline"
            >
              {t("nav.faq")}
            </Link>
            <Link href="/contact" className="underline-offset-2 hover:underline">
              {t("nav.contact")}
            </Link>
            <Link
              href="/politica-date"
              className="underline-offset-2 hover:underline"
            >
              {t("footer.dataPolicy")}
            </Link>
            <Link href="/harta" className="underline-offset-2 hover:underline">
              {t("footer.obsMap")}
            </Link>
            <Link
              href="/testeaza"
              className="underline-offset-2 hover:underline"
            >
              {t("nav.tryApp")}
            </Link>
            <a
              href="https://www.ipsv.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              ipsv.ro
            </a>
            <a
              href="https://calimani.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {t("footer.apncSite")}
            </a>
          </div>
        </div>

        <div className="border-t border-primary-foreground/15 pt-6">
          <p className="mb-4 text-center text-xs text-primary-foreground/60">
            {t("partners.band")}
          </p>
          <div className="rounded-lg bg-white/95 px-6 py-5">
            <PartnerLogos />
          </div>
        </div>
      </div>
    </footer>
  );
}
