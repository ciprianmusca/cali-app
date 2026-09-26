"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GeoLocation } from "@/lib/types";
import { roundCoord } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function DraggableMarker({
  value,
  onChange,
}: {
  value: GeoLocation;
  onChange: (loc: GeoLocation, adjusted: boolean) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(
        {
          ...value,
          latitude: roundCoord(e.latlng.lat, 5),
          longitude: roundCoord(e.latlng.lng, 5),
        },
        true
      );
    },
  });

  return (
    <Marker
      position={[value.latitude, value.longitude]}
      icon={icon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const m = e.target as L.Marker;
          const p = m.getLatLng();
          onChange(
            {
              ...value,
              latitude: roundCoord(p.lat, 5),
              longitude: roundCoord(p.lng, 5),
            },
            true
          );
        },
      }}
    />
  );
}

export default function LocationMiniMapInner({
  value,
  onChange,
}: {
  value: GeoLocation;
  onChange: (loc: GeoLocation, adjusted: boolean) => void;
}) {
  const { t } = useI18n();
  const center = useMemo(
    () => [value.latitude, value.longitude] as [number, number],
    [value.latitude, value.longitude]
  );

  useEffect(() => {
    // Fix default icon paths in some bundlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }, []);

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{t("geo.miniMap")}</p>
      <p className="text-xs text-muted-foreground">{t("geo.dragHint")}</p>
      <div className="overflow-hidden rounded-lg border">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: 220, width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution="© OSM · OpenTopoMap"
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              load: (e) => {
                const el = (e.target as { getContainer?: () => HTMLElement })
                  .getContainer?.();
                if (el) el.setAttribute("aria-hidden", "true");
              },
            }}
          />
          <DraggableMarker value={value} onChange={onChange} />
        </MapContainer>
      </div>
    </div>
  );
}
