"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { PublicUser, UserRole } from "@/lib/types";

export function AuthGate({
  children,
  roles,
  allow,
  requireGdpr = true,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
  /** Extra capability check (e.g. ranger with a flag). */
  allow?: (user: PublicUser) => boolean;
  requireGdpr?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const hydrated = useCaliStore((s) => s.hydrated);
  const currentUserId = useCaliStore((s) => s.currentUserId);
  const users = useCaliStore((s) => s.users);
  const user = users.find((u) => u.id === currentUserId) ?? null;

  const permitted =
    !!user &&
    (!roles || roles.includes(user.role)) &&
    (!allow || allow(user));

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(`/autentificare?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (requireGdpr && !user.gdprAcceptedAt) {
      router.replace("/acasa");
      return;
    }
    if (!permitted) {
      router.replace("/acasa");
    }
  }, [hydrated, user, permitted, requireGdpr, router, pathname]);

  if (!hydrated || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">
        {t("auth.loading")}
      </div>
    );
  }

  if (!permitted) return null;
  if (requireGdpr && !user.gdprAcceptedAt) return null;

  return <>{children}</>;
}
