"use client";

import { useEffect } from "react";
import { useCaliStore } from "@/lib/store";
import { useLocaleStore } from "@/lib/i18n/store";

export function StoreHydration() {
  useEffect(() => {
    useCaliStore.persist.rehydrate();
    useCaliStore.getState().setHydrated(true);
    useLocaleStore.persist.rehydrate();
    const locale = useLocaleStore.getState().locale;
    useLocaleStore.getState().setHydrated(true);
    document.documentElement.lang = locale;

    // Pull canonical data from D1 when online; keep local cache if offline.
    if (navigator.onLine) {
      void useCaliStore.getState().pullFromServer().then((res) => {
        if (res.ok) {
          void useCaliStore.getState().flushOfflineQueue();
        }
      });
    }
  }, []);
  return null;
}
