import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseDataUri } from "@/lib/photos";

export type PhotosBucket = R2Bucket;

export async function getPhotosBucket(): Promise<PhotosBucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as { PHOTOS?: R2Bucket }).PHOTOS;
  if (!bucket) {
    throw new Error(
      "R2 binding PHOTOS is missing. Create bucket cali-lab-photos and bind it in wrangler.jsonc."
    );
  }
  return bucket;
}

export function r2PhotoKey(obsId: string, index: number): string {
  return `observations/${obsId}/${index}`;
}

/** Stored in D1 photos_json instead of base64. */
export function r2PhotoRef(obsId: string, index: number): string {
  return `r2:${r2PhotoKey(obsId, index)}`;
}

export function isR2PhotoRef(src: string): boolean {
  return src.startsWith("r2:");
}

export function r2KeyFromRef(src: string): string | null {
  if (!isR2PhotoRef(src)) return null;
  return src.slice(3);
}

export async function putDataUriInR2(
  bucket: PhotosBucket,
  obsId: string,
  index: number,
  dataUri: string
): Promise<string> {
  const parsed = parseDataUri(dataUri);
  if (!parsed) {
    throw new Error("invalid_data_uri");
  }
  const key = r2PhotoKey(obsId, index);
  await bucket.put(key, parsed.bytes, {
    httpMetadata: { contentType: parsed.contentType },
    customMetadata: { observationId: obsId, index: String(index) },
  });
  return r2PhotoRef(obsId, index);
}

/**
 * Persist observation photos to R2. data: URIs are uploaded; existing r2:/http
 * refs are kept. Returns the D1-safe photo list (no base64).
 */
export async function persistObservationPhotos(
  bucket: PhotosBucket,
  obsId: string,
  photos: string[]
): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < photos.length; i += 1) {
    const src = photos[i]!;
    if (typeof src !== "string" || !src) continue;
    if (src.startsWith("data:")) {
      out.push(await putDataUriInR2(bucket, obsId, i, src));
    } else if (isR2PhotoRef(src)) {
      out.push(src);
    } else if (src.startsWith("/placeholders/")) {
      out.push(src);
    } else if (src.startsWith("/api/observations/")) {
      // Already an API URL — keep corresponding r2 key if pattern matches
      out.push(r2PhotoRef(obsId, i));
    } else {
      out.push(src);
    }
  }
  return out;
}
