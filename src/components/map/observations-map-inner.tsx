"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet.markercluster";
import Link from "next/link";
import type { Observation, ObservationModule } from "@/lib/types";
import { MODULE_COLORS } from "@/lib/constants";
import { formatCoord, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey, statusKey } from "@/lib/i18n/labels";
import { ObservationThumb } from "@/components/observations/observation-thumb";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

/** Inline SVG glyphs for map pins (fenologie / perturbări / sol). */
const MODULE_GLYPH: Record<ObservationModule, string> = {
  fenologie:
    '<path fill="#fff" d="M16 9.2c-.9-2.2.4-4.4 2.4-4.4s3.3 2.2 2.4 4.4c1.9-.8 4.1.6 4.1 2.6s-2.2 3.3-4.1 2.6c.9 2.2-.4 4.4-2.4 4.4s-3.3-2.2-2.4-4.4c-1.9.8-4.1-.6-4.1-2.6s2.2-3.3 4.1-2.6z"/><circle cx="18.4" cy="11.8" r="2.2" fill="#fff" opacity=".85"/>',
  perturbari:
    '<path fill="#fff" d="M16 6.5 26 24.5H6L16 6.5zm0 4.2 6.4 11.3H9.6L16 10.7z"/><rect x="15.1" y="14.2" width="1.8" height="5.2" rx=".6" fill="#1a1a1a"/><circle cx="16" cy="21.6" r="1.1" fill="#1a1a1a"/>',
  sol: '<path fill="#fff" d="M8 12.5 16 8l8 4.5-8 4.5-8-4.5zm0 5.5 8 4.5 8-4.5M8 23.5l8 4.5 8-4.5" stroke="#fff" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
};

function observationIcon(
  module: ObservationModule,
  faded: boolean
): L.DivIcon {
  const color = MODULE_COLORS[module];
  const opacity = faded ? 0.62 : 1;
  const glyph = MODULE_GLYPH[module];
  return L.divIcon({
    className: "cali-obs-marker",
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -36],
    html: `<div style="opacity:${opacity};filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));line-height:0">
      <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M17 42s14-13.2 14-25A14 14 0 1 0 3 17c0 11.8 14 25 14 25z" fill="${color}" stroke="#fff" stroke-width="2.4"/>
        <g transform="translate(-1.4,-2) scale(.95)">${glyph}</g>
      </svg>
    </div>`,
  });
}

function clusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 50 ? 46 : 52;
  return L.divIcon({
    className: "cali-cluster-wrap",
    iconSize: L.point(size, size),
    html: `<div class="cali-cluster" style="width:${size}px;height:${size}px">
      <span>${count}</span>
    </div>`,
  });
}

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

  const icons = useMemo(() => {
    const map = {} as Record<
      ObservationModule,
      { solid: L.DivIcon; faded: L.DivIcon }
    >;
    (["fenologie", "perturbari", "sol"] as ObservationModule[]).forEach(
      (m) => {
        map[m] = {
          solid: observationIcon(m, false),
          faded: observationIcon(m, true),
        };
      }
    );
    return map;
  }, []);

  return (
    <div style={{ height }} className="cali-map overflow-hidden rounded-lg border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        {/* UI-13: decorative map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://opentopomap.org">OpenTopoMap</a>'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            load: (e) => {
              const el = (e.target as { getContainer?: () => HTMLElement })
                .getContainer?.();
              if (el) el.setAttribute("aria-hidden", "true");
            },
          }}
        />
        <FitBounds observations={observations} />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={56}
          spiderfyOnMaxZoom
          zoomToBoundsOnClick
          spiderfyDistanceMultiplier={1.6}
          iconCreateFunction={clusterIcon}
        >
          {observations.map((o) => (
            <Marker
              key={o.id}
              position={[o.location.latitude, o.location.longitude]}
              icon={
                o.status === "aprobat"
                  ? icons[o.module].solid
                  : icons[o.module].faded
              }
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
                    alt={t(moduleKey(o.module))}
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
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
