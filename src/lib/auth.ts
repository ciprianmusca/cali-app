import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { User, UserRole, PublicUser } from "@/lib/types";
import { getDB, ensureSchema, listUsersRaw, userFromRow } from "@/lib/db";
import {
  canManageUsers,
  canValidateObservations,
} from "@/lib/capabilities";

export const SESSION_COOKIE = "cali_session";
const SESSION_DAYS = 14;

type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
  /** Must match users.session_version or the JWT is rejected. */
  sv: number;
};

export function toPublicUser(user: User): PublicUser {
  const { password: _password, ...rest } = user;
  return rest;
}

async function getAuthSecret(): Promise<Uint8Array> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const secret =
      (env as { AUTH_SECRET?: string }).AUTH_SECRET ||
      process.env.AUTH_SECRET;
    if (secret && secret.length >= 16) {
      return new TextEncoder().encode(secret);
    }
  } catch {
    /* local / missing context */
  }
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16) {
    return new TextEncoder().encode(process.env.AUTH_SECRET);
  }
  // Deterministic fallback so builds work; override with wrangler secret AUTH_SECRET in production.
  return new TextEncoder().encode(
    "cali-lab-dev-auth-secret-change-me-32b"
  );
}

export async function createSessionToken(
  user: Pick<User, "id" | "email" | "role" | "name" | "sessionVersion">
): Promise<string> {
  const secret = await getAuthSecret();
  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
    sv: user.sessionVersion ?? 0,
  } satisfies Omit<SessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = await getAuthSecret();
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
      name: String(payload.name ?? ""),
      sv: typeof payload.sv === "number" ? payload.sv : 0,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_DAYS * 86400));
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  const db = await getDB();
  await ensureSchema(db);
  const rows = await listUsersRaw(db);
  const row = rows.find((r) => r.id === session.sub);
  if (!row || row.status !== "activ") return null;
  const user = userFromRow(row);
  if ((user.sessionVersion ?? 0) !== session.sv) return null;
  return user;
}

export async function requireUser(): Promise<
  { user: User; error?: undefined } | { user?: undefined; error: Response }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: User; error?: undefined } | { user?: undefined; error: Response }
> {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.role !== "admin") {
    return {
      error: Response.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }
  return result;
}

/** Admin or ranger with canManageUsers. Sandbox demo users are always denied. */
export async function requireUsersManager(): Promise<
  { user: User; error?: undefined } | { user?: undefined; error: Response }
> {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.isDemo || !canManageUsers(result.user)) {
    return {
      error: Response.json({ ok: false, error: "forbidden" }, { status: 403 }),
    };
  }
  return result;
}

/** @deprecated use requireUsersManager */
export const requireRegistrationsManager = requireUsersManager;

/** Admin or ranger with observation-validation flag. */
export function canValidate(user: {
  role: UserRole;
  canValidateObservations?: boolean;
}): boolean {
  return canValidateObservations(user);
}
