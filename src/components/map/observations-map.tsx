"use client";

import dynamic from "next/dynamic";
import type { Observation } from "@/lib/types";

const MapInner = dynamic(() => import("./observations-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg border bg-muted/40 text-sm text-muted-foreground">
      Se încarcă harta…
    </div>
  ),
});

export function ObservationsMap({
  observations,
  height = 420,
}: {
  observations: Observation[];
  height?: number;
}) {
  return <MapInner observations={observations} height={height} />;
}
