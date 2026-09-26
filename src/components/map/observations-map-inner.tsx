"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import Link from "next/link";
import type { Observation } from "@/lib/types";
import { MODULE_COLORS } from "@/lib/constants";
import { formatCoord, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey, statusKey } from "@/lib/i18n/labels";
import { ObservationThumb } from "@/components/observations/observation-thumb";
import "leaflet/dist/leaflet.css";

function FitBounds({ observations }: { observations: Observation[] }) {
  const map = useMap();
  useEffect(() => {
    if (!observations.length) return;
    const lats = observations.map((o) => o.location.latitude);
    const lngs = observations.map((o) => o.location.longitude);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [40, 40], maxZoom: 12 }
    );
  }, [observations, map]);
  return null;
}

export default function ObservationsMapInner({
  observations,
  height,
}: {
  observations: Observation[];
  height: number;
}) {
  const { t } = useI18n();
  const center = useMemo(() => {
    if (!observations.length) return { lat: 47.125, lng: 25.175 };
    const lat =
      observations.reduce((s, o) => s + o.location.latitude, 0) /
      observations.length;
    const lng =
      observations.reduce((s, o) => s + o.location.longitude, 0) /
      observations.length;
    return { lat, lng };
  }, [observations]);

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://opentopomap.org">OpenTopoMap</a>'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        />
        <FitBounds observations={observations} />
        {observations.map((o) => (
          <CircleMarker
            key={o.id}
            center={[o.location.latitude, o.location.longitude]}
            radius={8}
            pathOptions={{
              color: "#fff",
              weight: 1,
              fillColor: MODULE_COLORS[o.module],
              fillOpacity: o.status === "aprobat" ? 0.9 : 0.55,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <div className="font-medium">{o.code}</div>
                <div>
                  {t(moduleKey(o.module))} · {t(statusKey(o.status))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCoord(o.location.latitude)},{" "}
                  {formatCoord(o.location.longitude)}
                </div>
                <div className="text-xs">{formatDateTime(o.createdAt)}</div>
                <ObservationThumb
                  module={o.module}
                  src={o.photos[0]}
                  className="mt-1 h-20 w-full rounded"
                />
                <Link
                  href={`/observatii/${o.id}`}
                  className="text-emerald-800 underline"
                >
                  {t("obs.details")}
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
