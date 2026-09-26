"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppSettings,
  Observation,
  User,
  ObservationStatus,
  UserRole,
} from "./types";
import { GDPR_VERSION } from "./constants";
import { generateCode, mockLocationNearPark } from "./format";
import { tKey } from "./i18n/store";

interface CaliState {
  users: User[];
  observations: Observation[];
  currentUserId: string | null;
  offlineQueue: Observation[];
  syncing: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  settings: AppSettings;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  flushOfflineQueue: () => Promise<{ ok: boolean; uploaded: number; error?: string }>;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: "rezident" | "turist";
    isAdult: boolean;
  }) => { ok: boolean; error?: string };
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
  }) => { ok: boolean; error?: string };
  nextCode: (module: Observation["module"]) => string;
  currentUser: () => User | null;
  pendingCount: () => number;
}

const seedUsers: User[] = [
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

      currentUser: () => {
        const { users, currentUserId } = get();
        return users.find((u) => u.id === currentUserId) ?? null;
      },

      pendingCount: () =>
        get().observations.filter((o) => o.status === "in_asteptare").length,

      login: (email, password) => {
        const user = get().users.find(
          (u) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            u.password === password
        );
        if (!user) return { ok: false, error: tKey("error.invalidLogin") };
        if (user.status !== "activ")
          return {
            ok: false,
            error: tKey("error.inactiveAccount"),
          };
        set({
          users: get().users.map((u) =>
            u.id === user.id
              ? { ...u, lastLoginAt: new Date().toISOString() }
              : u
          ),
          currentUserId: user.id,
        });
        return { ok: true };
      },

      logout: () => set({ currentUserId: null }),

      register: ({ name, email, password, role, isAdult }) => {
        if (!isAdult)
          return {
            ok: false,
            error: tKey("error.mustBeAdult"),
          };
        if (get().users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
          return { ok: false, error: tKey("error.emailExists") };
        const user: User = {
          id: `u-${crypto.randomUUID().slice(0, 8)}`,
          email,
          name,
          role,
          status: "activ",
          password,
          isAdult,
          registeredAt: new Date().toISOString(),
        };
        set({ users: [...get().users, user], currentUserId: user.id });
        return { ok: true };
      },

      acceptGdpr: () => {
        const id = get().currentUserId;
        if (!id) return;
        set({
          users: get().users.map((u) =>
            u.id === id
              ? {
                  ...u,
                  gdprAcceptedAt: new Date().toISOString(),
                  gdprVersion: GDPR_VERSION,
                }
              : u
          ),
        });
      },

      nextCode: (module) => {
        const count =
          get().observations.filter((o) => o.module === module).length + 1;
        return generateCode(module, count);
      },

      addObservation: (obs) => {
        const pending: Observation = {
          ...obs,
          syncStatus: "pending",
          syncError: undefined,
        };
        set({
          observations: [pending, ...get().observations],
          offlineQueue: [
            pending,
            ...get().offlineQueue.filter((o) => o.id !== pending.id),
          ],
        });
        // Best-effort immediate upload when online
        if (typeof navigator !== "undefined" && navigator.onLine) {
          void get().flushOfflineQueue();
        }
      },

      flushOfflineQueue: async () => {
        const queue = get().offlineQueue;
        if (!queue.length) {
          return { ok: true, uploaded: 0 };
        }
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return { ok: false, uploaded: 0, error: "offline" };
        }
        if (get().syncing) {
          return { ok: false, uploaded: 0, error: "busy" };
        }

        set({ syncing: true, lastSyncError: null });
        try {
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              observations: queue,
              uploadedAt: new Date().toISOString(),
            }),
          });
          if (!res.ok) {
            const msg = `HTTP ${res.status}`;
            set({
              syncing: false,
              lastSyncError: msg,
              observations: get().observations.map((o) =>
                queue.some((q) => q.id === o.id)
                  ? { ...o, syncStatus: "error", syncError: msg }
                  : o
              ),
              offlineQueue: get().offlineQueue.map((o) => ({
                ...o,
                syncStatus: "error" as const,
                syncError: msg,
              })),
            });
            return { ok: false, uploaded: 0, error: msg };
          }

          const syncedAt = new Date().toISOString();
          const ids = new Set(queue.map((o) => o.id));
          set({
            syncing: false,
            lastSyncAt: syncedAt,
            lastSyncError: null,
            offlineQueue: get().offlineQueue.filter((o) => !ids.has(o.id)),
            observations: get().observations.map((o) =>
              ids.has(o.id)
                ? {
                    ...o,
                    syncStatus: "synced",
                    syncedAt,
                    syncError: undefined,
                  }
                : o
            ),
          });
          return { ok: true, uploaded: queue.length };
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "network";
          set({
            syncing: false,
            lastSyncError: msg,
            observations: get().observations.map((o) =>
              queue.some((q) => q.id === o.id)
                ? { ...o, syncStatus: "error", syncError: msg }
                : o
            ),
          });
          return { ok: false, uploaded: 0, error: msg };
        }
      },

      updateObservation: (id, patch) =>
        set({
          observations: get().observations.map((o) =>
            o.id === id ? ({ ...o, ...patch } as Observation) : o
          ),
        }),

      deleteObservation: (id) =>
        set({
          observations: get().observations.filter((o) => o.id !== id),
        }),

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
        set({
          observations: get().observations.map((o) =>
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
                }
              : o
          ),
        });
        return { ok: true };
      },

      createUser: ({ name, email, role, parentalConsent }) => {
        if (get().users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
          return { ok: false, error: tKey("error.emailUsed") };
        if (role === "elev" && !parentalConsent)
          return {
            ok: false,
            error: tKey("error.parental"),
          };
        const user: User = {
          id: `u-${crypto.randomUUID().slice(0, 8)}`,
          email,
          name,
          role,
          status: "inactiv",
          password: "Temp1234!",
          isAdult: role !== "elev",
          parentalConsent: role === "elev" ? true : undefined,
          registeredAt: new Date().toISOString(),
        };
        set({ users: [...get().users, user] });
        return { ok: true };
      },
    }),
    {
      name: "cali-app-v1",
      skipHydration: true,
      partialize: (s) => ({
        users: s.users,
        observations: s.observations,
        currentUserId: s.currentUserId,
        offlineQueue: s.offlineQueue,
        lastSyncAt: s.lastSyncAt,
        settings: s.settings,
      }),
    }
  )
);
