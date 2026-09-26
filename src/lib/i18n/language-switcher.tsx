"use client";

import { useI18n } from "@/lib/i18n/use-i18n";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border/70 bg-background/80 p-0.5 text-xs",
        className
      )}
      role="group"
      aria-label={t("nav.language")}
    >
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code as Locale)}
          className={cn(
            "rounded px-2 py-1 font-medium transition-colors",
            locale === l.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={locale === l.code}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
