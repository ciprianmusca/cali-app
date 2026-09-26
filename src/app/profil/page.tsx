"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCaliStore } from "@/lib/store";
import { isValidPassword } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import { roleKey } from "@/lib/i18n/labels";

function ProfileForm() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useCaliStore((s) => s.currentUser())!;
  const logout = useCaliStore((s) => s.logout);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (!isValidPassword(newPassword)) {
      setError(t("error.passwordRules"));
      return;
    }
    const res = await fetch("/api/profile", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "change_password",
        currentPassword,
        newPassword,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(
        data.error === "bad_password"
          ? t("profile.badPassword")
          : t("obs.error")
      );
      return;
    }
    setMsg(t("profile.passwordChanged"));
    setCurrentPassword("");
    setNewPassword("");
  };

  const downloadData = async () => {
    const res = await fetch("/api/profile", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "export" }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { export?: unknown };
    const blob = new Blob([JSON.stringify(data.export, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cali-date-${user.id}.json`;
    a.click();
  };

  const deleteAccount = async () => {
    if (!confirm(t("profile.deleteConfirm"))) return;
    const res = await fetch("/api/profile", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_account" }),
    });
    if (!res.ok) {
      setError(t("obs.error"));
      return;
    }
    await logout();
    setMsg(t("profile.deleted"));
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display text-3xl text-forest">{t("profile.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {user.name} · {user.email} · {t(roleKey(user.role))}
      </p>

      <form onSubmit={changePassword} className="mt-8 space-y-3 rounded-lg border bg-card/80 p-4">
        <h2 className="font-medium">{t("profile.changePassword")}</h2>
        <div className="space-y-1">
          <Label>{t("profile.currentPassword")}</Label>
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("auth.newPassword")}</Label>
          <Input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
        <Button type="submit">{t("admin.save")}</Button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        <Button variant="outline" onClick={() => void downloadData()}>
          {t("profile.downloadData")}
        </Button>
        <Button variant="destructive" onClick={() => void deleteAccount()}>
          {t("profile.deleteAccount")}
        </Button>
      </div>
    </div>
  );
}

export default function ProfilPage() {
  return (
    <AuthGate>
      <ProfileForm />
    </AuthGate>
  );
}
