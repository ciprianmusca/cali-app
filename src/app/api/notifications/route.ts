import { NextResponse } from "next/server";
import { canValidate, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  ensureSchema,
  getDB,
  insertNotification,
  listNotificationsForUser,
  markNotificationRead,
} from "@/lib/db";
import type { AppNotification } from "@/lib/types";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const db = await getDB();
    await ensureSchema(db);
    const notifications = await listNotificationsForUser(db, auth.user.id);
    return NextResponse.json({ ok: true, notifications });
  } catch (e) {
    const message = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as {
      id?: string;
      action?: "read" | "create";
      notification?: Omit<AppNotification, "id" | "createdAt">;
      audit?: {
        action:
          | "validate"
          | "reopen"
          | "correct_observation"
          | "delete_photo";
        objectId: string;
        detail?: string;
      };
    };
    const db = await getDB();
    await ensureSchema(db);

    if (body.action === "read" && body.id) {
      await markNotificationRead(db, body.id, auth.user.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "create" && body.notification) {
      if (!canValidate(auth.user.role) && auth.user.role !== "admin") {
        return NextResponse.json(
          { ok: false, error: "forbidden" },
          { status: 403 }
        );
      }
      const n: AppNotification = {
        id: `n-${crypto.randomUUID().slice(0, 10)}`,
        createdAt: new Date().toISOString(),
        ...body.notification,
      };
      await insertNotification(db, n);
      if (body.audit) {
        await writeAudit(db, {
          actorId: auth.user.id,
          actorName: auth.user.name,
          actorRole: auth.user.role,
          action: body.audit.action,
          objectType: "observation",
          objectId: body.audit.objectId,
          detail: body.audit.detail,
        });
      }
      return NextResponse.json({ ok: true, notification: n });
    }

    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "update_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
