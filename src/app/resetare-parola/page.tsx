"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidPassword } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [mailOk, setMailOk] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const requestLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setMailOk(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      setError(t("obs.error"));
      return;
    }
    const data = (await res.json()) as {
      mailSent?: boolean;
    };
    // Link goes only by email — never render tokens in the page.
    const sent = data.mailSent !== false;
    setMailOk(sent);
    setMsg(sent ? t("auth.resetSent") : t("auth.resetMailFailed"));
  };

  const setNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
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

  if (token) {
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full">
              {t("auth.resetSubmit")}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">{t("auth.resetTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.resetSub")}</p>
      <form onSubmit={requestLink} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label>{t("auth.email")}</Label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {msg ? (
          <p
            className={
              mailOk
                ? "text-sm text-emerald-800"
                : "text-sm text-amber-800 dark:text-amber-200"
            }
          >
            {msg}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">
          {t("auth.resetSend")}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
