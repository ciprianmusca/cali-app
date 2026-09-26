import exifr from "exifr";
import type { PhotoMeta } from "@/lib/types";
import { roundCoord } from "@/lib/format";

/**
 * Extract capture date and GPS from image EXIF before compression (DATA-08).
 */
export async function extractPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const data = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "CreateDate", "GPSLatitude", "GPSLongitude"],
      gps: true,
    });
    if (!data || typeof data !== "object") return {};
    const meta: PhotoMeta = {};
    const dt =
      (data as { DateTimeOriginal?: Date; CreateDate?: Date }).DateTimeOriginal ??
      (data as { CreateDate?: Date }).CreateDate;
    if (dt instanceof Date && !Number.isNaN(dt.getTime())) {
      meta.capturedAt = dt.toISOString();
    }
    const lat = (data as { latitude?: number }).latitude;
    const lng = (data as { longitude?: number }).longitude;
    if (typeof lat === "number" && Number.isFinite(lat)) {
      meta.latitude = roundCoord(lat, 5);
    }
    if (typeof lng === "number" && Number.isFinite(lng)) {
      meta.longitude = roundCoord(lng, 5);
    }
    return meta;
  } catch {
    return {};
  }
}
