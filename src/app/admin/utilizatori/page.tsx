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
import { useCaliStore } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import type { UserRole, UserStatus } from "@/lib/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import { roleKey } from "@/lib/i18n/labels";

const ALL_ROLES: UserRole[] = ["admin", "ranger", "rezident", "turist", "elev"];

function UsersAdmin() {
  const { t } = useI18n();
  const users = useCaliStore((s) => s.users);
  const createUser = useCaliStore((s) => s.createUser);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("elev");
  const [parental, setParental] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (roleFilter !== "all" && u.role !== roleFilter) return false;
        if (statusFilter !== "all" && u.status !== statusFilter) return false;
        return true;
      }),
    [users, roleFilter, statusFilter]
  );

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const res = await createUser({
      name,
      email,
      role,
      parentalConsent: role === "elev" ? parental : undefined,
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
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-forest">
          {t("admin.usersTitle")}
        </h1>
        <Button onClick={() => setShowForm((v) => !v)}>
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
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
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
              {ALL_ROLES.map((r) => (
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
          <Button type="submit">{t("admin.save")}</Button>
        </form>
      ) : null}

      {msg ? <p className="mt-4 text-sm text-emerald-800">{msg}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
              {ALL_ROLES.map((r) => (
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

      <div className="mt-6 overflow-x-auto rounded-lg border bg-card/80">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("admin.email")}</th>
              <th className="px-3 py-2">{t("admin.name")}</th>
              <th className="px-3 py-2">{t("admin.role")}</th>
              <th className="px-3 py-2">{t("admin.registered")}</th>
              <th className="px-3 py-2">{t("admin.lastLogin")}</th>
              <th className="px-3 py-2">{t("admin.gdpr")}</th>
              <th className="px-3 py-2">{t("admin.status")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{t(roleKey(u.role))}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGate roles={["admin"]}>
      <UsersAdmin />
    </AuthGate>
  );
}
