import type { Observation, ObservationModule } from "@/lib/types";

export function modulePlaceholder(module: ObservationModule): string {
  if (module === "fenologie") return "/placeholders/tree-1.svg";
  if (module === "sol") return "/placeholders/soil-1.svg";
  return "/placeholders/disturbance-1.svg";
}

/**
 * Replace inline data-URI photos with API URLs so list/bootstrap stay small
 * while thumbnails still load the real image.
 */
export function slimObservationPhotos(obs: Observation): Observation {
  const photos = (obs.photos ?? []).map((src, i) => {
    if (typeof src === "string" && src.startsWith("data:")) {
      return `/api/observations/${obs.id}/photo/${i}`;
    }
    return src;
  });
  return { ...obs, photos };
}

export function parseDataUri(
  dataUri: string
): { contentType: string; bytes: Uint8Array } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUri);
  if (!match) return null;
  const contentType = match[1];
  const b64 = match[2];
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { contentType, bytes };
  } catch {
    return null;
  }
}
