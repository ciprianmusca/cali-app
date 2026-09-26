"use client";

import dynamic from "next/dynamic";
import type { GeoLocation } from "@/lib/types";

const Inner = dynamic(() => import("./location-mini-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-lg border text-sm text-muted-foreground">
      …
    </div>
  ),
});

interface Props {
  value: GeoLocation;
  onChange: (loc: GeoLocation, adjusted: boolean) => void;
}

/** DATA-13: mini-map with draggable pin. */
export function LocationMiniMap(props: Props) {
  return <Inner {...props} />;
}
