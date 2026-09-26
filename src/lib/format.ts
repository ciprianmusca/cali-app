import { format } from "date-fns";
import { ro } from "date-fns/locale";
import type { GeoLocation, ObservationModule, UserRole } from "./types";
import { tKey } from "./i18n/store";
import { roleKey } from "./i18n/labels";
import { PUBLIC_ROLE_LABEL, canSeeFullNames } from "./privacy";

export function formatDate(iso: string): string {
  return format(new Date(iso), "dd.MM.yyyy", { locale: ro });
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "dd.MM.yyyy HH:mm", { locale: ro });
}

/** Display coords; default 5 decimals (DATA-06). */
export function formatCoord(value: number, digits = 5): string {
  return value.toFixed(digits).replace(".", ",");
}

/** Round stored coords to 5 decimals by default (DATA-06). */
export function roundCoord(value: number, digits = 5): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
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
  if (canSeeFullNames(viewerRole)) return name;
  // Field roles / anonymous: show role label, never a person name.
  if (role === "ranger") return PUBLIC_ROLE_LABEL.ranger;
  return tKey(roleKey(role));
}

export function displayValidatorName(
  name: string | undefined,
  viewerRole?: UserRole | null
): string {
  if (!name) return PUBLIC_ROLE_LABEL.ranger;
  if (canSeeFullNames(viewerRole)) return name;
  return PUBLIC_ROLE_LABEL.ranger;
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

/** Highest N from codes like DIST-0002 for a module; 0 if none. */
export function maxCodeSequential(
  codes: string[],
  module: ObservationModule
): number {
  const prefix = moduleCodePrefix(module);
  let max = 0;
  for (const code of codes) {
    if (!code.startsWith(`${prefix}-`)) continue;
    const n = Number.parseInt(code.slice(prefix.length + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
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
  maxWidth = 1280,
  quality = 0.62
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
          latitude: roundCoord(pos.coords.latitude, 5),
          longitude: roundCoord(pos.coords.longitude, 5),
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
