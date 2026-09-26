"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  LogOut,
  Map,
  List,
  ShieldCheck,
  Settings,
  Home,
  BarChart3,
  UserRound,
  GraduationCap,
  Info,
  BookOpen,
  HelpCircle,
  Mail,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import { roleKey } from "@/lib/i18n/labels";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const hydrated = useCaliStore((s) => s.hydrated);
  const currentUserId = useCaliStore((s) => s.currentUserId);
  const users = useCaliStore((s) => s.users);
  const observations = useCaliStore((s) => s.observations);
  const logout = useCaliStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const user = users.find((u) => u.id === currentUserId) ?? null;
  const pending = observations.filter((o) => o.status === "in_asteptare").length;

  const guestInfoLinks = [
    { href: "/despre", label: t("nav.about"), icon: Info },
    { href: "/ghid", label: t("nav.guide"), icon: BookOpen },
    { href: "/intrebari-frecvente", label: t("nav.faq"), icon: HelpCircle },
    { href: "/contact", label: t("nav.contact"), icon: Mail },
  ];

  const authLinks = user
    ? [
        { href: "/acasa", label: t("nav.home"), icon: Home },
        { href: "/observatii", label: t("nav.observations"), icon: List },
        { href: "/harta", label: t("nav.map"), icon: Map },
        { href: "/scoli", label: t("nav.schools"), icon: GraduationCap },
        ...(user.role === "ranger" || user.role === "admin"
          ? [
              {
                href: "/validare",
                label: t("nav.validation"),
                icon: ShieldCheck,
                badge: pending,
              },
            ]
          : []),
        ...(user.role === "admin"
          ? [{ href: "/admin", label: t("nav.admin"), icon: Settings }]
          : []),
        { href: "/profil", label: t("nav.profile"), icon: UserRound },
      ]
    : [
        { href: "/", label: t("nav.stats"), icon: BarChart3 },
        { href: "/harta", label: t("nav.map"), icon: Map },
        ...guestInfoLinks,
      ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // UI-11: solid sticky header after scroll on mobile
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("flex gap-1", mobile ? "flex-col" : "items-center")}>
      {authLinks.map((link) => {
        const Icon = link.icon;
        const active =
          pathname === link.href ||
          (link.href !== "/" && pathname.startsWith(link.href + "/"));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {link.label}
            {"badge" in link && typeof link.badge === "number" && link.badge > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                {link.badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,box-shadow,backdrop-filter]",
        scrolled
          ? "border-border bg-background shadow-sm"
          : "border-border/60 bg-background/90 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href={user ? "/acasa" : "/"}
          className="flex shrink-0 items-center gap-2 font-display text-lg tracking-tight"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/cali-lab.svg"
            alt="CALI-LAB"
            className="h-8 w-auto max-w-[9.5rem] rounded-sm object-contain sm:max-w-[11rem]"
          />
          <span className="sr-only">CALI-LAB</span>
        </Link>

        <div className="hidden lg:block">{hydrated ? <NavLinks /> : null}</div>

        <div className="flex items-center gap-2">
          {/* DES-09: language always visible in header (not only mobile menu) */}
          <LanguageSwitcher className="inline-flex" />

          {hydrated && user ? (
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right text-xs leading-tight">
                <div className="font-medium">{user.name}</div>
                <div className="text-muted-foreground">
                  {t(roleKey(user.role))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void logout()}
                aria-label={t("nav.logout")}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : hydrated ? (
            <div className="hidden gap-2 sm:flex">
              <Link
                href="/autentificare"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                {t("nav.login")}
              </Link>
              <Link href="/inregistrare" className={cn(buttonVariants())}>
                {t("nav.register")}
              </Link>
            </div>
          ) : null}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="lg:hidden" />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{t("nav.menu")}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 px-2">
                <LanguageSwitcher />
                <NavLinks mobile />
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void logout()}
                  >
                    <LogOut className="mr-2 size-4" /> {t("nav.logout")}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/autentificare"
                      className={cn(buttonVariants(), "justify-center")}
                    >
                      {t("nav.login")}
                    </Link>
                    <Link
                      href="/inregistrare"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "justify-center"
                      )}
                    >
                      {t("nav.register")}
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
