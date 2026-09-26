"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCaliStore } from "@/lib/store";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";
import { roleKey } from "@/lib/i18n/labels";

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const login = useCaliStore((s) => s.login);
  const [email, setEmail] = useState("turist@cali-lab.ro");
  const [password, setPassword] = useState("Turist123!");
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setError(res.error ?? t("obs.error"));
        return;
      }
      const next = params.get("next") || "/acasa";
      router.push(next);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleLogin();
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">{t("auth.loginTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.loginSub")}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="button"
          className="w-full"
          disabled={busy}
          onClick={() => void handleLogin()}
        >
          {busy ? t("auth.loading") : t("auth.submitLogin")}
        </Button>
      </form>

      <div className="mt-8 rounded-lg border bg-card/70 p-4 text-sm">
        <p className="font-medium">{t("auth.demoAccounts")}</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                className="text-left hover:text-foreground"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
              >
                {t(roleKey(a.role))}: {a.email} / {a.password}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-sm">
        {t("auth.noAccount")}{" "}
        <Link
          href="/inregistrare"
          className="text-primary underline-offset-2 hover:underline"
        >
          {t("nav.register")}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
