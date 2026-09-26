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
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { UserRole, UserStatus } from "@/lib/types";

function UsersAdmin() {
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

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const res = createUser({
      name,
      email,
      role,
      parentalConsent: role === "elev" ? parental : undefined,
    });
    if (!res.ok) {
      setMsg(res.error ?? "Eroare");
      return;
    }
    setMsg("Utilizator creat (inactiv). Link resetare parolă simulat.");
    setShowForm(false);
    setName("");
    setEmail("");
    setParental(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-forest">
          Gestiune utilizatori
        </h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Închide" : "Creează utilizator"}
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={onCreate}
          className="mt-6 space-y-4 rounded-lg border bg-card/80 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nume și prenume</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              className="grid gap-2 sm:grid-cols-3"
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={r} />
                  {ROLE_LABELS[r]}
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
              Acord parental atașat (PDF) — obligatoriu
            </label>
          ) : null}
          <Button type="submit">Salvare</Button>
        </form>
      ) : null}

      {msg ? <p className="mt-4 text-sm text-emerald-800">{msg}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Rol</Label>
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
              <SelectItem value="all">Toate</SelectItem>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Stare</Label>
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
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="activ">Activ</SelectItem>
              <SelectItem value="inactiv">Inactiv</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-card/80">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Nume</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Înregistrare</th>
              <th className="px-3 py-2">Ultima logare</th>
              <th className="px-3 py-2">GDPR</th>
              <th className="px-3 py-2">Stare</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{ROLE_LABELS[u.role]}</td>
                <td className="px-3 py-2">{formatDateTime(u.registeredAt)}</td>
                <td className="px-3 py-2">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}
                </td>
                <td className="px-3 py-2">
                  {u.gdprAcceptedAt ? formatDateTime(u.gdprAcceptedAt) : "—"}
                </td>
                <td className="px-3 py-2 capitalize">{u.status}</td>
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
