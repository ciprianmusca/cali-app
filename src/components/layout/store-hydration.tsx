"use client";

import { useEffect } from "react";
import { useCaliStore } from "@/lib/store";

export function StoreHydration() {
  useEffect(() => {
    useCaliStore.persist.rehydrate();
    useCaliStore.getState().setHydrated(true);
  }, []);
  return null;
}
