"use client";

import type { Observation } from "@/lib/types";
import { useCaliStore } from "@/lib/store";

/**
 * Persist + queue sync without blocking the UI thread / navigation.
 * Large photo payloads can freeze localStorage writes if done inline.
 */
export function enqueueObservationSave(obs: Observation): void {
  // Clear a stuck sync banner from a previous attempt.
  useCaliStore.setState({ syncing: false });
  window.setTimeout(() => {
    try {
      useCaliStore.getState().addObservation(obs);
    } catch {
      /* QuotaExceeded or similar — observation may already be partial */
    }
  }, 0);
}
