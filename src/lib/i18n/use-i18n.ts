"use client";

import { useCallback } from "react";
import { useLocaleStore, translate, type MsgKey } from "./store";
import type { Locale } from "./types";

export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const hydrated = useLocaleStore((s) => s.hydrated);

  const t = useCallback(
    (key: MsgKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  );

  return { locale, setLocale, t, hydrated };
}

export function useLocale(): Locale {
  return useLocaleStore((s) => s.locale);
}
