"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";

/** DES-10: sync <html lang>, title and meta description with active locale. */
export function LocaleDocument() {
  const { locale, t } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("meta.title");
    const desc = t("meta.description");
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", desc);

    const setOg = (property: string, content: string) => {
      let m = document.querySelector(`meta[property="${property}"]`);
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("property", property);
        document.head.appendChild(m);
      }
      m.setAttribute("content", content);
    };
    setOg("og:title", t("meta.title"));
    setOg("og:description", desc);
    setOg("og:locale", locale === "en" ? "en_GB" : "ro_RO");
  }, [locale, t]);

  return null;
}
