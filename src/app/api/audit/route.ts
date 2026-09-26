import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureSchema, getDB, listAuditEvents } from "@/lib/db";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const db = await getDB();
    await ensureSchema(db);
    const events = await listAuditEvents(db, 300);
    return NextResponse.json({ ok: true, events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "audit_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
