"use client";

import { useI18n } from "@/lib/i18n/use-i18n";

const PARTNERS = [
  { src: "/logos/isv.svg", altKey: "partners.isv" as const, href: "https://www.ipsv.ro" },
  { src: "/logos/apnc.svg", altKey: "partners.apnc" as const, href: "https://calimani.info" },
  { src: "/logos/efi.svg", altKey: "partners.efi" as const, href: "https://efi.int" },
];

export function PartnerLogos({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center justify-center gap-8 md:gap-12"
      }
    >
      {PARTNERS.map((p) => (
        <a
          key={p.src}
          href={p.href}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.src}
            alt={t(p.altKey)}
            className="h-10 w-auto max-w-[140px] object-contain sm:h-12"
          />
        </a>
      ))}
    </div>
  );
}
