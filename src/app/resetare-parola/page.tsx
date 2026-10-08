"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { useI18n } from "@/lib/i18n/use-i18n";

function ResetRequestInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const legacyToken = params.get("token");

  useEffect(() => {
    if (legacyToken) {
      router.replace(
        `/resetare-parola/confirmare?token=${encodeURIComponent(legacyToken)}`
      );
    }
  }, [legacyToken, router]);

  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  const requestLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (!turnstileToken) {
      setError(t("error.captcha"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "captcha") {
          setError(t("error.captcha"));
          return;
        }
        setError(t("obs.error"));
        return;
      }
      setMsg(t("auth.resetSent"));
    } finally {
      setBusy(false);
    }
  };

  if (legacyToken) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
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
        <TurnstileWidget onToken={onToken} />
        {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {t("auth.resetSend")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/autentificare" className="text-primary underline">
          {t("nav.login")}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordRequestPage() {
  return (
    <Suspense>
      <ResetRequestInner />
    </Suspense>
  );
}
