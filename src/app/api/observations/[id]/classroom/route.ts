import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { canTeachSchool } from "@/lib/capabilities";
import { classroomStatusOf } from "@/lib/classroom";
import {
  ensureSchema,
  getDB,
  getFieldActivity,
  getObservationById,
  isActivityMember,
  upsertObservation,
} from "@/lib/db";
import { maskObservationNames } from "@/lib/privacy";
import { slimObservationPhotos } from "@/lib/photos";
import type {
  AuditAction,
  ClassroomDecision,
  ClassroomStatus,
  Observation,
} from "@/lib/types";

const ALLOWED: ClassroomStatus[] = ["nediscutat", "admis", "respins"];

/**
 * Classroom debate decision — independent of scientific ranger validation.
 * Only teachers / school-flagged rangers on activities they lead (or admin).
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  if (!canTeachSchool(auth.user)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      decision?: ClassroomStatus;
      comment?: string;
    };
    const decision = body.decision;
    if (!decision || !ALLOWED.includes(decision)) {
      return NextResponse.json(
        { ok: false, error: "invalid_decision" },
        { status: 400 }
      );
    }
    const comment = body.comment?.trim() || undefined;
    if (decision === "respins" && !comment) {
      return NextResponse.json(
        { ok: false, error: "comment_required" },
        { status: 400 }
      );
    }

    const db = await getDB();
    await ensureSchema(db);
    const existing = await getObservationById(db, id);
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }
    if (!existing.activityId) {
      return NextResponse.json(
        { ok: false, error: "not_in_activity" },
        { status: 400 }
      );
    }

    const activity = await getFieldActivity(db, existing.activityId);
    if (!activity) {
      return NextResponse.json(
        { ok: false, error: "activity_not_found" },
        { status: 400 }
      );
    }

    const isAdmin = auth.user.role === "admin";
    const isLeader =
      activity.createdBy === auth.user.id ||
      (await isActivityMember(db, activity.id, auth.user.id));
    if (!isAdmin && !isLeader) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 }
      );
    }

    const previous = classroomStatusOf(existing);
    const at = new Date().toISOString();
    const record: ClassroomDecision = {
      id: `cd-${crypto.randomUUID().slice(0, 10)}`,
      at,
      byId: auth.user.id,
      byName: auth.user.name,
      kind: decision,
      comment,
      previousStatus: previous,
    };

    const updated: Observation = {
      ...existing,
      classroomStatus: decision,
      classroomComment: comment,
      classroomById: auth.user.id,
      classroomByName: auth.user.name,
      classroomAt: at,
      classroomHistory: [...(existing.classroomHistory ?? []), record],
      // Scientific status untouched.
    };

    await upsertObservation(db, updated);

    const auditAction: AuditAction =
      decision === "admis"
        ? "classroom_admit"
        : decision === "respins"
          ? "classroom_reject"
          : "classroom_reset";
    await writeAudit(db, {
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: auth.user.role,
      action: auditAction,
      objectType: "observation",
      objectId: updated.id,
      detail: `${updated.code} → ${decision}`,
    });

    return NextResponse.json({
      ok: true,
      observation: slimObservationPhotos(
        maskObservationNames(updated, auth.user.role)
      ),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "classroom_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
