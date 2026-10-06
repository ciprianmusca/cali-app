"use client";

import { useEffect } from "react";
import { useCaliStore } from "@/lib/store";
import { useLocaleStore } from "@/lib/i18n/store";

/**
 * Hydrate localStorage, then:
 * - online: bootstrap from server (authoritative session) + flush queue
 * - offline: restore lastSessionUserId so elevi can keep capturing after a
 *   PWA reload in the field (activityId + offlineQueue already persisted)
 */
export function StoreHydration() {
  useEffect(() => {
    void (async () => {
      await useCaliStore.persist.rehydrate();
      useLocaleStore.persist.rehydrate();
      const locale = useLocaleStore.getState().locale;
      useLocaleStore.getState().setHydrated(true);
      document.documentElement.lang = locale;

      // Start without a live session until we know online/offline outcome.
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
      } else {
        // Offline field mode: reuse cached PublicUser from last online session.
        const { lastSessionUserId, users } = useCaliStore.getState();
        if (
          lastSessionUserId &&
          users.some((u) => u.id === lastSessionUserId && u.status === "activ")
        ) {
          useCaliStore.setState({ currentUserId: lastSessionUserId });
        }
      }

      useCaliStore.setState({ hydrated: true, syncing: false });
    })();
  }, []);
  return null;
}
