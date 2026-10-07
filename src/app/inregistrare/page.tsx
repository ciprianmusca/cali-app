"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { useCaliStore } from "@/lib/store";
import { isValidPassword } from "@/lib/format";
import { useI18n } from "@/lib/i18n/use-i18n";
import { GDPR_VERSION } from "@/lib/constants";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const register = useCaliStore((s) => s.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState<"turist" | "rezident">("turist");
  const [isAdult, setIsAdult] = useState(false);
  const [gdprOk, setGdprOk] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    mailSent?: boolean;
  } | null>(null);

  const onToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError(t("error.passwordMismatch"));
      return;
    }
    if (!isValidPassword(password)) {
      setError(t("error.passwordRules"));
      return;
    }
    if (!turnstileToken) {
      setError(t("error.captcha"));
      return;
    }
    if (!isAdult) {
      setError(t("error.confirmAdult"));
      return;
    }
    if (!gdprOk) {
      setError(t("error.gdprRequired"));
      return;
    }
    const res = await register({
      name,
      email,
      password,
      role,
      isAdult,
      gdprAccepted: gdprOk,
      gdprVersion: GDPR_VERSION,
      turnstileToken,
    });
    if (!res.ok) {
      setError(res.error ?? t("obs.error"));
      return;
    }
    if (res.loggedIn) {
      router.replace("/acasa");
      return;
    }
    setDone({
      mailSent: res.mailSent,
    });
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl text-forest">
          {t("auth.registerTitle")}
        </h1>
        <p className="mt-4 text-sm text-forest">{t("auth.activateSent")}</p>
        <p className="mt-6 text-sm">
          <Link href="/autentificare" className="text-primary underline">
            {t("nav.login")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">
        {t("auth.registerTitle")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.registerSub")}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("auth.name")}</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("auth.requestedRole")}</Label>
          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as "turist" | "rezident")}
            className="gap-2"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="turist" />
              {t("auth.roleTourist")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="rezident" />
              {t("auth.roleResident")}
            </label>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password2">{t("auth.passwordConfirm")}</Label>
          <Input
            id="password2"
            type="password"
            required
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("auth.turnstile")}</Label>
          <TurnstileWidget onToken={onToken} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={isAdult}
            onCheckedChange={(v) => setIsAdult(v === true)}
          />
          {t("auth.adult")}
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={gdprOk}
            onCheckedChange={(v) => setGdprOk(v === true)}
          />
          <span>
            {t("auth.gdprCheck")}{" "}
            <Link href="/politica-date" className="text-primary underline">
              {t("auth.gdprPolicy")}
            </Link>{" "}
            ({GDPR_VERSION})
          </span>
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">
          {t("auth.submitRegister")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        {t("auth.hasAccount")}{" "}
        <Link
          href="/autentificare"
          className="text-primary underline-offset-2 hover:underline"
        >
          {t("auth.loginTitle")}
        </Link>
      </p>
    </div>
  );
}
