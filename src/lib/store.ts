"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppSettings,
  Observation,
  PublicUser,
  ObservationStatus,
  UserRole,
} from "./types";
import { GDPR_VERSION } from "./constants";
import {
  generateCode,
  maxCodeSequential,
  mockLocationNearPark,
} from "./format";
import { tKey } from "./i18n/store";
import {
  deleteObservationPhotosFromIdb,
  hydratePhotosForSync,
  saveObservationPhotosToIdb,
} from "./photo-idb";
import { stripBase64Photos } from "./photos";

interface CaliState {
  users: PublicUser[];
  observations: Observation[];
  currentUserId: string | null;
  offlineQueue: Observation[];
  syncing: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  settings: AppSettings;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  pullFromServer: () => Promise<{ ok: boolean; error?: string }>;
  flushOfflineQueue: () => Promise<{ ok: boolean; uploaded: number; error?: string }>;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: "rezident" | "turist";
    isAdult: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  acceptGdpr: () => void;
  addObservation: (obs: Observation) => void;
  updateObservation: (id: string, patch: Partial<Observation>) => void;
  deleteObservation: (id: string) => void;
  validateObservation: (
    id: string,
    decision: "aprobat" | "respins",
    comment: string,
    markSentinel?: boolean
  ) => { ok: boolean; error?: string };
  createUser: (data: {
    name: string;
    email: string;
    role: UserRole;
    parentalConsent?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  nextCode: (module: Observation["module"]) => string;
  currentUser: () => PublicUser | null;
  pendingCount: () => number;
  /** Clear local session on 401 — keeps offlineQueue intact. */
  clearExpiredSession: () => void;
}

/** Offline fallback directory — never includes passwords. */
const seedUsers: PublicUser[] = [
  {
    id: "u-admin",
    email: "admin@cali-lab.ro",
    name: "Admin ISV",
    role: "admin",
    status: "activ",
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
    isAdult: false,
    parentalConsent: true,
    gdprAcceptedAt: "2026-09-10T09:00:00.000Z",
    gdprVersion: GDPR_VERSION,
    registeredAt: "2026-09-01T08:00:00.000Z",
  },
];

function seedObservations(): Observation[] {
  const loc = () => mockLocationNearPark();
  const base = new Date("2026-09-10T10:00:00.000Z").getTime();
  const days = (n: number) => new Date(base + n * 86400000).toISOString();

  const rows: Observation[] = [
    {
      id: "o1",
      code: "PHEN-0001",
      module: "fenologie",
      status: "aprobat",
      authorId: "u-turist",
      authorRole: "turist",
      authorName: "Andrei Popescu",
      stage: 4,
      species: "picea_abies",
      details: "Coroană sănătoasă pe versant nordic.",
      photos: ["/placeholders/tree-1.svg"],
      location: loc(),
      createdAt: days(0),
      validatedAt: days(1),
      validatorId: "u-ranger",
      validatorName: "Mitache Petronela",
      validationComment: "Observație clară.",
    },
    {
      id: "o2",
      code: "DIST-0001",
      module: "perturbari",
      status: "in_asteptare",
      authorId: "u-rezident",
      authorRole: "rezident",
      authorName: "Ioana Vasile",
      disturbanceTypes: ["atac_insecte"],
      insectType: "Ips typographus",
      severity: 3,
      affectedAreaSqm: 40,
      species: "picea_abies",
      details: "Galeriile vizibile pe scoarță.",
      photos: ["/placeholders/disturbance-1.svg"],
      location: loc(),
      createdAt: days(2),
    },
    {
      id: "o3",
      code: "SOIL-0001",
      module: "sol",
      status: "aprobat",
      authorId: "u-elev",
      authorRole: "elev",
      authorName: "Maria Ionescu",
      mossPct: 35,
      litterPct: 30,
      barePct: 10,
      plantsPct: 25,
      seedlingsPresent: true,
      details: "Ferigi și puieți de molid.",
      photos: ["/placeholders/soil-1.svg"],
      location: loc(),
      createdAt: days(3),
      validatedAt: days(4),
      validatorId: "u-ranger",
      validatorName: "Mitache Petronela",
    },
    {
      id: "o4",
      code: "PHEN-0002",
      module: "fenologie",
      status: "in_asteptare",
      authorId: "u-turist",
      authorRole: "turist",
      authorName: "Andrei Popescu",
      stage: 5,
      species: "picea_abies",
      details: "Îngălbenire pe vârfuri.",
      photos: ["/placeholders/tree-2.svg"],
      location: loc(),
      createdAt: days(5),
    },
    {
      id: "o5",
      code: "DIST-0002",
      module: "perturbari",
      status: "aprobat",
      authorId: "u-ranger",
      authorRole: "ranger",
      authorName: "Mitache Petronela",
      disturbanceTypes: ["doboratura_vant"],
      severity: 4,
      affectedAreaSqm: 120,
      species: "picea_abies",
      details: "Doborâtură recentă după furtună.",
      photos: ["/placeholders/disturbance-2.svg"],
      location: loc(),
      createdAt: days(6),
      validatedAt: days(6),
      validatorId: "u-ranger",
      validatorName: "Mitache Petronela",
      isSentinelTree: true,
      validationComment: "Marcat ca arbore santinelă.",
    },
    {
      id: "o6",
      code: "SOIL-0002",
      module: "sol",
      status: "in_asteptare",
      authorId: "u-turist",
      authorRole: "turist",
      authorName: "Andrei Popescu",
      mossPct: 20,
      litterPct: 40,
      barePct: 15,
      plantsPct: 25,
      seedlingsPresent: false,
      details: "Litieră de ace dominantă.",
      photos: ["/placeholders/soil-2.svg"],
      location: loc(),
      createdAt: days(8),
    },
    {
      id: "o7",
      code: "PHEN-0003",
      module: "fenologie",
      status: "in_asteptare",
      authorId: "u-elev",
      authorRole: "elev",
      authorName: "Maria Ionescu",
      stage: 3,
      species: "abies_alba",
      details: "Ace noi pe brad.",
      photos: ["/placeholders/tree-1.svg"],
      location: loc(),
      createdAt: days(9),
    },
    {
      id: "o8",
      code: "DIST-0003",
      module: "perturbari",
      status: "in_asteptare",
      authorId: "u-rezident",
      authorRole: "rezident",
      authorName: "Ioana Vasile",
      disturbanceTypes: ["uscare"],
      severity: 2,
      affectedAreaSqm: 15,
      species: "picea_abies",
      details: "Uscare locală pe crengi inferioare.",
      photos: ["/placeholders/disturbance-1.svg"],
      location: loc(),
      createdAt: days(10),
    },
  ];

  return rows.map((o) => ({
    ...o,
    syncStatus: "synced" as const,
    syncedAt: o.validatedAt ?? o.createdAt,
  }));
}

export const useCaliStore = create<CaliState>()(
  persist(
    (set, get) => ({
      users: seedUsers,
      observations: seedObservations(),
      currentUserId: null,
      offlineQueue: [],
      syncing: false,
      lastSyncAt: null,
      lastSyncError: null,
      settings: {
        passwordResetMinutesUser: 5,
        passwordResetMinutesAdmin: 240,
        smtpEncryption: "tls",
        gpsAccuracyWarningMeters: 30,
      },
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      pullFromServer: async () => {
        try {
          const res = await fetch("/api/bootstrap", {
            cache: "no-store",
            credentials: "include",
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            return {
              ok: false,
              error: body.error ?? `HTTP ${res.status}`,
            };
          }
          const data = (await res.json()) as {
            user: PublicUser | null;
            users: PublicUser[];
            observations: Observation[];
          };
          // SEC-06: merge server data with local unsynced — never wipe the queue.
          // - Local-only (airplane mode): keep
          // - Same id + stale sync error: prefer remote (recover after R2/outage)
          // - Same id + pending mutation (e.g. ranger validation): keep local
          const remote = data.observations ?? [];
          const remoteById = new Map(remote.map((o) => [o.id, o]));
          const remoteIds = new Set(remoteById.keys());

          const sessionUserId = data.user?.id ?? null;
          const queue = get().offlineQueue;
          // Preserve other accounts' offline rows in storage, but never surface
          // them while another user is logged in (same browser profile).
          const nextQueue = queue.filter((o) => {
            if (sessionUserId && o.authorId && o.authorId !== sessionUserId) {
              return true; // keep for when that user logs back in
            }
            const r = remoteById.get(o.id);
            if (!r) return true;
            if (o.syncStatus === "error") return false;
            // Keep real pending edits (status / validation differ from server).
            if (o.status !== r.status) return true;
            if ((o.validatedAt ?? "") !== (r.validatedAt ?? "")) return true;
            return false;
          });
          const sessionRole = data.user?.role ?? null;
          const isStaff =
            sessionRole === "admin" || sessionRole === "ranger";
          // Staff must flush validations on others' rows; field users only own rows.
          const activeQueue = nextQueue.filter((o) => {
            if (!sessionUserId) return false;
            if (!o.authorId || o.authorId === sessionUserId) return true;
            return isStaff;
          });
          const activeQueueIds = new Set(activeQueue.map((o) => o.id));

          const remoteCodes = new Set(remote.map((o) => o.code));
          const localOnly = get().observations.filter(
            (o) =>
              !remoteIds.has(o.id) &&
              !remoteCodes.has(o.code) &&
              (!sessionUserId ||
                o.authorId === sessionUserId ||
                isStaff) &&
              (activeQueueIds.has(o.id) ||
                o.syncStatus === "pending" ||
                o.syncStatus === "error")
          );
          // Drop queue rows that collide with a server code (failed re-create).
          const cleanedQueue = nextQueue.filter(
            (o) => remoteIds.has(o.id) || !remoteCodes.has(o.code)
          );

          const merged = [
            ...remote.map((r) => {
              const q = activeQueue.find((o) => o.id === r.id);
              return q ?? r;
            }),
            ...localOnly,
          ].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          let users = data.users ?? [];
          if (data.user && !users.some((u) => u.id === data.user!.id)) {
            users = [data.user, ...users];
          }

          // Trust the server session. A stale local currentUserId without a
          // cookie leaves the UI "logged in" while /api/sync returns 401.
          const nextUserId = data.user?.id ?? null;
          const nextUsers = data.user
            ? users.length
              ? users
              : [data.user, ...get().users.filter((u) => u.id !== data.user!.id)]
            : get().users;

          set({
            users: nextUsers,
            observations: merged,
            offlineQueue: cleanedQueue,
            currentUserId: nextUserId,
            lastSyncAt: new Date().toISOString(),
            lastSyncError: null,
            syncing: false,
          });
          return { ok: true };
        } catch (e) {
          set({ syncing: false });
          return {
            ok: false,
            error: e instanceof Error ? e.message : "pull_failed",
          };
        }
      },

      currentUser: () => {
        const { users, currentUserId } = get();
        return users.find((u) => u.id === currentUserId) ?? null;
      },

      pendingCount: () =>
        get().observations.filter((o) => o.status === "in_asteptare").length,

      clearExpiredSession: () => {
        set({
          currentUserId: null,
          syncing: false,
          lastSyncError: "session_expired",
          // offlineQueue intentionally preserved
        });
      },

      login: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            user?: PublicUser;
          };
          if (!res.ok || !data.ok || !data.user) {
            if (data.error === "inactive") {
              return { ok: false, error: tKey("error.inactiveAccount") };
            }
            return { ok: false, error: tKey("error.invalidLogin") };
          }
          set({
            currentUserId: data.user.id,
            users: [
              data.user,
              ...get().users.filter((u) => u.id !== data.user!.id),
            ],
            lastSyncError: null,
          });
          // Pull/sync must not fail the login — large bootstrap payloads were
          // causing a false "invalid password" after a successful auth.
          // After login, always try to flush the preserved offline queue.
          void get()
            .pullFromServer()
            .then(() => get().flushOfflineQueue())
            .catch(() => undefined);
          return { ok: true };
        } catch {
          return { ok: false, error: tKey("error.invalidLogin") };
        }
      },

      logout: async () => {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
        } catch {
          /* ignore */
        }
        set({ currentUserId: null, syncing: false, lastSyncError: null });
      },

      register: async ({ name, email, password, role, isAdult }) => {
        if (!isAdult)
          return {
            ok: false,
            error: tKey("error.mustBeAdult"),
          };
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role, isAdult }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            user?: PublicUser;
          };
          if (!res.ok || !data.ok || !data.user) {
            if (data.error === "email_exists") {
              return { ok: false, error: tKey("error.emailExists") };
            }
            if (data.error === "password_rules") {
              return { ok: false, error: tKey("error.passwordRules") };
            }
            return { ok: false, error: tKey("obs.error") };
          }
          set({
            currentUserId: data.user.id,
            users: [data.user, ...get().users.filter((u) => u.id !== data.user!.id)],
          });
          void get()
            .pullFromServer()
            .then((r) => {
              if (r.ok) void get().flushOfflineQueue();
            })
            .catch(() => undefined);
          return { ok: true };
        } catch {
          return { ok: false, error: tKey("obs.error") };
        }
      },

      acceptGdpr: () => {
        const id = get().currentUserId;
        if (!id) return;
        const next = get().users.map((u) =>
          u.id === id
            ? {
                ...u,
                gdprAcceptedAt: new Date().toISOString(),
                gdprVersion: GDPR_VERSION,
              }
            : u
        );
        set({ users: next });
        if (typeof navigator !== "undefined" && navigator.onLine) {
          void fetch("/api/auth/gdpr", {
            method: "POST",
            credentials: "include",
          }).catch(() => undefined);
        }
      },

      nextCode: (module) => {
        // Use max sequential+1 — count+1 collides when codes are sparse
        // (e.g. server already has DIST-0002 → must mint DIST-0003).
        const codes = [
          ...get().observations.map((o) => o.code),
          ...get().offlineQueue.map((o) => o.code),
        ];
        return generateCode(module, maxCodeSequential(codes, module) + 1);
      },

      addObservation: (obs) => {
        const pending: Observation = {
          ...stripBase64Photos(obs),
          syncStatus: "pending",
          syncError: undefined,
        };
        // Clear a stuck spinner from a previous session before queuing.
        set({
          syncing: false,
          observations: [pending, ...get().observations.filter((o) => o.id !== pending.id)],
          offlineQueue: [
            pending,
            ...get().offlineQueue.filter((o) => o.id !== pending.id),
          ],
        });
        // Defer upload so navigation / UI updates are never blocked by sync.
        if (typeof navigator !== "undefined" && navigator.onLine) {
          setTimeout(() => {
            void get().flushOfflineQueue();
          }, 0);
        }
      },

      flushOfflineQueue: async () => {
        const queue = get().offlineQueue;
        if (!queue.length) {
          set({ syncing: false });
          return { ok: true, uploaded: 0 };
        }
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return { ok: false, uploaded: 0, error: "offline" };
        }
        if (!get().currentUserId) {
          set({
            syncing: false,
            lastSyncError: "session_expired",
          });
          return { ok: false, uploaded: 0, error: "session_expired" };
        }
        if (get().syncing) {
          return { ok: false, uploaded: 0, error: "busy" };
        }

        const userId = get().currentUserId;
        const role = get().currentUser()?.role;
        const isStaff = role === "admin" || role === "ranger";
        // Field users: only own rows. Staff: also validations/edits on others.
        // Never flush a different field-account's leftover offline creates.
        const ownedQueue = queue.filter((o) => {
          if (!userId) return false;
          if (!o.authorId || o.authorId === userId) return true;
          return isStaff;
        });
        if (!ownedQueue.length) {
          set({ syncing: false });
          return { ok: true, uploaded: 0 };
        }

        set({ syncing: true, lastSyncError: null });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
          // Hydrate idb: / leftover data: photos before upload to R2 via /api/sync.
          const hydrated = await Promise.all(
            ownedQueue.map(async (o) => ({
              ...o,
              photos: await hydratePhotosForSync(o.id, o.photos ?? []),
            }))
          );

          const res = await fetch("/api/sync", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              observations: hydrated,
              uploadedAt: new Date().toISOString(),
            }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            const unauthorized =
              res.status === 401 || body.error === "unauthorized";
            if (unauthorized) {
              // Keep offlineQueue; clear local session so UI redirects to login.
              set({
                syncing: false,
                currentUserId: null,
                lastSyncError: "session_expired",
                observations: get().observations.map((o) =>
                  ownedQueue.some((q) => q.id === o.id)
                    ? { ...o, syncStatus: "pending", syncError: undefined }
                    : o
                ),
              });
              return { ok: false, uploaded: 0, error: "session_expired" };
            }
            const msg = `HTTP ${res.status}`;
            const ownedIds = new Set(ownedQueue.map((o) => o.id));
            set({
              syncing: false,
              lastSyncError: msg,
              observations: get().observations.map((o) =>
                ownedIds.has(o.id)
                  ? { ...o, syncStatus: "error", syncError: msg }
                  : o
              ),
              offlineQueue: get().offlineQueue.map((o) =>
                ownedIds.has(o.id)
                  ? { ...o, syncStatus: "error" as const, syncError: msg }
                  : o
              ),
            });
            return { ok: false, uploaded: 0, error: msg };
          }

          const body = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            ids?: string[];
            observations?: Observation[];
          };
          // SEC-06: mark synced only for ids confirmed in the 200 body.
          const syncedIds = new Set(body.ids ?? []);
          if (!syncedIds.size) {
            set({
              syncing: false,
              lastSyncError: "empty_sync",
              observations: get().observations.map((o) =>
                queue.some((q) => q.id === o.id)
                  ? { ...o, syncStatus: "error", syncError: "empty_sync" }
                  : o
              ),
            });
            return { ok: false, uploaded: 0, error: "empty_sync" };
          }

          const syncedAt = new Date().toISOString();
          const serverById = new Map(
            (body.observations ?? []).map((o) => [o.id, o])
          );

          for (const id of syncedIds) {
            void deleteObservationPhotosFromIdb(id).catch(() => undefined);
          }

          set({
            syncing: false,
            lastSyncAt: syncedAt,
            lastSyncError: null,
            offlineQueue: get().offlineQueue.filter((o) => !syncedIds.has(o.id)),
            observations: get().observations.map((o) => {
              if (!syncedIds.has(o.id)) return o;
              const fromServer = serverById.get(o.id);
              // Server may remap code on UNIQUE collision (DIST-0002 → DIST-0003).
              return {
                ...o,
                ...(fromServer ?? {}),
                code: fromServer?.code ?? o.code,
                photos: fromServer?.photos ?? o.photos,
                syncStatus: "synced" as const,
                syncedAt,
                syncError: undefined,
              };
            }),
          });
          return { ok: true, uploaded: syncedIds.size };
        } catch (e) {
          const msg =
            e instanceof Error && e.name === "AbortError"
              ? "timeout"
              : e instanceof Error
                ? e.message
                : "network";
          const ownedIds = new Set(ownedQueue.map((o) => o.id));
          set({
            syncing: false,
            lastSyncError: msg,
            observations: get().observations.map((o) =>
              ownedIds.has(o.id)
                ? { ...o, syncStatus: "error", syncError: msg }
                : o
            ),
          });
          return { ok: false, uploaded: 0, error: msg };
        } finally {
          clearTimeout(timeout);
        }
      },

      updateObservation: (id, patch) =>
        set({
          observations: get().observations.map((o) =>
            o.id === id ? ({ ...o, ...patch } as Observation) : o
          ),
        }),

      deleteObservation: (id) => {
        set({
          observations: get().observations.filter((o) => o.id !== id),
          offlineQueue: get().offlineQueue.filter((o) => o.id !== id),
        });
        if (typeof navigator !== "undefined" && navigator.onLine) {
          void fetch(`/api/observations/${id}`, {
            method: "DELETE",
            credentials: "include",
          }).catch(() => undefined);
        }
      },

      validateObservation: (id, decision, comment, markSentinel) => {
        const user = get().currentUser();
        if (!user || (user.role !== "ranger" && user.role !== "admin"))
          return { ok: false, error: tKey("error.onlyRangers") };
        const obs = get().observations.find((o) => o.id === id);
        if (!obs) return { ok: false, error: tKey("error.obsMissing") };
        if (obs.status !== "in_asteptare")
          return { ok: false, error: tKey("error.notPending") };
        if (obs.authorId === user.id && user.role === "ranger")
          return {
            ok: false,
            error: tKey("error.selfValidate"),
          };
        if (decision === "respins" && !comment.trim())
          return {
            ok: false,
            error: tKey("error.rejectComment"),
          };

        const status: ObservationStatus = decision;
        const patched = get().observations.map((o) =>
          o.id === id
            ? {
                ...o,
                status,
                validatedAt: new Date().toISOString(),
                validatorId: user.id,
                validatorName: user.name,
                validationComment: comment.trim() || undefined,
                isSentinelTree:
                  markSentinel && o.module === "perturbari"
                    ? true
                    : o.isSentinelTree,
                syncStatus: "pending" as const,
              }
            : o
        );
        const updated = patched.find((o) => o.id === id)!;
        set({
          observations: patched,
          offlineQueue: [
            updated,
            ...get().offlineQueue.filter((o) => o.id !== id),
          ],
        });
        if (typeof navigator !== "undefined" && navigator.onLine) {
          void get().flushOfflineQueue();
        }
        return { ok: true };
      },

      createUser: async ({ name, email, role, parentalConsent }) => {
        if (get().users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
          return { ok: false, error: tKey("error.emailUsed") };
        if (role === "elev" && !parentalConsent)
          return {
            ok: false,
            error: tKey("error.parental"),
          };
        const user: PublicUser = {
          id: `u-${crypto.randomUUID().slice(0, 8)}`,
          email,
          name,
          role,
          status: "inactiv",
          isAdult: role !== "elev",
          parentalConsent: role === "elev" ? true : undefined,
          registeredAt: new Date().toISOString(),
        };
        try {
          const res = await fetch("/api/users", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...user, password: "Temp1234!" }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            user?: PublicUser;
          };
          if (!res.ok) {
            if (data.error === "email_used") {
              return { ok: false, error: tKey("error.emailUsed") };
            }
            return { ok: false, error: tKey("obs.error") };
          }
          set({
            users: [
              ...get().users,
              data.user ?? user,
            ].filter(
              (u, i, arr) => arr.findIndex((x) => x.id === u.id) === i
            ),
          });
          return { ok: true };
        } catch {
          return { ok: false, error: tKey("obs.error") };
        }
      },
    }),
    {
      name: "cali-app-v1",
      skipHydration: true,
      partialize: (s) => ({
        users: s.users,
        // Never persist base64 photos in localStorage (SEC-05 → IndexedDB).
        observations: s.observations.map(stripBase64Photos),
        // currentUserId is NOT persisted — auth comes from /api/bootstrap.
        offlineQueue: s.offlineQueue.map(stripBase64Photos),
        lastSyncAt: s.lastSyncAt,
        settings: s.settings,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CaliState> & {
          users?: Array<PublicUser & { password?: string }>;
        };
        const users = (p.users ?? current.users).map((u) => {
          if (u && typeof u === "object" && "password" in u) {
            const { password: _drop, ...rest } = u;
            return rest;
          }
          return u;
        });
        const rawObs = p.observations ?? current.observations;
        const rawQueue = p.offlineQueue ?? current.offlineQueue;
        // Migrate any leftover data: URIs from older caches into IndexedDB.
        if (typeof indexedDB !== "undefined") {
          for (const o of [...rawObs, ...rawQueue]) {
            const hasData = (o.photos ?? []).some(
              (ph) => typeof ph === "string" && ph.startsWith("data:")
            );
            if (hasData) {
              void saveObservationPhotosToIdb(o.id, o.photos ?? []).catch(
                () => undefined
              );
            }
          }
        }
        // Never restore ephemeral flags or a stale local session.
        return {
          ...current,
          users,
          observations: rawObs.map(stripBase64Photos),
          currentUserId: null,
          offlineQueue: rawQueue.map(stripBase64Photos),
          lastSyncAt: p.lastSyncAt ?? current.lastSyncAt,
          settings: p.settings ?? current.settings,
          syncing: false,
          lastSyncError: null,
          hydrated: false,
        };
      },
    }
  )
);
