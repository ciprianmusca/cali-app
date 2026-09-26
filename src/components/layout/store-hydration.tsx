"use client";

import { useEffect } from "react";
import { useCaliStore } from "@/lib/store";
import { useLocaleStore } from "@/lib/i18n/store";

export function StoreHydration() {
  useEffect(() => {
    void (async () => {
      await useCaliStore.persist.rehydrate();
      // Clear any stuck upload spinner left from a previous session.
      useCaliStore.setState({ syncing: false, hydrated: true });
      useLocaleStore.persist.rehydrate();
      const locale = useLocaleStore.getState().locale;
      useLocaleStore.getState().setHydrated(true);
      document.documentElement.lang = locale;

      // Pull canonical data from D1 when online; keep local cache if offline.
      if (navigator.onLine) {
        const res = await useCaliStore.getState().pullFromServer();
        if (res.ok && useCaliStore.getState().currentUserId) {
          void useCaliStore.getState().flushOfflineQueue();
        }
      }
    })();
  }, []);
  return null;
}
