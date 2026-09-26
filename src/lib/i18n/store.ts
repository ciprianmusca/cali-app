"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "./types";
import { ro, type RoMessages } from "./messages/ro";
import { en } from "./messages/en";

const catalogs: Record<Locale, Record<string, string>> = { ro, en };

type Vars = Record<string, string | number>;

interface LocaleState {
  locale: Locale;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  setHydrated: (v: boolean) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "ro",
      hydrated: false,
      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") {
          document.documentElement.lang = locale;
        }
      },
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "cali-locale",
      skipHydration: true,
      partialize: (s) => ({ locale: s.locale }),
    }
  )
);

export type MsgKey = keyof RoMessages;

export function translate(
  locale: Locale,
  key: MsgKey,
  vars?: Vars
): string {
  const table = catalogs[locale] ?? catalogs.ro;
  let text = table[key] ?? catalogs.ro[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

/** For non-React code (store errors, etc.) */
export function tKey(key: MsgKey, vars?: Vars): string {
  const locale = useLocaleStore.getState().locale;
  return translate(locale, key, vars);
}
