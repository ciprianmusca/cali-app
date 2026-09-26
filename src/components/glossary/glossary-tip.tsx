"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { GlossaryTermId } from "@/lib/glossary";
import type { MsgKey } from "@/lib/i18n/store";
import { cn } from "@/lib/utils";

export function GlossaryTip({
  term,
  className,
}: {
  term: GlossaryTermId;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const titleKey = `glossary.${term}.title` as MsgKey;
  const bodyKey = `glossary.${term}.body` as MsgKey;

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        className="ml-1 inline-flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground hover:bg-muted"
        aria-label={t(titleKey)}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border bg-card p-2 text-xs shadow-md"
        >
          <strong className="block text-foreground">{t(titleKey)}</strong>
          <span className="mt-1 block text-muted-foreground">{t(bodyKey)}</span>
        </span>
      ) : null}
    </span>
  );
}
