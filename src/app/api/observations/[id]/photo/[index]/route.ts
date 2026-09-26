import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getDB, listObservations } from "@/lib/db";
import { parseDataUri } from "@/lib/photos";

/**
 * Serve a single observation photo (decoded from D1 data-URI storage).
 * Keeps /api/bootstrap small while list/map thumbnails still work.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string; index: string }> }
) {
  try {
    const { id, index: indexRaw } = await ctx.params;
    const index = Number.parseInt(indexRaw, 10);
    if (!Number.isFinite(index) || index < 0) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }

    const db = await getDB();
    await ensureSchema(db);
    const all = await listObservations(db);
    const existing = all.find((o) => o.id === id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    const session = await getSessionUser();
    if (!session && existing.status !== "aprobat") {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const src = existing.photos?.[index];
    if (!src || typeof src !== "string") {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    if (src.startsWith("/")) {
      return NextResponse.redirect(new URL(src, _request.url), 302);
    }

    if (src.startsWith("data:")) {
      const parsed = parseDataUri(src);
      if (!parsed) {
        return NextResponse.json(
          { ok: false, error: "invalid_photo" },
          { status: 500 }
        );
      }
      const body = Uint8Array.from(parsed.bytes);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": parsed.contentType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "photo_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
