"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Leaf,
  TreePine,
  Mountain,
  List,
  ShieldCheck,
  Map,
  Users,
} from "lucide-react";
import { AuthGate } from "@/components/layout/auth-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCaliStore } from "@/lib/store";
import { GDPR_VERSION } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";
import { moduleKey } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

function GdprGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const acceptGdpr = useCaliStore((s) => s.acceptGdpr);
  const logout = useCaliStore((s) => s.logout);
  const [accepted, setAccepted] = useState(false);

  if (user?.gdprAcceptedAt) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl text-forest">{t("gdpr.title")}</h1>
      <div className="mt-6 space-y-4 rounded-lg border bg-card/80 p-5 text-sm leading-relaxed">
        <p>{t("gdpr.p1")}</p>
        <p>{t("gdpr.p2")}</p>
        <p>
          {t("gdpr.version")} <strong>{GDPR_VERSION}</strong>
        </p>
        <Link href="/politica-date" className="text-primary underline">
          {t("gdpr.readPolicy")}
        </Link>
      </div>
      <label className="mt-6 flex items-start gap-2 text-sm">
        <Checkbox
          checked={accepted}
          onCheckedChange={(v) => setAccepted(v === true)}
        />
        {t("gdpr.accept")}
      </label>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          disabled={!accepted}
          onClick={() => {
            acceptGdpr();
          }}
        >
          {t("gdpr.continue")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void logout().then(() => {
              window.location.href = "/";
            });
          }}
        >
          {t("gdpr.decline")}
        </Button>
      </div>
    </div>
  );
}

function HomeContent() {
  const { t } = useI18n();
  const user = useCaliStore((s) => s.currentUser());
  const observations = useCaliStore((s) => s.observations);
  const users = useCaliStore((s) => s.users);
  const pending = observations.filter((o) => o.status === "in_asteptare").length;
  const myObs = observations.filter((o) => o.authorId === user?.id);
  const newUsers = users.filter(
    (u) =>
      Date.now() - new Date(u.registeredAt).getTime() < 30 * 86400000
  ).length;

  const modules = [
    {
      href: "/observatii/nou/fenologie",
      title: t(moduleKey("fenologie")),
      desc: t("home.modPhenDesc"),
      icon: Leaf,
      color: "bg-emerald-800",
    },
    {
      href: "/observatii/nou/perturbari",
      title: t(moduleKey("perturbari")),
      desc: t("home.modDistDesc"),
      icon: TreePine,
      color: "bg-orange-900",
    },
    {
      href: "/observatii/nou/sol",
      title: t(moduleKey("sol")),
      desc: t("home.modSoilDesc"),
      icon: Mountain,
      color: "bg-stone-700",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="animate-rise">
        <p className="text-sm text-muted-foreground">{t("home.welcome")}</p>
        <h1 className="font-display text-3xl text-forest sm:text-4xl">
          {user?.name}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{t("home.sub")}</p>
      </div>

      {(user?.role === "ranger" || user?.role === "admin") && (
        <div className="animate-rise-delay-1 mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            href="/validare"
            className="rounded-lg border border-amber-800/20 bg-amber-50 px-4 py-4"
          >
            <div className="flex items-center gap-2 text-amber-950">
              <ShieldCheck className="size-4" />
              {t("home.toValidate")}
            </div>
            <div className="mt-2 font-display text-3xl text-amber-950">
              {pending}
            </div>
          </Link>
          {user.role === "admin" ? (
            <>
              <Link
                href="/admin/utilizatori"
                className="rounded-lg border bg-card/80 px-4 py-4"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4" />
                  {t("home.newUsers")}
                </div>
                <div className="mt-2 font-display text-3xl text-forest">
                  {newUsers}
                </div>
              </Link>
              <div className="rounded-lg border bg-card/80 px-4 py-4">
                <div>{t("home.myObs")}</div>
                <div className="mt-2 font-display text-3xl text-forest">
                  {myObs.length}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-card/80 px-4 py-4 sm:col-span-2">
              <div>{t("home.myObs")}</div>
              <div className="mt-2 font-display text-3xl text-forest">
                {myObs.length}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="animate-rise-delay-2 mt-10 grid gap-4 md:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div
                className={cn(
                  "mb-4 flex size-10 items-center justify-center rounded-md text-white",
                  m.color
                )}
              >
                <Icon className="size-5" />
              </div>
              <h2 className="font-display text-xl">{m.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-primary">
                {t("home.newObs")}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/observatii"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <List className="size-4" />
          {t("home.listObs")}
        </Link>
        <Link
          href="/harta"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Map className="size-4" />
          {t("home.map")}
        </Link>
      </div>
    </div>
  );
}

export default function AcasaPage() {
  return (
    <AuthGate requireGdpr={false}>
      <GdprGate>
        <HomeContent />
      </GdprGate>
    </AuthGate>
  );
}
