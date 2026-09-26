"use client";

import { useEffect } from "react";
import { useCaliStore } from "@/lib/store";
import { useLocaleStore } from "@/lib/i18n/store";

export function StoreHydration() {
  useEffect(() => {
    void (async () => {
      await useCaliStore.persist.rehydrate();
      useLocaleStore.persist.rehydrate();
      const locale = useLocaleStore.getState().locale;
      useLocaleStore.getState().setHydrated(true);
      document.documentElement.lang = locale;

      // Auth is never taken from localStorage — clear until bootstrap answers.
      useCaliStore.setState({
        currentUserId: null,
        syncing: false,
        hydrated: false,
      });

      if (navigator.onLine) {
        const res = await useCaliStore.getState().pullFromServer();
        if (res.ok && useCaliStore.getState().currentUserId) {
          void useCaliStore.getState().flushOfflineQueue();
        }
      }

      useCaliStore.setState({ hydrated: true, syncing: false });
    })();
  }, []);
  return null;
}
