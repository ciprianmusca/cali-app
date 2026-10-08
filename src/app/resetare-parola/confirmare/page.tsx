"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidPassword } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";

function ConfirmResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(t("auth.resetInvalid"));
      return;
    }
    if (password !== password2) {
      setError(t("error.passwordMismatch"));
      return;
    }
    if (!isValidPassword(password)) {
      setError(t("error.passwordRules"));
      return;
    }
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) {
      setError(t("auth.resetInvalid"));
      return;
    }
    setDone(true);
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl text-forest">{t("auth.resetTitle")}</h1>
        <p className="mt-6 text-sm text-destructive">{t("auth.resetInvalid")}</p>
        <p className="mt-4 text-sm">
          <Link href="/resetare-parola" className="text-primary underline">
            {t("auth.resetSend")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">{t("auth.resetTitle")}</h1>
      {done ? (
        <p className="mt-6 text-sm">
          {t("auth.resetDone")}{" "}
          <Link href="/autentificare" className="text-primary underline">
            {t("nav.login")}
          </Link>
        </p>
      ) : (
        <form onSubmit={setNewPassword} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label>{t("auth.newPassword")}</Label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("auth.passwordConfirm")}</Label>
            <Input
              type="password"
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            {t("auth.resetSubmit")}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ConfirmResetPage() {
  return (
    <Suspense>
      <ConfirmResetForm />
    </Suspense>
  );
}
