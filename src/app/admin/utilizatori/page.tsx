"use client";

import { FormEvent, useMemo, useState } from "react";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canManageRegistrations } from "@/lib/capabilities";
import { useCaliStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import type { PublicUser, UserRole, UserStatus } from "@/lib/types";
import { ALL_USER_ROLES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";
import { roleKey } from "@/lib/i18n/labels";

function UsersAdmin() {
  const { t } = useI18n();
  const me = useCaliStore((s) => s.currentUser());
  const users = useCaliStore((s) => s.users);
  const createUser = useCaliStore((s) => s.createUser);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("elev");
  const [parental, setParental] = useState(false);
  const [canManageRegs, setCanManageRegs] = useState(false);
  const [canTeach, setCanTeach] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = me?.role === "admin";
  const creatableRoles = useMemo(
    () =>
      isAdmin ? ALL_USER_ROLES : ALL_USER_ROLES.filter((r) => r !== "admin"),
    [isAdmin]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (
        q &&
        !u.name.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const refreshUsers = async () => {
    const res = await fetch("/api/users", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { users?: PublicUser[] };
    if (data.users) {
      useCaliStore.setState({ users: data.users });
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const rangerFlags =
      role === "ranger"
        ? {
            canManageRegistrations: canManageRegs,
            canTeachSchool: canTeach,
          }
        : {
            canManageRegistrations: false,
            canTeachSchool: false,
          };
    if (editing) {
      setBusyId(editing.id);
      try {
        const res = await fetch(`/api/users/${editing.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            role,
            parentalConsent: role === "elev" ? parental : undefined,
            ...rangerFlags,
          }),
        });
        if (!res.ok) {
          setMsg(t("obs.error"));
          return;
        }
        await refreshUsers();
        setMsg(t("admin.save"));
        setEditing(null);
        setShowForm(false);
      } finally {
        setBusyId(null);
      }
      return;
    }
    const res = await createUser({
      name,
      email,
      role,
      parentalConsent: role === "elev" ? parental : undefined,
      ...rangerFlags,
    });
    if (!res.ok) {
      setMsg(res.error ?? t("obs.error"));
      return;
    }
    setMsg(t("admin.userCreated"));
    setShowForm(false);
    setName("");
    setEmail("");
    setParental(false);
    setCanManageRegs(false);
    setCanTeach(false);
    await refreshUsers();
  };

  const startEdit = (u: PublicUser) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setParental(Boolean(u.parentalConsent));
    setCanManageRegs(Boolean(u.canManageRegistrations));
    setCanTeach(Boolean(u.canTeachSchool));
    setShowForm(true);
  };

  const patchAction = async (
    id: string,
    action: "suspend" | "reactivate" | "reset_password"
  ) => {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demoResetUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setMsg(t("obs.error"));
        return;
      }
      if (action === "reset_password" && data.demoResetUrl) {
        setMsg(`${t("auth.resetDemoLink")} ${data.demoResetUrl}`);
      } else {
        setMsg(t("admin.save"));
      }
      await refreshUsers();
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u: PublicUser) => {
    if (!confirm(t("admin.deleteConfirm"))) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setMsg(t("obs.error"));
        return;
      }
      await refreshUsers();
      setMsg(t("admin.deleteUser"));
    } finally {
      setBusyId(null);
    }
  };

  const UserActions = ({ u }: { u: PublicUser }) => {
    const lockedAdmin = u.role === "admin" && !isAdmin;
    return (
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={busyId === u.id || lockedAdmin}
          onClick={() => startEdit(u)}
        >
          {t("admin.edit")}
        </Button>
        {u.status === "activ" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === u.id || lockedAdmin}
            onClick={() => void patchAction(u.id, "suspend")}
          >
            {t("admin.suspend")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === u.id || lockedAdmin}
            onClick={() => void patchAction(u.id, "reactivate")}
          >
            {t("admin.reactivate")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busyId === u.id || lockedAdmin}
          onClick={() => void patchAction(u.id, "reset_password")}
        >
          {t("admin.resetPw")}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={busyId === u.id || lockedAdmin}
          onClick={() => void deleteUser(u)}
        >
          {t("admin.deleteUser")}
        </Button>
      </div>
    );
  };

  const RangerCaps = ({ u }: { u: PublicUser }) => {
    if (u.role !== "ranger") return null;
    const bits: string[] = [];
    if (u.canManageRegistrations) bits.push(t("admin.capRegsShort"));
    if (u.canTeachSchool) bits.push(t("admin.capSchoolShort"));
    if (!bits.length) return <span className="text-muted-foreground">—</span>;
    return <span className="text-xs">{bits.join(" · ")}</span>;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-forest">
          {t("admin.usersTitle")}
        </h1>
        <Button
          onClick={() => {
            setEditing(null);
            setName("");
            setEmail("");
            setCanManageRegs(false);
            setCanTeach(false);
            setShowForm((v) => !v);
          }}
        >
          {showForm ? t("admin.close") : t("admin.createUser")}
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={onCreate}
          className="mt-6 space-y-4 rounded-lg border bg-card/80 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("auth.name")}</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("auth.email")}</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("admin.role")}</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              className="grid gap-2 sm:grid-cols-3"
            >
              {creatableRoles.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={r} />
                  {t(roleKey(r))}
                </label>
              ))}
            </RadioGroup>
          </div>
          {role === "elev" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={parental}
                onChange={(e) => setParental(e.target.checked)}
              />
              {t("admin.parentalPdf")}
            </label>
          ) : null}
          {role === "ranger" ? (
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <p className="text-sm font-medium">{t("admin.rangerCaps")}</p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={canManageRegs}
                  onChange={(e) => setCanManageRegs(e.target.checked)}
                />
                <span>
                  <span className="font-medium">{t("admin.capRegs")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t("admin.capRegsHint")}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={canTeach}
                  onChange={(e) => setCanTeach(e.target.checked)}
                />
                <span>
                  <span className="font-medium">{t("admin.capSchool")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t("admin.capSchoolHint")}
                  </span>
                </span>
              </label>
            </div>
          ) : null}
          <Button type="submit">{t("admin.save")}</Button>
        </form>
      ) : null}

      {msg ? (
        <p className="mt-4 break-all text-sm text-emerald-800">{msg}</p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <Label>{t("admin.search")}</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.search")}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("admin.role")}</Label>
          <Select
            value={roleFilter}
            onValueChange={(v) =>
              setRoleFilter((v ?? "all") as typeof roleFilter)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("obs.all")}</SelectItem>
              {ALL_USER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(roleKey(r))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("admin.status")}</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter((v ?? "all") as typeof statusFilter)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("obs.all")}</SelectItem>
              <SelectItem value="activ">{t("admin.active")}</SelectItem>
              <SelectItem value="inactiv">{t("admin.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border bg-card/80 md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("admin.email")}</th>
              <th className="px-3 py-2">{t("admin.name")}</th>
              <th className="px-3 py-2">{t("admin.role")}</th>
              <th className="px-3 py-2">{t("admin.rangerCaps")}</th>
              <th className="px-3 py-2">{t("admin.registered")}</th>
              <th className="px-3 py-2">{t("admin.lastLogin")}</th>
              <th className="px-3 py-2">{t("admin.gdpr")}</th>
              <th className="px-3 py-2">{t("admin.status")}</th>
              <th className="px-3 py-2">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{t(roleKey(u.role))}</td>
                <td className="px-3 py-2">
                  <RangerCaps u={u} />
                </td>
                <td className="px-3 py-2">{formatDateTime(u.registeredAt)}</td>
                <td className="px-3 py-2">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}
                </td>
                <td className="px-3 py-2">
                  {u.gdprAcceptedAt ? formatDateTime(u.gdprAcceptedAt) : "—"}
                </td>
                <td className="px-3 py-2">
                  {u.status === "activ" ? t("admin.active") : t("admin.inactive")}
                </td>
                <td className="px-3 py-2">
                  <UserActions u={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (UI-10) */}
      <div className="mt-6 space-y-3 md:hidden">
        {filtered.map((u) => (
          <div key={u.id} className="rounded-lg border bg-card/80 p-4 text-sm">
            <div className="font-medium">{u.name}</div>
            <div className="text-muted-foreground">{u.email}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span>{t(roleKey(u.role))}</span>
              <span>·</span>
              <span>
                {u.status === "activ" ? t("admin.active") : t("admin.inactive")}
              </span>
            </div>
            {u.role === "ranger" ? (
              <div className="mt-1 text-xs text-muted-foreground">
                <RangerCaps u={u} />
              </div>
            ) : null}
            <div className="mt-1 text-xs text-muted-foreground">
              {t("admin.registered")}: {formatDateTime(u.registeredAt)}
            </div>
            <div className="mt-3">
              <UserActions u={u} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGate allow={canManageRegistrations}>
      <UsersAdmin />
    </AuthGate>
  );
}
