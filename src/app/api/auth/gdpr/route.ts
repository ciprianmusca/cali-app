import { NextResponse } from "next/server";
import { requireUser, toPublicUser } from "@/lib/auth";
import { ensureSchema, getDB, upsertUser } from "@/lib/db";
import { GDPR_VERSION } from "@/lib/constants";

export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const db = await getDB();
    await ensureSchema(db);
    const updated = {
      ...auth.user,
      gdprAcceptedAt: new Date().toISOString(),
      gdprVersion: GDPR_VERSION,
      // ADM-14: activation only after GDPR consent.
      status: "activ" as const,
    };
    await upsertUser(db, updated);
    return NextResponse.json({ ok: true, user: toPublicUser(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "gdpr_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
