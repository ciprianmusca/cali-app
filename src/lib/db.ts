import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  CrownCondition,
  FenologieObservation,
  Observation,
  ObservationModule,
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
  generateCode,
  maxCodeSequential,
  moduleCodePrefix,
  roundCoord,
} from "@/lib/format";
import { migrateObservation } from "@/lib/migrate-observation";
import { hashPassword, isPbkdf2, needsRehash } from "@/lib/password";

export type CloudflareEnv = {
  DB: D1Database;
  PHOTOS: R2Bucket;
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
  ]);
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
    } as SolObservation;
  }
  return migrateObservation(obs);
}

function payloadFor(obs: Observation): Record<string, unknown> {
  const common: Record<string, unknown> = {
    photoMeta: obs.photoMeta,
    locationAdjusted: obs.locationAdjusted,
    sentinelTreeId: obs.sentinelTreeId,
    speciesOther: obs.speciesOther,
    editHistory: obs.editHistory,
    validationHistory: obs.validationHistory,
    originalFields: obs.originalFields,
    clarificationQuestion: obs.clarificationQuestion,
    clarificationReply: obs.clarificationReply,
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
    await upsertUser(db, {
      ...u,
      // Demo seed passwords are hashed with PBKDF2 — never stored in clear.
      password: await hashPassword(u.password),
    });
  }
  return true;
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
