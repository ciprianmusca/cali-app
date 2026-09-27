import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireUser } from "@/lib/auth";
import {
  normalizeCoverSteps,
  parseSoilCoverJson,
  ONLINE_MODEL,
  type SoilCoverSuggestion,
} from "@/lib/ai/soil-cover";

export const runtime = "nodejs";

const PROMPT = `You estimate forest soil cover from a top-down 1×1 m plot photo for a scientific citizen-science app.

Return ONLY a JSON object (no markdown) with integer percentages that sum to 100:
{"moss":0,"litter":0,"plants":0,"bare":0,"seedlingsPresent":false}

Definitions:
- moss: moss and lichens (soft green low cover)
- litter: needles, dry leaves, twigs, woody debris
- plants: herbs, ferns, shrubs, seedlings seen from above
- bare: exposed soil or rock
- seedlingsPresent: true if young tree seedlings are visible (independent of the 100% sum)

Estimate what is visible from above; upper layer counts.`;

type AiBinding = {
  run: (
    model: string,
    inputs: Record<string, unknown>
  ) => Promise<unknown>;
};

function extractText(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;
  if (typeof r.response === "string") return r.response;
  if (typeof r.description === "string") return r.description;
  if (typeof r.result === "string") return r.result;
  if (Array.isArray(r.description)) {
    return r.description.map(String).join("\n");
  }
  try {
    return JSON.stringify(result);
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let image: string;
  try {
    const body = (await req.json()) as { image?: unknown };
    if (typeof body.image !== "string" || body.image.length < 32) {
      return NextResponse.json({ error: "image_required" }, { status: 400 });
    }
    if (body.image.length > 3_500_000) {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }
    image = body.image;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const { env } = await getCloudflareContext({ async: true });
    const ai = (env as { AI?: AiBinding }).AI;
    if (!ai?.run) {
      return NextResponse.json(
        { error: "ai_binding_missing", fallback: "offline" },
        { status: 503 }
      );
    }

    // Workers AI vision: data-URL or raw base64 both accepted by llama-3.2-vision.
    const dataUrl = image.startsWith("data:")
      ? image
      : `data:image/jpeg;base64,${image}`;
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;

    let text = "";
    try {
      const result = await ai.run(ONLINE_MODEL, {
        messages: [
          { role: "system", content: PROMPT },
          {
            role: "user",
            content: "Estimate soil cover percentages for this plot photo.",
          },
        ],
        image: dataUrl,
        max_tokens: 256,
      });
      text = extractText(result);
    } catch {
      // Alternate shape: numeric byte array (some Workers AI samples).
      const bytes = Array.from(atob(base64), (c) => c.charCodeAt(0));
      const result2 = await ai.run(ONLINE_MODEL, {
        prompt: PROMPT,
        image: bytes,
        max_tokens: 256,
      });
      text = extractText(result2);
    }

    const parsed = parseSoilCoverJson(text);
    if (!parsed) {
      return NextResponse.json(
        {
          error: "ai_parse_failed",
          fallback: "offline",
          raw: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const suggestion: SoilCoverSuggestion = {
      cover: normalizeCoverSteps(parsed.cover),
      seedlingsPresent: parsed.seedlingsPresent,
      mode: "online",
      model: ONLINE_MODEL,
      at: new Date().toISOString(),
    };
    return NextResponse.json(suggestion);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ai_failed";
    return NextResponse.json(
      { error: message, fallback: "offline" },
      { status: 502 }
    );
  }
}
