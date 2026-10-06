"use client";

import dynamic from "next/dynamic";
import type { Observation } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";

function MapLoading({ height }: { height: number }) {
  const { t } = useI18n();
  return (
    <div
      style={{ height }}
      className="flex items-center justify-center rounded-lg border bg-muted/40 text-sm text-muted-foreground"
    >
      {t("map.loading")}
    </div>
  );
}

const MapInner = dynamic(() => import("./observations-map-inner"), {
  ssr: false,
  loading: () => <MapLoading height={420} />,
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
