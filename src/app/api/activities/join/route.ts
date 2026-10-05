import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  addActivityMember,
  ensureSchema,
  getDB,
  getFieldActivityByJoinCode,
  isActivityMember,
} from "@/lib/db";
import { normalizeJoinCode } from "@/lib/activity-code";

/** Students (and teachers) join a field activity with the teacher’s code. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const role = auth.user.role;
  if (role !== "elev" && role !== "profesor" && role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { code?: string };
    const code = normalizeJoinCode(body.code ?? "");
    if (code.length < 4) {
      return NextResponse.json(
        { ok: false, error: "invalid_code" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    const activity = await getFieldActivityByJoinCode(db, code);
    if (!activity) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    const already = await isActivityMember(db, activity.id, auth.user.id);
    if (!already) {
      await addActivityMember(db, activity, {
        id: auth.user.id,
        name: auth.user.name,
        role: auth.user.role,
      });
      await writeAudit(db, {
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        action: "join_activity",
        objectType: "activity",
        objectId: activity.id,
        detail: activity.joinCode,
      });
    }

    return NextResponse.json({
      ok: true,
      activity,
      alreadyMember: already,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "join_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
