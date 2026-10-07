"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { PublicUser } from "@/lib/types";

function ActivateInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!token) {
      setError(t("auth.activateInvalid"));
      setBusy(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/activate", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          user?: PublicUser;
        };
        if (!res.ok || !data.ok || !data.user) {
          if (!cancelled) setError(t("auth.activateInvalid"));
          return;
        }
        useCaliStore.setState((s) => ({
          currentUserId: data.user!.id,
          lastSessionUserId: data.user!.id,
          users: [
            data.user!,
            ...s.users.filter((u) => u.id !== data.user!.id),
          ],
        }));
        void useCaliStore.getState().pullFromServer();
        if (!cancelled) router.replace("/acasa");
      } catch {
        if (!cancelled) setError(t("auth.activateInvalid"));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router, t]);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-forest">
        {t("auth.activateTitle")}
      </h1>
      {busy ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("auth.activateWorking")}
        </p>
      ) : error ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="text-destructive">{error}</p>
          <p>
            <Link href="/autentificare" className="text-primary underline">
              {t("nav.login")}
            </Link>
            {" · "}
            <Link href="/inregistrare" className="text-primary underline">
              {t("nav.register")}
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          {t("auth.loading")}
        </p>
      )}
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateInner />
    </Suspense>
  );
}
