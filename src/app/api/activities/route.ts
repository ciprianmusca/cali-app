import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  addActivityMember,
  allocateJoinCode,
  ensureSchema,
  getDB,
  listFieldActivitiesForUser,
  upsertFieldActivity,
} from "@/lib/db";
import type { FieldActivity } from "@/lib/types";
import { PARK_CENTER } from "@/lib/constants";

function canManageActivities(role: string): boolean {
  return role === "admin" || role === "ranger" || role === "profesor";
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const db = await getDB();
    await ensureSchema(db);
    const activities = await listFieldActivitiesForUser(
      db,
      auth.user.id,
      auth.user.role
    );
    return NextResponse.json({ ok: true, activities });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  if (!canManageActivities(auth.user.role)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Partial<FieldActivity>;
    if (!body.title?.trim() || !body.date || !body.zoneName?.trim()) {
      return NextResponse.json(
        { ok: false, error: "invalid" },
        { status: 400 }
      );
    }
    const db = await getDB();
    await ensureSchema(db);
    const joinCode = await allocateJoinCode(db);
    const activity: FieldActivity = {
      id: body.id ?? `act-${crypto.randomUUID().slice(0, 10)}`,
      title: body.title.trim(),
      date: body.date,
      zoneName: body.zoneName.trim(),
      zoneLat: body.zoneLat ?? PARK_CENTER.lat,
      zoneLng: body.zoneLng ?? PARK_CENTER.lng,
      zoneRadiusM: body.zoneRadiusM ?? 500,
      treeIds: body.treeIds ?? [],
      schoolName: body.schoolName?.trim() || undefined,
      joinCode,
      createdBy: auth.user.id,
      createdByName: auth.user.name,
      createdAt: body.createdAt ?? new Date().toISOString(),
    };
    await upsertFieldActivity(db, activity);
    await addActivityMember(db, activity, {
      id: auth.user.id,
      name: auth.user.name,
      role: auth.user.role,
    });
    await writeAudit(db, {
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      action: "create_activity",
      objectType: "activity",
      objectId: activity.id,
      detail: `${activity.title} · cod ${activity.joinCode}`,
    });
    return NextResponse.json({ ok: true, activity });
  } catch (e) {
    const message = e instanceof Error ? e.message : "create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
