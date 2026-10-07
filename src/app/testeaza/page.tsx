"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { DEMO_SANDBOX_ACCOUNTS } from "@/lib/constants";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import { roleKey } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

/**
 * Public sandbox entry: shows non-admin demo credentials.
 * Data created after login is tagged isDemo and never enters the official lane.
 */
export default function TesteazaPage() {
  const { t } = useI18n();
  const router = useRouter();
  const login = useCaliStore((s) => s.login);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyCreds = async (email: string, password: string) => {
    try {
      await navigator.clipboard.writeText(`${email} / ${password}`);
      setCopied(email);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const enterAs = async (email: string, password: string) => {
    setBusyEmail(email);
    setError(null);
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setError(res.error ?? t("obs.error"));
        return;
      }
      router.push("/acasa");
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-2 hover:underline">
          {t("nav.stats")}
        </Link>
        {" · "}
        {t("nav.tryApp")}
      </p>
      <h1 className="mt-2 font-display text-3xl text-forest">
        {t("demo.title")}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{t("demo.sub")}</p>
      <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
        {t("demo.isolation")}
      </p>

      <div className="mt-8 divide-y rounded-lg border bg-card/80">
        {DEMO_SANDBOX_ACCOUNTS.map((a) => (
          <div
            key={a.email}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-forest">{t(roleKey(a.role))}</p>
              <p className="mt-0.5 font-mono text-sm break-all">
                {a.email} / {a.password}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void copyCreds(a.email, a.password)}
              >
                {copied === a.email ? t("demo.copied") : t("demo.copy")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busyEmail === a.email}
                onClick={() => void enterAs(a.email, a.password)}
              >
                {busyEmail === a.email
                  ? t("auth.loading")
                  : t("demo.enter")}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : null}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("demo.officialHint")}{" "}
        <Link
          href="/inregistrare"
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-auto p-0 text-primary"
          )}
        >
          {t("nav.register")}
        </Link>
      </p>
    </div>
  );
}
