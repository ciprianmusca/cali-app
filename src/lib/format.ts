import { format } from "date-fns";
import { ro } from "date-fns/locale";
import type { GeoLocation, ObservationModule, UserRole } from "./types";
import { tKey } from "./i18n/store";
import { roleKey } from "./i18n/labels";

export function formatDate(iso: string): string {
  return format(new Date(iso), "dd.MM.yyyy", { locale: ro });
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "dd.MM.yyyy HH:mm", { locale: ro });
}

export function formatCoord(value: number, digits = 6): string {
  return value.toFixed(digits).replace(".", ",");
}

export function roundCoord(value: number, digits = 6): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function displayAuthorName(
  name: string,
  role: UserRole,
  viewerRole?: UserRole | null,
  isOwn = false
): string {
  if (isOwn) return name;
  if (role === "elev" && viewerRole !== "admin" && viewerRole !== "ranger") {
    return tKey("role.elevAnon");
  }
  if (!viewerRole || viewerRole === "turist" || viewerRole === "rezident" || viewerRole === "elev") {
    return tKey(roleKey(role));
  }
  return name;
}

export function moduleCodePrefix(module: ObservationModule): string {
  switch (module) {
    case "fenologie":
      return "PHEN";
    case "perturbari":
      return "DIST";
    case "sol":
      return "SOIL";
  }
}

export function generateCode(
  module: ObservationModule,
  sequential: number
): string {
  const prefix = moduleCodePrefix(module);
  return `${prefix}-${String(sequential).padStart(4, "0")}`;
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /\d/.test(password) &&
    /[a-zA-Z]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

export function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponibil"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Imagine invalidă"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Citire eșuată"));
    reader.readAsDataURL(file);
  });
}

export function captureGeolocation(
  timeoutMs = 15000
): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(tKey("geo.unavailableDevice")));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: roundCoord(pos.coords.latitude),
          longitude: roundCoord(pos.coords.longitude),
          accuracy:
            pos.coords.accuracy != null
              ? Math.round(pos.coords.accuracy)
              : null,
          altitude:
            pos.coords.altitude != null
              ? Math.round(pos.coords.altitude)
              : null,
          capturedAt: new Date().toISOString(),
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: tKey("geo.permissionDenied"),
          2: tKey("geo.positionUnavailable"),
          3: tKey("geo.timeout"),
        };
        reject(new Error(messages[err.code] ?? tKey("geo.genericError")));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export function mockLocationNearPark(): GeoLocation {
  const jitter = () => (Math.random() - 0.5) * 0.04;
  return {
    latitude: roundCoord(47.125 + jitter()),
    longitude: roundCoord(25.175 + jitter()),
    accuracy: Math.round(8 + Math.random() * 20),
    altitude: Math.round(1400 + Math.random() * 400),
    capturedAt: new Date().toISOString(),
  };
}

export function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
