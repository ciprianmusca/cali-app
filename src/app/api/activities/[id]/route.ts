import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { canTeachSchool } from "@/lib/capabilities";
import {
  canAccessActivity,
  deleteFieldActivity,
  ensureSchema,
  getDB,
  getFieldActivity,
  isActivityMember,
  listObservations,
} from "@/lib/db";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    const db = await getDB();
    await ensureSchema(db);
    const activity = await getFieldActivity(db, id);
    if (!activity) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    const allowed = await canAccessActivity(db, activity, auth.user);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const observations = (await listObservations(db)).filter(
      (o) => o.activityId === id
    );
    const member = await isActivityMember(db, id, auth.user.id);
    return NextResponse.json({
      ok: true,
      activity,
      observations,
      isMember: member || activity.createdBy === auth.user.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "get_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    const db = await getDB();
    await ensureSchema(db);
    const activity = await getFieldActivity(db, id);
    if (!activity) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    const role = auth.user.role;
    const isAdmin = role === "admin";
    const isSchoolStaff = canTeachSchool(auth.user) && role === "ranger";
    const isCreator =
      canTeachSchool(auth.user) && activity.createdBy === auth.user.id;
    if (!isAdmin && !isSchoolStaff && !isCreator) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const result = await deleteFieldActivity(db, id);
    await writeAudit(db, {
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      action: "delete_activity",
      objectType: "activity",
      objectId: id,
      detail: `${activity.title} (unlinked ${result.unlinked})`,
    });

    return NextResponse.json({
      ok: true,
      deleted: true,
      unlinked: result.unlinked,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "delete_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
