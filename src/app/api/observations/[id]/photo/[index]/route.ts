import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getDB, listObservations } from "@/lib/db";
import { parseDataUri } from "@/lib/photos";
import { getPhotosBucket, isR2PhotoRef, r2KeyFromRef } from "@/lib/r2";
import { canViewObservation } from "@/lib/visibility";

/**
 * Serve a single observation photo from R2 (or legacy data-URI during migration).
 * Enforces the same visibility rule as list/bootstrap.
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
    const viewer = session
      ? {
          id: session.id,
          role: session.role,
          canValidateObservations: session.canValidateObservations,
          isDemo: session.isDemo,
        }
      : null;
    if (!canViewObservation(existing, viewer)) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const src = existing.photos?.[index];
    if (!src || typeof src !== "string") {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    if (src.startsWith("/placeholders/")) {
      return NextResponse.redirect(new URL(src, _request.url), 302);
    }

    if (isR2PhotoRef(src)) {
      const key = r2KeyFromRef(src);
      if (!key) {
        return NextResponse.json(
          { ok: false, error: "invalid_photo" },
          { status: 500 }
        );
      }
      const bucket = await getPhotosBucket();
      const obj = await bucket.get(key);
      if (!obj) {
        return NextResponse.json(
          { ok: false, error: "not_found" },
          { status: 404 }
        );
      }
      const bytes = new Uint8Array(await obj.arrayBuffer());
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type":
            obj.httpMetadata?.contentType || "application/octet-stream",
          "Cache-Control": "private, max-age=3600",
        },
      });
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
