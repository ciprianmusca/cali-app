"use client";

import type { Observation } from "@/lib/types";
import { saveObservationPhotosToIdb } from "@/lib/photo-idb";
import { useCaliStore } from "@/lib/store";

/**
 * Persist + queue sync without blocking the UI thread / navigation.
 * Photos go to IndexedDB; localStorage only keeps idb: refs (SEC-05).
 */
export function enqueueObservationSave(obs: Observation): void {
  useCaliStore.setState({ syncing: false });
  window.setTimeout(() => {
    void (async () => {
      try {
        const photos = await saveObservationPhotosToIdb(
          obs.id,
          obs.photos ?? []
        );
        useCaliStore.getState().addObservation({ ...obs, photos });
      } catch {
        // Quota / IDB failure — still queue metadata; sync may fail photos.
        try {
          useCaliStore.getState().addObservation(obs);
        } catch {
          /* ignore */
        }
      }
    })();
  }, 0);
}
