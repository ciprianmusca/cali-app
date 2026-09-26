import { NextResponse } from "next/server";

/**
 * Receives offline observation uploads.
 * Client remains the durable store (localStorage); this endpoint
 * acknowledges receipt so the app can mark items as synced.
 * Ready to forward to a future FAIR / ForestWard backend.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      observations?: unknown[];
      uploadedAt?: string;
    };
    const list = Array.isArray(body.observations) ? body.observations : [];
    if (!list.length) {
      return NextResponse.json(
        { ok: false, error: "empty" },
        { status: 400 }
      );
    }

    const ids = list
      .map((o) =>
        o && typeof o === "object" && "id" in o
          ? String((o as { id: unknown }).id)
          : null
      )
      .filter((id): id is string => Boolean(id));

    return NextResponse.json({
      ok: true,
      received: ids.length,
      ids,
      serverTime: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }
}
