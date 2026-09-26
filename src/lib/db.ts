import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  FenologieObservation,
  Observation,
  PerturbariObservation,
  SolObservation,
  User,
  UserRole,
  UserStatus,
} from "@/lib/types";
import { GDPR_VERSION } from "@/lib/constants";

export type CloudflareEnv = {
  DB: D1Database;
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
        last_login_at TEXT
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
  ]);
}

type UserRow = {
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
};

export function userFromRow(row: UserRow): User {
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
  };
}

export function observationFromRow(row: ObsRow): Observation {
  const base = {
    id: row.id,
    code: row.code,
    status: row.status as Observation["status"],
    authorId: row.author_id,
    authorRole: row.author_role as UserRole,
    authorName: row.author_name,
    details: row.details ?? undefined,
    photos: JSON.parse(row.photos_json || "[]") as string[],
    location: JSON.parse(row.location_json),
    createdAt: row.created_at,
    validatedAt: row.validated_at ?? undefined,
    validatorId: row.validator_id ?? undefined,
    validatorName: row.validator_name ?? undefined,
    validationComment: row.validation_comment ?? undefined,
    isSentinelTree: row.is_sentinel_tree === 1,
    species: (row.species as Observation["species"]) ?? undefined,
    syncStatus: "synced" as const,
    syncedAt: row.synced_at ?? row.created_at,
  };
  const payload = JSON.parse(row.payload_json || "{}") as Record<string, unknown>;

  if (row.module === "fenologie") {
    return {
      ...base,
      module: "fenologie",
      stage: payload.stage as FenologieObservation["stage"],
      species: (payload.species ?? row.species) as FenologieObservation["species"],
    };
  }
  if (row.module === "perturbari") {
    return {
      ...base,
      module: "perturbari",
      disturbanceTypes:
        payload.disturbanceTypes as PerturbariObservation["disturbanceTypes"],
      insectType: payload.insectType as string | undefined,
      severity: payload.severity as PerturbariObservation["severity"],
      affectedAreaSqm: payload.affectedAreaSqm as number,
      species: (payload.species ?? row.species) as PerturbariObservation["species"],
    };
  }
  return {
    ...base,
    module: "sol",
    mossPct: payload.mossPct as number,
    litterPct: payload.litterPct as number,
    barePct: payload.barePct as number,
    plantsPct: payload.plantsPct as number,
    seedlingsPresent: Boolean(payload.seedlingsPresent),
  } as SolObservation;
}

function payloadFor(obs: Observation): Record<string, unknown> {
  if (obs.module === "fenologie") {
    return { stage: obs.stage, species: obs.species };
  }
  if (obs.module === "perturbari") {
    return {
      disturbanceTypes: obs.disturbanceTypes,
      insectType: obs.insectType,
      severity: obs.severity,
      affectedAreaSqm: obs.affectedAreaSqm,
      species: obs.species,
    };
  }
  return {
    mossPct: obs.mossPct,
    litterPct: obs.litterPct,
    barePct: obs.barePct,
    plantsPct: obs.plantsPct,
    seedlingsPresent: obs.seedlingsPresent,
  };
}

export async function listUsers(db: D1Database): Promise<User[]> {
  const { results } = await db
    .prepare("SELECT * FROM users ORDER BY registered_at ASC")
    .all<UserRow>();
  return (results ?? []).map(userFromRow);
}

export async function listObservations(db: D1Database): Promise<Observation[]> {
  const { results } = await db
    .prepare("SELECT * FROM observations ORDER BY created_at DESC")
    .all<ObsRow>();
  return (results ?? []).map(observationFromRow);
}

export async function upsertUser(db: D1Database, user: User): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (
        id, email, name, role, status, password, is_adult, parental_consent,
        gdpr_accepted_at, gdpr_version, registered_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        last_login_at=excluded.last_login_at`
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
      user.lastLoginAt ?? null
    )
    .run();
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
        species, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        synced_at=excluded.synced_at`
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
      JSON.stringify(obs.location),
      JSON.stringify(payloadFor(obs)),
      obs.createdAt,
      obs.validatedAt ?? null,
      obs.validatorId ?? null,
      obs.validatorName ?? null,
      obs.validationComment ?? null,
      obs.isSentinelTree ? 1 : 0,
      obs.species ?? null,
      syncedAt
    )
    .run();
}

export async function deleteObservation(
  db: D1Database,
  id: string
): Promise<void> {
  await db.prepare("DELETE FROM observations WHERE id = ?").bind(id).run();
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
  },
  {
    id: "u-ranger",
    email: "ranger@cali-lab.ro",
    name: "Mitache Petronela",
    role: "ranger",
    status: "activ",
    password: "Ranger123!",
    isAdult: true,
    gdprAcceptedAt: "2026-09-01T10:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-05-10T08:00:00.000Z",
    lastLoginAt: "2026-09-25T07:30:00.000Z",
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
  },
];

export async function seedIfEmpty(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare("SELECT COUNT(*) AS c FROM users")
    .first<{ c: number }>();
  if ((row?.c ?? 0) > 0) return false;
  for (const u of SEED_USERS) {
    await upsertUser(db, u);
  }
  return true;
}
