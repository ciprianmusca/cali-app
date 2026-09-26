import type { AuditAction, AuditEvent, UserRole } from "@/lib/types";
import { insertAuditEvent } from "@/lib/db";

export async function writeAudit(
  db: D1Database,
  input: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    action: AuditAction;
    objectType: string;
    objectId: string;
    detail?: string;
  }
): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: `aud-${crypto.randomUUID().slice(0, 12)}`,
    at: new Date().toISOString(),
    ...input,
  };
  await insertAuditEvent(db, event);
  return event;
}
