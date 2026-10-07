import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  AppNotification,
  AuditEvent,
  CrownCondition,
  FenologieObservation,
  FieldActivity,
  Observation,
  ObservationModule,
  PasswordResetToken,
  PerturbariObservation,
  SentinelTree,
  SolObservation,
  Species,
  User,
  UserRole,
  UserStatus,
} from "@/lib/types";
import { DEMO_ACCOUNTS, GDPR_VERSION } from "@/lib/constants";
import {
  generateActivityJoinCode,
  normalizeJoinCode,
} from "@/lib/activity-code";
import {
  generateCode,
  maxCodeSequential,
  moduleCodePrefix,
  roundCoord,
} from "@/lib/format";
import { migrateObservation } from "@/lib/migrate-observation";
import { hashPassword, isPbkdf2, needsRehash } from "@/lib/password";
import { DELETED_USER_LABEL } from "@/lib/privacy";

export type CloudflareEnv = {
  DB: D1Database;
  PHOTOS: R2Bucket;
  AI?: {
    run: (
      model: string,
      inputs: Record<string, unknown>
    ) => Promise<unknown>;
  };
};

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as CloudflareEnv).DB;
  if (!db) {
    throw new Error("D1 binding DB is missing. Create cali-lab-db and bind it in wrangler.jsonc.");
  }
  return db;
}

export async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        password TEXT NOT NULL,
        is_adult INTEGER NOT NULL DEFAULT 1,
        parental_consent INTEGER,
        gdpr_accepted_at TEXT,
        gdpr_version TEXT,
        registered_at TEXT NOT NULL,
        last_login_at TEXT,
        can_manage_users INTEGER NOT NULL DEFAULT 0,
        can_validate_observations INTEGER NOT NULL DEFAULT 0,
        can_teach_school INTEGER NOT NULL DEFAULT 0
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        module TEXT NOT NULL,
        status TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_role TEXT NOT NULL,
        author_name TEXT NOT NULL,
        details TEXT,
        photos_json TEXT NOT NULL DEFAULT '[]',
        location_json TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        validated_at TEXT,
        validator_id TEXT,
        validator_name TEXT,
        validation_comment TEXT,
        is_sentinel_tree INTEGER DEFAULT 0,
        species TEXT,
        synced_at TEXT
      )
    `),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_observations_status ON observations(status)`
    ),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_observations_module ON observations(module)`
    ),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_observations_author ON observations(author_id)`
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sentinel_trees (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        species TEXT NOT NULL,
        species_other TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        created_by TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        notes TEXT
      )
    `),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_sentinel_created ON sentinel_trees(created_at)`
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id TEXT NOT NULL,
        detail TEXT
      )
    `),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC)`
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        used_at TEXT,
        purpose TEXT NOT NULL DEFAULT 'reset'
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS field_activities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        zone_name TEXT NOT NULL,
        zone_lat REAL NOT NULL,
        zone_lng REAL NOT NULL,
        zone_radius_m REAL NOT NULL,
        tree_ids_json TEXT NOT NULL DEFAULT '[]',
        school_name TEXT,
        join_code TEXT,
        created_by TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS activity_members (
        activity_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        PRIMARY KEY (activity_id, user_id)
      )
    `),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_activity_members_user ON activity_members(user_id)`
    ),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        observation_id TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT
      )
    `),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC)`
    ),
  ]);
  await migrateFieldActivitiesSchema(db);
  await migrateUsersCapabilitiesSchema(db);
  await migrateDemoSandboxSchema(db);
  await migrateOfficialDataToSandboxOnce(db);
  await migrateEmailTokenPurposeSchema(db);
}

/** purpose=reset|activate on password_resets (account activation emails). */
async function migrateEmailTokenPurposeSchema(db: D1Database): Promise<void> {
  try {
    await db
      .prepare(
        `ALTER TABLE password_resets ADD COLUMN purpose TEXT NOT NULL DEFAULT 'reset'`
      )
      .run();
  } catch {
    /* column exists */
  }
}

/** Isolate „Testează aplicația” accounts + observations from the official lane. */
async function migrateDemoSandboxSchema(db: D1Database): Promise<void> {
  for (const sql of [
    `ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE observations ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      await db.prepare(sql).run();
    } catch {
      /* column already exists */
    }
  }
  try {
    await db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_observations_is_demo ON observations(is_demo)`
      )
      .run();
  } catch {
    /* ignore */
  }
  try {
    await db
      .prepare(`CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo)`)
      .run();
  } catch {
    /* ignore */
  }
  // Mark public sandbox emails (not admin) as demo.
  for (const email of [
    "ranger@cali-lab.ro",
    "profesor@cali-lab.ro",
    "turist@cali-lab.ro",
    "rezident@cali-lab.ro",
    "elev@cali-lab.ro",
  ]) {
    try {
      await db
        .prepare(
          `UPDATE users SET is_demo = 1 WHERE lower(email) = lower(?)`
        )
        .bind(email)
        .run();
    } catch {
      /* ignore */
    }
  }
  // Admin stays on the official lane.
  try {
    await db
      .prepare(
        `UPDATE users SET is_demo = 0 WHERE lower(email) = lower(?)`
      )
      .bind("admin@cali-lab.ro")
      .run();
  } catch {
    /* ignore */
  }
  // Demo ranger: active in sandbox, can validate, cannot manage users.
  try {
    await db
      .prepare(
        `UPDATE users SET
           name = ?,
           status = 'activ',
           is_demo = 1,
           can_validate_observations = 1,
           can_manage_users = 0,
           can_manage_registrations = 0,
           can_teach_school = 0
         WHERE lower(email) = lower(?)`
      )
      .bind("Georgiana Popa", "ranger@cali-lab.ro")
      .run();
  } catch {
    /* ignore */
  }
  // Keep historical rows consistent with the renamed ranger.
  try {
    await db
      .prepare(
        `UPDATE observations SET author_name = ?
         WHERE author_id = 'u-ranger' OR lower(author_name) = lower(?)`
      )
      .bind("Georgiana Popa", "Mitache Petronela")
      .run();
  } catch {
    /* ignore */
  }
  try {
    await db
      .prepare(
        `UPDATE observations SET validator_name = ?
         WHERE validator_id = 'u-ranger' OR lower(validator_name) = lower(?)`
      )
      .bind("Georgiana Popa", "Mitache Petronela")
      .run();
  } catch {
    /* ignore */
  }
  // Sandbox accounts never hold the users-management flag.
  try {
    await db
      .prepare(
        `UPDATE users SET can_manage_users = 0, can_manage_registrations = 0
         WHERE is_demo = 1`
      )
      .run();
  } catch {
    /* ignore */
  }
  // Observations authored by demo users inherit the sandbox flag.
  try {
    await db
      .prepare(
        `UPDATE observations SET is_demo = 1
         WHERE author_id IN (SELECT id FROM users WHERE is_demo = 1)`
      )
      .run();
  } catch {
    /* ignore */
  }
}

/**
 * One-shot: move ALL existing rows into the sandbox lane so the official
 * app starts empty (new real data will be loaded separately). Admin stays official.
 */
async function migrateOfficialDataToSandboxOnce(
  db: D1Database
): Promise<void> {
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS schema_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`
      )
      .run();
  } catch {
    /* ignore */
  }

  const done = await db
    .prepare(`SELECT value FROM schema_meta WHERE key = ?`)
    .bind("official_cleared_v1")
    .first<{ value: string }>();
  if (done?.value) return;

  try {
    await db.prepare(`UPDATE observations SET is_demo = 1`).run();
  } catch {
    /* column missing on very old installs — migrateDemoSandboxSchema ran first */
  }

  try {
    await db
      .prepare(
        `UPDATE users SET is_demo = 1 WHERE lower(email) != lower(?)`
      )
      .bind("admin@cali-lab.ro")
      .run();
  } catch {
    /* ignore */
  }

  try {
    await db
      .prepare(
        `UPDATE users SET is_demo = 0 WHERE lower(email) = lower(?)`
      )
      .bind("admin@cali-lab.ro")
      .run();
  } catch {
    /* ignore */
  }

  try {
    await db
      .prepare(
        `INSERT INTO schema_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .bind("official_cleared_v1", new Date().toISOString())
      .run();
  } catch {
    /* ignore */
  }
}

/** Add join_code to older D1 installs and backfill missing codes. */
async function migrateFieldActivitiesSchema(db: D1Database): Promise<void> {
  try {
    await db
      .prepare(`ALTER TABLE field_activities ADD COLUMN join_code TEXT`)
      .run();
  } catch {
    /* column already exists */
  }

  const { results } = await db
    .prepare(
      `SELECT id FROM field_activities WHERE join_code IS NULL OR join_code = ''`
    )
    .all<{ id: string }>();
  for (const row of results ?? []) {
    const code = await allocateJoinCode(db);
    await db
      .prepare(`UPDATE field_activities SET join_code = ? WHERE id = ?`)
      .bind(code, row.id)
      .run();
  }
}

/** Ranger capability flags: users, observation validation, school. */
async function migrateUsersCapabilitiesSchema(db: D1Database): Promise<void> {
  for (const sql of [
    `ALTER TABLE users ADD COLUMN can_manage_registrations INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN can_manage_users INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN can_validate_observations INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN can_teach_school INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      await db.prepare(sql).run();
    } catch {
      /* column already exists */
    }
  }
  // Copy legacy "registrations" flag into can_manage_users once.
  try {
    await db
      .prepare(
        `UPDATE users SET can_manage_users = 1
         WHERE can_manage_registrations = 1 AND can_manage_users = 0`
      )
      .run();
  } catch {
    /* ignore */
  }
  // Demo ranger: keep observation validation so the demo Validare flow works,
  // but only when no capability has been granted yet (fresh install / migration).
  try {
    await db
      .prepare(
        `UPDATE users SET can_validate_observations = 1
         WHERE lower(email) = lower(?)
           AND role = 'ranger'
           AND can_manage_users = 0
           AND can_validate_observations = 0
           AND can_teach_school = 0`
      )
      .bind("ranger@cali-lab.ro")
      .run();
  } catch {
    /* ignore */
  }
}

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  password: string;
  is_adult: number;
  parental_consent: number | null;
  gdpr_accepted_at: string | null;
  gdpr_version: string | null;
  registered_at: string;
  last_login_at: string | null;
  can_manage_registrations?: number | null;
  can_manage_users?: number | null;
  can_validate_observations?: number | null;
  can_teach_school?: number | null;
  is_demo?: number | null;
};

type ObsRow = {
  id: string;
  code: string;
  module: string;
  status: string;
  author_id: string;
  author_role: string;
  author_name: string;
  details: string | null;
  photos_json: string;
  location_json: string;
  payload_json: string;
  created_at: string;
  validated_at: string | null;
  validator_id: string | null;
  validator_name: string | null;
  validation_comment: string | null;
  is_sentinel_tree: number | null;
  species: string | null;
  synced_at: string | null;
  is_demo?: number | null;
};

export function userFromRow(row: UserRow): User {
  const isRanger = row.role === "ranger";
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    password: row.password,
    isAdult: row.is_adult === 1,
    parentalConsent:
      row.parental_consent == null ? undefined : row.parental_consent === 1,
    gdprAcceptedAt: row.gdpr_accepted_at ?? undefined,
    gdprVersion: row.gdpr_version ?? undefined,
    registeredAt: row.registered_at,
    lastLoginAt: row.last_login_at ?? undefined,
    isDemo: row.is_demo === 1,
    // Sandbox testers never manage accounts, even if a flag was set historically.
    canManageUsers:
      row.is_demo === 1
        ? false
        : isRanger
          ? row.can_manage_users === 1 || row.can_manage_registrations === 1
          : false,
    canValidateObservations: isRanger
      ? row.can_validate_observations === 1
      : false,
    canTeachSchool: isRanger ? row.can_teach_school === 1 : false,
  };
}

export function observationFromRow(row: ObsRow): Observation {
  const payload = JSON.parse(row.payload_json || "{}") as Record<string, unknown>;
  const location = JSON.parse(row.location_json);
  const base = {
    id: row.id,
    code: row.code,
    status: row.status as Observation["status"],
    authorId: row.author_id,
    authorRole: row.author_role as UserRole,
    authorName: row.author_name,
    details: row.details ?? undefined,
    photos: JSON.parse(row.photos_json || "[]") as string[],
    photoMeta: Array.isArray(payload.photoMeta)
      ? (payload.photoMeta as Observation["photoMeta"])
      : undefined,
    location,
    locationAdjusted: Boolean(payload.locationAdjusted),
    createdAt: row.created_at,
    validatedAt: row.validated_at ?? undefined,
    validatorId: row.validator_id ?? undefined,
    validatorName: row.validator_name ?? undefined,
    validationComment: row.validation_comment ?? undefined,
    validationHistory: Array.isArray(payload.validationHistory)
      ? (payload.validationHistory as Observation["validationHistory"])
      : undefined,
    originalFields:
      payload.originalFields && typeof payload.originalFields === "object"
        ? (payload.originalFields as Observation["originalFields"])
        : undefined,
    clarificationQuestion:
      typeof payload.clarificationQuestion === "string"
        ? payload.clarificationQuestion
        : undefined,
    clarificationReply:
      typeof payload.clarificationReply === "string"
        ? payload.clarificationReply
        : undefined,
    isSentinelTree: row.is_sentinel_tree === 1,
    sentinelTreeId:
      typeof payload.sentinelTreeId === "string"
        ? payload.sentinelTreeId
        : undefined,
    activityId:
      typeof payload.activityId === "string" ? payload.activityId : undefined,
    isDemo: row.is_demo === 1 || payload.isDemo === true,
    classroomStatus:
      payload.classroomStatus === "admis" ||
      payload.classroomStatus === "respins" ||
      payload.classroomStatus === "nediscutat"
        ? (payload.classroomStatus as Observation["classroomStatus"])
        : undefined,
    classroomComment:
      typeof payload.classroomComment === "string"
        ? payload.classroomComment
        : undefined,
    classroomById:
      typeof payload.classroomById === "string"
        ? payload.classroomById
        : undefined,
    classroomByName:
      typeof payload.classroomByName === "string"
        ? payload.classroomByName
        : undefined,
    classroomAt:
      typeof payload.classroomAt === "string"
        ? payload.classroomAt
        : undefined,
    classroomHistory: Array.isArray(payload.classroomHistory)
      ? (payload.classroomHistory as Observation["classroomHistory"])
      : undefined,
    species: (row.species as Observation["species"]) ?? undefined,
    speciesOther:
      typeof payload.speciesOther === "string"
        ? payload.speciesOther
        : undefined,
    editHistory: Array.isArray(payload.editHistory)
      ? (payload.editHistory as Observation["editHistory"])
      : undefined,
    syncStatus: "synced" as const,
    syncedAt: row.synced_at ?? row.created_at,
  };

  let obs: Observation;
  if (row.module === "fenologie") {
    obs = {
      ...base,
      module: "fenologie",
      stage: payload.stage as FenologieObservation["stage"],
      crownCondition: (payload.crownCondition as CrownCondition) ?? "sanatoasa",
      species: (payload.species ?? row.species) as FenologieObservation["species"],
    };
  } else if (row.module === "perturbari") {
    obs = {
      ...base,
      module: "perturbari",
      disturbanceTypes:
        payload.disturbanceTypes as PerturbariObservation["disturbanceTypes"],
      insectType: payload.insectType as string | undefined,
      severity: payload.severity as PerturbariObservation["severity"],
      affectedAreaSqm: payload.affectedAreaSqm as number,
      species: (payload.species ?? row.species) as PerturbariObservation["species"],
    };
  } else {
    obs = {
      ...base,
      module: "sol",
      mossPct: payload.mossPct as number,
      litterPct: payload.litterPct as number,
      barePct: payload.barePct as number,
      plantsPct: payload.plantsPct as number,
      seedlingsPresent: Boolean(payload.seedlingsPresent),
      plotSize: "1x1m",
      aiCoverSuggestion:
        payload.aiCoverSuggestion &&
        typeof payload.aiCoverSuggestion === "object"
          ? (payload.aiCoverSuggestion as SolObservation["aiCoverSuggestion"])
          : undefined,
    } as SolObservation;
  }
  return migrateObservation(obs);
}

function payloadFor(obs: Observation): Record<string, unknown> {
  const common: Record<string, unknown> = {
    photoMeta: obs.photoMeta,
    locationAdjusted: obs.locationAdjusted,
    sentinelTreeId: obs.sentinelTreeId,
    activityId: obs.activityId,
    isDemo: obs.isDemo || undefined,
    speciesOther: obs.speciesOther,
    editHistory: obs.editHistory,
    validationHistory: obs.validationHistory,
    originalFields: obs.originalFields,
    clarificationQuestion: obs.clarificationQuestion,
    clarificationReply: obs.clarificationReply,
    classroomStatus: obs.classroomStatus,
    classroomComment: obs.classroomComment,
    classroomById: obs.classroomById,
    classroomByName: obs.classroomByName,
    classroomAt: obs.classroomAt,
    classroomHistory: obs.classroomHistory,
  };
  if (obs.module === "fenologie") {
    return {
      ...common,
      stage: obs.stage,
      crownCondition: obs.crownCondition,
      species: obs.species,
    };
  }
  if (obs.module === "perturbari") {
    return {
      ...common,
      disturbanceTypes: obs.disturbanceTypes,
      insectType: obs.insectType,
      severity: obs.severity,
      affectedAreaSqm: obs.affectedAreaSqm,
      species: obs.species,
    };
  }
  return {
    ...common,
    mossPct: obs.mossPct,
    litterPct: obs.litterPct,
    barePct: obs.barePct,
    plantsPct: obs.plantsPct,
    seedlingsPresent: obs.seedlingsPresent,
    plotSize: obs.plotSize ?? "1x1m",
    aiCoverSuggestion: obs.aiCoverSuggestion,
  };
}

export async function listUsersRaw(db: D1Database): Promise<UserRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM users ORDER BY registered_at ASC")
    .all<UserRow>();
  return results ?? [];
}

export async function listUsers(db: D1Database): Promise<User[]> {
  return (await listUsersRaw(db)).map(userFromRow);
}

export async function findUserByEmail(
  db: D1Database,
  email: string
): Promise<User | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .bind(email)
    .first<UserRow>();
  return row ? userFromRow(row) : null;
}

export async function listObservations(db: D1Database): Promise<Observation[]> {
  const { results } = await db
    .prepare("SELECT * FROM observations ORDER BY created_at DESC")
    .all<ObsRow>();
  return (results ?? []).map(observationFromRow);
}

/** Re-write rows that still need DATA-03/05/06/07 normalization. */
export async function migrateObservationRows(db: D1Database): Promise<number> {
  const { results } = await db
    .prepare("SELECT * FROM observations")
    .all<ObsRow>();
  let n = 0;
  for (const row of results ?? []) {
    const before = observationFromRow(row);
    // observationFromRow already migrates — re-persist to normalize D1 payload.
    const payload = JSON.parse(row.payload_json || "{}") as Record<
      string,
      unknown
    >;
    const needs =
      (row.module === "fenologie" &&
        (payload.crownCondition == null || Number(payload.stage) === 5)) ||
      (row.module === "sol" && payload.plotSize == null) ||
      (typeof before.location?.latitude === "number" &&
        String(before.location.latitude).split(".")[1]?.length !== 5);
    if (!needs) continue;
    await upsertObservation(db, before);
    n += 1;
  }
  return n;
}

type TreeRow = {
  id: string;
  code: string;
  species: string;
  species_other: string | null;
  latitude: number;
  longitude: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  notes: string | null;
};

export function treeFromRow(row: TreeRow): SentinelTree {
  return {
    id: row.id,
    code: row.code,
    species: row.species as Species,
    speciesOther: row.species_other ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    notes: row.notes ?? undefined,
  };
}

export async function listSentinelTrees(db: D1Database): Promise<SentinelTree[]> {
  const { results } = await db
    .prepare("SELECT * FROM sentinel_trees ORDER BY created_at DESC")
    .all<TreeRow>();
  return (results ?? []).map(treeFromRow);
}

export async function getSentinelTree(
  db: D1Database,
  id: string
): Promise<SentinelTree | null> {
  const row = await db
    .prepare("SELECT * FROM sentinel_trees WHERE id = ?")
    .bind(id)
    .first<TreeRow>();
  return row ? treeFromRow(row) : null;
}

export async function nextTreeCode(db: D1Database): Promise<string> {
  const { results } = await db
    .prepare(`SELECT code FROM sentinel_trees WHERE code LIKE 'ARB-%'`)
    .all<{ code: string }>();
  let max = 0;
  for (const r of results ?? []) {
    const n = Number.parseInt(r.code.slice(4), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `ARB-${String(max + 1).padStart(4, "0")}`;
}

export async function upsertSentinelTree(
  db: D1Database,
  tree: SentinelTree
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sentinel_trees (
        id, code, species, species_other, latitude, longitude,
        created_by, created_by_name, created_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code=excluded.code,
        species=excluded.species,
        species_other=excluded.species_other,
        latitude=excluded.latitude,
        longitude=excluded.longitude,
        notes=excluded.notes`
    )
    .bind(
      tree.id,
      tree.code,
      tree.species,
      tree.speciesOther ?? null,
      roundCoord(tree.latitude, 5),
      roundCoord(tree.longitude, 5),
      tree.createdBy,
      tree.createdByName,
      tree.createdAt,
      tree.notes ?? null
    )
    .run();
}

export async function getObservationById(
  db: D1Database,
  id: string
): Promise<Observation | null> {
  const row = await db
    .prepare("SELECT * FROM observations WHERE id = ?")
    .bind(id)
    .first<ObsRow>();
  return row ? observationFromRow(row) : null;
}

export async function upsertUser(db: D1Database, user: User): Promise<void> {
  const manageUsers = user.role === "ranger" && user.canManageUsers ? 1 : 0;
  const validateObs =
    user.role === "ranger" && user.canValidateObservations ? 1 : 0;
  const teachSchool = user.role === "ranger" && user.canTeachSchool ? 1 : 0;
  const isDemo = user.isDemo ? 1 : 0;
  await db
    .prepare(
      `INSERT INTO users (
        id, email, name, role, status, password, is_adult, parental_consent,
        gdpr_accepted_at, gdpr_version, registered_at, last_login_at,
        can_manage_registrations, can_manage_users, can_validate_observations,
        can_teach_school, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email=excluded.email,
        name=excluded.name,
        role=excluded.role,
        status=excluded.status,
        password=excluded.password,
        is_adult=excluded.is_adult,
        parental_consent=excluded.parental_consent,
        gdpr_accepted_at=excluded.gdpr_accepted_at,
        gdpr_version=excluded.gdpr_version,
        registered_at=excluded.registered_at,
        last_login_at=excluded.last_login_at,
        can_manage_registrations=excluded.can_manage_registrations,
        can_manage_users=excluded.can_manage_users,
        can_validate_observations=excluded.can_validate_observations,
        can_teach_school=excluded.can_teach_school,
        is_demo=excluded.is_demo`
    )
    .bind(
      user.id,
      user.email,
      user.name,
      user.role,
      user.status,
      user.password,
      user.isAdult ? 1 : 0,
      user.parentalConsent == null ? null : user.parentalConsent ? 1 : 0,
      user.gdprAcceptedAt ?? null,
      user.gdprVersion ?? null,
      user.registeredAt,
      user.lastLoginAt ?? null,
      manageUsers, // legacy column kept in sync
      manageUsers,
      validateObs,
      teachSchool,
      isDemo
    )
    .run();
}

/** Next free PHEN-/DIST-/SOIL-NNNN code for the module. */
export async function nextObservationCode(
  db: D1Database,
  module: ObservationModule
): Promise<string> {
  const prefix = moduleCodePrefix(module);
  const rows = await db
    .prepare(`SELECT code FROM observations WHERE code LIKE ?`)
    .bind(`${prefix}-%`)
    .all<{ code: string }>();
  const max = maxCodeSequential(
    (rows.results ?? []).map((r) => r.code),
    module
  );
  return generateCode(module, max + 1);
}

/**
 * If another row already owns this code, mint a new one so sync never dies on
 * UNIQUE(observations.code).
 */
export async function ensureUniqueObservationCode(
  db: D1Database,
  obs: Observation
): Promise<Observation> {
  const row = await db
    .prepare(`SELECT id FROM observations WHERE code = ?`)
    .bind(obs.code)
    .first<{ id: string }>();
  if (!row || row.id === obs.id) return obs;
  return { ...obs, code: await nextObservationCode(db, obs.module) };
}

export async function upsertObservation(
  db: D1Database,
  obs: Observation
): Promise<void> {
  const syncedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO observations (
        id, code, module, status, author_id, author_role, author_name, details,
        photos_json, location_json, payload_json, created_at, validated_at,
        validator_id, validator_name, validation_comment, is_sentinel_tree,
        species, synced_at, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code=excluded.code,
        module=excluded.module,
        status=excluded.status,
        author_id=excluded.author_id,
        author_role=excluded.author_role,
        author_name=excluded.author_name,
        details=excluded.details,
        photos_json=excluded.photos_json,
        location_json=excluded.location_json,
        payload_json=excluded.payload_json,
        created_at=excluded.created_at,
        validated_at=excluded.validated_at,
        validator_id=excluded.validator_id,
        validator_name=excluded.validator_name,
        validation_comment=excluded.validation_comment,
        is_sentinel_tree=excluded.is_sentinel_tree,
        species=excluded.species,
        synced_at=excluded.synced_at,
        is_demo=excluded.is_demo`
    )
    .bind(
      obs.id,
      obs.code,
      obs.module,
      obs.status,
      obs.authorId,
      obs.authorRole,
      obs.authorName,
      obs.details ?? null,
      JSON.stringify(obs.photos ?? []),
      JSON.stringify({
        ...obs.location,
        latitude: roundCoord(obs.location.latitude, 5),
        longitude: roundCoord(obs.location.longitude, 5),
      }),
      JSON.stringify(payloadFor(obs)),
      obs.createdAt,
      obs.validatedAt ?? null,
      obs.validatorId ?? null,
      obs.validatorName ?? null,
      obs.validationComment ?? null,
      obs.isSentinelTree ? 1 : 0,
      obs.species ?? null,
      syncedAt,
      obs.isDemo ? 1 : 0
    )
    .run();
}

export async function deleteObservation(
  db: D1Database,
  id: string
): Promise<void> {
  await db.prepare("DELETE FROM observations WHERE id = ?").bind(id).run();
}

export async function insertAuditEvent(
  db: D1Database,
  event: AuditEvent
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_log (
        id, at, actor_id, actor_name, actor_role, action,
        object_type, object_id, detail
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      event.id,
      event.at,
      event.actorId,
      event.actorName,
      event.actorRole,
      event.action,
      event.objectType,
      event.objectId,
      event.detail ?? null
    )
    .run();
}

export async function listAuditEvents(
  db: D1Database,
  limit = 200
): Promise<AuditEvent[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM audit_log ORDER BY at DESC LIMIT ?`
    )
    .bind(limit)
    .all<{
      id: string;
      at: string;
      actor_id: string;
      actor_name: string;
      actor_role: string;
      action: string;
      object_type: string;
      object_id: string;
      detail: string | null;
    }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    at: r.at,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRole: r.actor_role as UserRole,
    action: r.action as AuditEvent["action"],
    objectType: r.object_type,
    objectId: r.object_id,
    detail: r.detail ?? undefined,
  }));
}

export async function deleteUserKeepObservations(
  db: D1Database,
  userId: string
): Promise<void> {
  const obs = await listObservations(db);
  for (const o of obs) {
    if (o.authorId !== userId) continue;
    await upsertObservation(db, {
      ...o,
      authorName: DELETED_USER_LABEL,
      authorId: `deleted:${userId}`,
    });
  }
  await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
}

export async function createPasswordReset(
  db: D1Database,
  token: PasswordResetToken
): Promise<void> {
  const purpose = token.purpose ?? "reset";
  await db
    .prepare(
      `INSERT INTO password_resets (
        id, user_id, token_hash, expires_at, created_at, used_at, purpose
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      token.id,
      token.userId,
      token.tokenHash,
      token.expiresAt,
      token.createdAt,
      token.usedAt ?? null,
      purpose
    )
    .run();
}

export async function findPasswordResetByHash(
  db: D1Database,
  tokenHash: string,
  purpose?: "reset" | "activate"
): Promise<PasswordResetToken | null> {
  const row = await db
    .prepare(
      purpose
        ? "SELECT * FROM password_resets WHERE token_hash = ? AND purpose = ?"
        : "SELECT * FROM password_resets WHERE token_hash = ?"
    )
    .bind(...(purpose ? [tokenHash, purpose] : [tokenHash]))
    .first<{
      id: string;
      user_id: string;
      token_hash: string;
      expires_at: string;
      created_at: string;
      used_at: string | null;
      purpose?: string | null;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    usedAt: row.used_at ?? undefined,
    purpose:
      row.purpose === "activate" || row.purpose === "reset"
        ? row.purpose
        : "reset",
  };
}

export async function markPasswordResetUsed(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare("UPDATE password_resets SET used_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), id)
    .run();
}

export async function allocateJoinCode(db: D1Database): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = generateActivityJoinCode(attempt < 16 ? 6 : 8);
    const hit = await db
      .prepare(
        `SELECT id FROM field_activities WHERE upper(join_code) = ? LIMIT 1`
      )
      .bind(code)
      .first<{ id: string }>();
    if (!hit) return code;
  }
  return generateActivityJoinCode(10);
}

function mapFieldActivityRow(r: {
  id: string;
  title: string;
  date: string;
  zone_name: string;
  zone_lat: number;
  zone_lng: number;
  zone_radius_m: number;
  tree_ids_json: string;
  school_name: string | null;
  join_code: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
}): FieldActivity {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    zoneName: r.zone_name,
    zoneLat: r.zone_lat,
    zoneLng: r.zone_lng,
    zoneRadiusM: r.zone_radius_m,
    treeIds: JSON.parse(r.tree_ids_json || "[]") as string[],
    schoolName: r.school_name ?? undefined,
    joinCode: r.join_code ?? "",
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
  };
}

export async function listFieldActivities(
  db: D1Database
): Promise<FieldActivity[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM field_activities ORDER BY date DESC, created_at DESC"
    )
    .all<{
      id: string;
      title: string;
      date: string;
      zone_name: string;
      zone_lat: number;
      zone_lng: number;
      zone_radius_m: number;
      tree_ids_json: string;
      school_name: string | null;
      join_code: string | null;
      created_by: string;
      created_by_name: string;
      created_at: string;
    }>();
  return (results ?? []).map(mapFieldActivityRow);
}

export async function listMemberActivityIds(
  db: D1Database,
  userId: string
): Promise<Set<string>> {
  const { results } = await db
    .prepare(`SELECT activity_id FROM activity_members WHERE user_id = ?`)
    .bind(userId)
    .all<{ activity_id: string }>();
  return new Set((results ?? []).map((r) => r.activity_id));
}

export async function listFieldActivitiesForUser(
  db: D1Database,
  userId: string,
  role: UserRole
): Promise<FieldActivity[]> {
  const all = await listFieldActivities(db);
  if (role === "admin" || role === "ranger") return all;
  const memberIds = await listMemberActivityIds(db, userId);
  if (role === "profesor") {
    return all.filter(
      (a) => a.createdBy === userId || memberIds.has(a.id)
    );
  }
  return all.filter((a) => memberIds.has(a.id));
}

export async function getFieldActivity(
  db: D1Database,
  id: string
): Promise<FieldActivity | null> {
  const row = await db
    .prepare(`SELECT * FROM field_activities WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<{
      id: string;
      title: string;
      date: string;
      zone_name: string;
      zone_lat: number;
      zone_lng: number;
      zone_radius_m: number;
      tree_ids_json: string;
      school_name: string | null;
      join_code: string | null;
      created_by: string;
      created_by_name: string;
      created_at: string;
    }>();
  return row ? mapFieldActivityRow(row) : null;
}

export async function getFieldActivityByJoinCode(
  db: D1Database,
  rawCode: string
): Promise<FieldActivity | null> {
  const code = normalizeJoinCode(rawCode);
  if (!code) return null;
  const row = await db
    .prepare(
      `SELECT * FROM field_activities WHERE upper(join_code) = ? LIMIT 1`
    )
    .bind(code)
    .first<{
      id: string;
      title: string;
      date: string;
      zone_name: string;
      zone_lat: number;
      zone_lng: number;
      zone_radius_m: number;
      tree_ids_json: string;
      school_name: string | null;
      join_code: string | null;
      created_by: string;
      created_by_name: string;
      created_at: string;
    }>();
  return row ? mapFieldActivityRow(row) : null;
}

export async function isActivityMember(
  db: D1Database,
  activityId: string,
  userId: string
): Promise<boolean> {
  const hit = await db
    .prepare(
      `SELECT user_id FROM activity_members WHERE activity_id = ? AND user_id = ? LIMIT 1`
    )
    .bind(activityId, userId)
    .first<{ user_id: string }>();
  return Boolean(hit);
}

export async function addActivityMember(
  db: D1Database,
  activity: FieldActivity,
  user: { id: string; name: string; role: UserRole }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO activity_members (
        activity_id, user_id, user_name, user_role, joined_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(activity_id, user_id) DO UPDATE SET
        user_name=excluded.user_name,
        user_role=excluded.user_role`
    )
    .bind(
      activity.id,
      user.id,
      user.name,
      user.role,
      new Date().toISOString()
    )
    .run();
}

export async function canAccessActivity(
  db: D1Database,
  activity: FieldActivity,
  user: { id: string; role: UserRole }
): Promise<boolean> {
  if (user.role === "admin" || user.role === "ranger") return true;
  if (activity.createdBy === user.id) return true;
  return isActivityMember(db, activity.id, user.id);
}

export async function upsertFieldActivity(
  db: D1Database,
  activity: FieldActivity
): Promise<void> {
  const joinCode =
    activity.joinCode?.trim() || (await allocateJoinCode(db));
  await db
    .prepare(
      `INSERT INTO field_activities (
        id, title, date, zone_name, zone_lat, zone_lng, zone_radius_m,
        tree_ids_json, school_name, join_code, created_by, created_by_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        date=excluded.date,
        zone_name=excluded.zone_name,
        zone_lat=excluded.zone_lat,
        zone_lng=excluded.zone_lng,
        zone_radius_m=excluded.zone_radius_m,
        tree_ids_json=excluded.tree_ids_json,
        school_name=excluded.school_name,
        join_code=COALESCE(excluded.join_code, field_activities.join_code)`
    )
    .bind(
      activity.id,
      activity.title,
      activity.date,
      activity.zoneName,
      activity.zoneLat,
      activity.zoneLng,
      activity.zoneRadiusM,
      JSON.stringify(activity.treeIds),
      activity.schoolName ?? null,
      joinCode,
      activity.createdBy,
      activity.createdByName,
      activity.createdAt
    )
    .run();
}

/** Delete activity, memberships, and unlink attached observations (keep observations). */
export async function deleteFieldActivity(
  db: D1Database,
  id: string
): Promise<{ deleted: boolean; unlinked: number }> {
  const activity = await getFieldActivity(db, id);
  if (!activity) return { deleted: false, unlinked: 0 };

  const linked = (await listObservations(db)).filter((o) => o.activityId === id);
  for (const obs of linked) {
    await upsertObservation(db, { ...obs, activityId: undefined });
  }

  await db
    .prepare("DELETE FROM activity_members WHERE activity_id = ?")
    .bind(id)
    .run();
  await db.prepare("DELETE FROM field_activities WHERE id = ?").bind(id).run();
  return { deleted: true, unlinked: linked.length };
}

export async function insertNotification(
  db: D1Database,
  n: AppNotification
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notifications (
        id, user_id, type, title, body, observation_id, created_at, read_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      n.id,
      n.userId,
      n.type,
      n.title,
      n.body,
      n.observationId ?? null,
      n.createdAt,
      n.readAt ?? null
    )
    .run();
}

export async function listNotificationsForUser(
  db: D1Database,
  userId: string
): Promise<AppNotification[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(userId)
    .all<{
      id: string;
      user_id: string;
      type: string;
      title: string;
      body: string;
      observation_id: string | null;
      created_at: string;
      read_at: string | null;
    }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type as AppNotification["type"],
    title: r.title,
    body: r.body,
    observationId: r.observation_id ?? undefined,
    createdAt: r.created_at,
    readAt: r.read_at ?? undefined,
  }));
}

export async function markNotificationRead(
  db: D1Database,
  id: string,
  userId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?`
    )
    .bind(new Date().toISOString(), id, userId)
    .run();
}

export async function findUserById(
  db: D1Database,
  id: string
): Promise<User | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<UserRow>();
  return row ? userFromRow(row) : null;
}

const SEED_USERS: User[] = [
  {
    id: "u-admin",
    email: "admin@cali-lab.ro",
    name: "Admin ISV",
    role: "admin",
    status: "activ",
    password: "Admin123!",
    isAdult: true,
    gdprAcceptedAt: "2026-09-01T10:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-05-01T08:00:00.000Z",
    lastLoginAt: "2026-09-20T09:00:00.000Z",
    isDemo: false,
  },
  {
    id: "u-ranger",
    email: "ranger@cali-lab.ro",
    name: "Georgiana Popa",
    role: "ranger",
    status: "activ",
    password: "Ranger123!",
    isAdult: true,
    gdprAcceptedAt: "2026-09-01T10:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-05-10T08:00:00.000Z",
    lastLoginAt: "2026-09-25T07:30:00.000Z",
    canManageUsers: false,
    canValidateObservations: true,
    canTeachSchool: false,
    isDemo: true,
  },
  {
    id: "u-turist",
    email: "turist@cali-lab.ro",
    name: "Andrei Popescu",
    role: "turist",
    status: "activ",
    password: "Turist123!",
    isAdult: true,
    gdprAcceptedAt: "2026-09-05T12:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-06-15T14:00:00.000Z",
    lastLoginAt: "2026-09-24T16:00:00.000Z",
    isDemo: true,
  },
  {
    id: "u-rezident",
    email: "rezident@cali-lab.ro",
    name: "Ioana Vasile",
    role: "rezident",
    status: "activ",
    password: "Rezident123!",
    isAdult: true,
    gdprAcceptedAt: "2026-09-02T11:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-06-20T10:00:00.000Z",
    isDemo: true,
  },
  {
    id: "u-elev",
    email: "elev@cali-lab.ro",
    name: "Maria Ionescu",
    role: "elev",
    status: "activ",
    password: "Elev1234!",
    isAdult: false,
    parentalConsent: true,
    gdprAcceptedAt: "2026-09-10T09:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-09-01T08:00:00.000Z",
    lastLoginAt: "2026-09-20T08:00:00.000Z",
    isDemo: true,
  },
  {
    id: "u-profesor",
    email: "profesor@cali-lab.ro",
    name: "Ana Popa",
    role: "profesor",
    status: "activ",
    password: "Profesor123!",
    isAdult: true,
    gdprAcceptedAt: "2026-09-01T10:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-05-15T08:00:00.000Z",
    lastLoginAt: "2026-09-22T08:00:00.000Z",
    isDemo: true,
  },
];

export async function seedIfEmpty(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare("SELECT COUNT(*) AS c FROM users")
    .first<{ c: number }>();
  if ((row?.c ?? 0) > 0) {
    await ensureDemoUsers(db);
    return false;
  }
  for (const u of SEED_USERS) {
    await upsertUser(db, {
      ...u,
      // Demo seed passwords are hashed with PBKDF2 — never stored in clear.
      password: await hashPassword(u.password),
    });
  }
  return true;
}

/** Insert missing demo accounts (e.g. profesor) without overwriting existing ones. */
export async function ensureDemoUsers(db: D1Database): Promise<void> {
  for (const u of SEED_USERS) {
    const existing = await findUserByEmail(db, u.email);
    if (existing) continue;
    await upsertUser(db, {
      ...u,
      password: await hashPassword(u.password),
    });
  }
}

/**
 * Ensure every user password in D1 is PBKDF2.
 * - Demo accounts: re-hash from known demo plaintext (also converts legacy bcrypt).
 * - Other plaintext rows: hash as-is.
 * - Other bcrypt rows: left for upgrade-on-login (cannot reverse).
 */
export async function migratePasswords(db: D1Database): Promise<number> {
  const users = await listUsers(db);
  const knownPlain = new Map<string, string>();
  for (const d of DEMO_ACCOUNTS) {
    knownPlain.set(d.email.toLowerCase(), d.password);
  }
  for (const s of SEED_USERS) {
    knownPlain.set(s.email.toLowerCase(), s.password);
  }

  let n = 0;
  for (const u of users) {
    if (isPbkdf2(u.password)) continue;

    const known = knownPlain.get(u.email.toLowerCase());
    if (known) {
      await upsertUser(db, {
        ...u,
        password: await hashPassword(known),
      });
      n += 1;
      continue;
    }

    if (needsRehash(u.password) && !u.password.startsWith("$2")) {
      // Plaintext legacy
      await upsertUser(db, {
        ...u,
        password: await hashPassword(u.password),
      });
      n += 1;
    }
  }
  return n;
}

/** @deprecated use migratePasswords */
export const migratePlaintextPasswords = migratePasswords;

/**
 * Move any base64 photos still stored in D1 into R2; D1 keeps only r2: keys.
 */
export async function migratePhotosToR2(
  db: D1Database,
  bucket: R2Bucket
): Promise<number> {
  const { persistObservationPhotos } = await import("@/lib/r2");
  const list = await listObservations(db);
  let n = 0;
  for (const obs of list) {
    const hasBase64 = (obs.photos ?? []).some(
      (p) => typeof p === "string" && p.startsWith("data:")
    );
    if (!hasBase64) continue;
    const photos = await persistObservationPhotos(
      bucket,
      obs.id,
      obs.photos ?? []
    );
    await upsertObservation(db, { ...obs, photos });
    n += 1;
  }
  return n;
}
