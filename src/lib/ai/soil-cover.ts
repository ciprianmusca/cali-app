/**
 * Soil cover AI demo: offline canvas heuristic + online Workers AI vision.
 * Suggestions are editable; human values remain the source of truth.
 */

export type SoilCoverPct = {
  moss: number;
  litter: number;
  plants: number;
  bare: number;
};

export type SoilCoverSuggestion = {
  cover: SoilCoverPct;
  seedlingsPresent?: boolean;
  mode: "offline" | "online";
  model: string;
  at: string;
};

const OFFLINE_MODEL = "cali-lab-color-heuristic-v1";
const ONLINE_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

/** Snap to 5% steps and force sum = 100. */
export function normalizeCoverSteps(raw: SoilCoverPct): SoilCoverPct {
  const keys = ["moss", "litter", "plants", "bare"] as const;
  const clamped = Object.fromEntries(
    keys.map((k) => [k, Math.max(0, Math.min(100, Number(raw[k]) || 0))])
  ) as SoilCoverPct;

  let stepped = Object.fromEntries(
    keys.map((k) => [k, Math.round(clamped[k] / 5) * 5])
  ) as SoilCoverPct;

  let sum = keys.reduce((s, k) => s + stepped[k], 0);
  if (sum === 0) {
    return { moss: 25, litter: 25, plants: 25, bare: 25 };
  }

  // Scale toward 100 then re-step.
  if (sum !== 100) {
    const scale = 100 / sum;
    const scaled = keys.map((k) => stepped[k] * scale);
    stepped = Object.fromEntries(
      keys.map((k, i) => [k, Math.round(scaled[i] / 5) * 5])
    ) as SoilCoverPct;
    sum = keys.reduce((s, k) => s + stepped[k], 0);
  }

  // Fix remainder on the largest class.
  if (sum !== 100) {
    const order = [...keys].sort((a, b) => stepped[b] - stepped[a]);
    const target = order[0];
    stepped[target] = Math.max(0, Math.min(100, stepped[target] + (100 - sum)));
    // Re-snap target if needed.
    stepped[target] = Math.round(stepped[target] / 5) * 5;
    sum = keys.reduce((s, k) => s + stepped[k], 0);
    if (sum !== 100) {
      const fix = order.find((k) => k !== target) ?? target;
      stepped[fix] = Math.max(0, Math.min(100, stepped[fix] + (100 - sum)));
    }
  }

  return stepped;
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

type CoverClass = keyof SoilCoverPct;

function classifyPixel(r: number, g: number, b: number): CoverClass {
  const { h, s, l } = rgbToHsl(r, g, b);

  // Bare: rock, soil, snow, deep shadow
  if (l < 0.12 || l > 0.88) return "bare";
  if (s < 0.12) return "bare";

  // Green vegetation → moss (darker/softer) vs plants (brighter)
  const isGreen = h >= 70 && h <= 170 && s > 0.14;
  if (isGreen) {
    return l < 0.42 || (s < 0.35 && l < 0.5) ? "moss" : "plants";
  }

  // Brown / orange / yellow-brown litter
  const isLitter =
    (h >= 15 && h <= 55 && s > 0.18 && l < 0.7) ||
    (h >= 30 && h <= 70 && s > 0.25 && l < 0.55);
  if (isLitter) return "litter";

  // Yellowish dry needles / leaves
  if (h >= 40 && h <= 75 && s > 0.2 && l > 0.35 && l < 0.75) return "litter";

  // Residual dull greens
  if (g > r && g > b && s > 0.1) {
    return l < 0.4 ? "moss" : "plants";
  }

  return "bare";
}

/**
 * Offline demo: downsample the photo and classify pixels by colour.
 * Works without network / API keys.
 */
export async function estimateSoilCoverOffline(
  dataUrl: string
): Promise<SoilCoverSuggestion> {
  if (typeof document === "undefined") {
    throw new Error("offline_heuristic_needs_browser");
  }

  const img = await loadImage(dataUrl);
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas_unavailable");

  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const counts: Record<CoverClass, number> = {
    moss: 0,
    litter: 0,
    plants: 0,
    bare: 0,
  };

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    counts[classifyPixel(data[i], data[i + 1], data[i + 2])] += 1;
  }

  const total = counts.moss + counts.litter + counts.plants + counts.bare || 1;
  const cover = normalizeCoverSteps({
    moss: (counts.moss / total) * 100,
    litter: (counts.litter / total) * 100,
    plants: (counts.plants / total) * 100,
    bare: (counts.bare / total) * 100,
  });

  // Rough seedling cue: bright green share above a threshold.
  const greenShare = (counts.moss + counts.plants) / total;
  const seedlingsPresent = greenShare > 0.35 && counts.plants > counts.moss * 0.4;

  return {
    cover,
    seedlingsPresent,
    mode: "offline",
    model: OFFLINE_MODEL,
    at: new Date().toISOString(),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

/** Shrink data-URL for online upload (max edge 512, JPEG). */
export async function downscaleDataUrlForAi(
  dataUrl: string,
  maxEdge = 512
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function parseSoilCoverJson(
  text: string
): { cover: SoilCoverPct; seedlingsPresent?: boolean } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as Record<string, unknown>;
    const cover = normalizeCoverSteps({
      moss: Number(j.moss ?? j.mossPct ?? 0),
      litter: Number(j.litter ?? j.litterPct ?? 0),
      plants: Number(j.plants ?? j.plantsPct ?? 0),
      bare: Number(j.bare ?? j.barePct ?? 0),
    });
    const seedlings =
      typeof j.seedlingsPresent === "boolean"
        ? j.seedlingsPresent
        : typeof j.seedlings === "boolean"
          ? j.seedlings
          : undefined;
    return { cover, seedlingsPresent: seedlings };
  } catch {
    return null;
  }
}

/**
 * Prefer online Workers AI when the device is online; always fall back to
 * the offline colour heuristic so the demo never blocks.
 */
export async function suggestSoilCover(
  dataUrl: string
): Promise<SoilCoverSuggestion> {
  const online =
    typeof navigator === "undefined" ? true : navigator.onLine !== false;

  if (online) {
    try {
      const image = await downscaleDataUrlForAi(dataUrl);
      const res = await fetch("/api/ai/soil-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ image }),
      });
      if (res.ok) {
        const body = (await res.json()) as SoilCoverSuggestion & {
          ok?: boolean;
        };
        if (body?.cover && body.mode === "online") {
          return {
            cover: normalizeCoverSteps(body.cover),
            seedlingsPresent: body.seedlingsPresent,
            mode: "online",
            model: body.model || ONLINE_MODEL,
            at: body.at || new Date().toISOString(),
          };
        }
      }
    } catch {
      /* fall through to offline */
    }
  }

  return estimateSoilCoverOffline(dataUrl);
}

export { ONLINE_MODEL, OFFLINE_MODEL };
