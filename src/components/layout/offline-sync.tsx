"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CloudOff, CloudUpload, Loader2, RefreshCw, Wifi } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCaliStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures in unsupported contexts */
    });
  }, []);
  return null;
}

export function OfflineSyncBar() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const offlineQueue = useCaliStore((s) => s.offlineQueue);
  const syncing = useCaliStore((s) => s.syncing);
  const lastSyncError = useCaliStore((s) => s.lastSyncError);
  const flushOfflineQueue = useCaliStore((s) => s.flushOfflineQueue);
  const hydrated = useCaliStore((s) => s.hydrated);
  const currentUserId = useCaliStore((s) => s.currentUserId);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !online) return;
    if (offlineQueue.length === 0) return;
    if (!currentUserId) return;
    if (
      lastSyncError === "session_expired" ||
      lastSyncError === "unauthorized"
    ) {
      return;
    }
    void flushOfflineQueue();
  }, [
    hydrated,
    online,
    offlineQueue.length,
    flushOfflineQueue,
    currentUserId,
    lastSyncError,
  ]);

  // Safety valve: never leave the banner spinning forever.
  useEffect(() => {
    if (!syncing) return;
    const t = window.setTimeout(() => {
      useCaliStore.setState({ syncing: false, lastSyncError: "timeout" });
    }, 35000);
    return () => window.clearTimeout(t);
  }, [syncing]);

  // SEC-10: expired session → login (preserve offline queue in store).
  useEffect(() => {
    if (!hydrated) return;
    if (lastSyncError !== "session_expired" && lastSyncError !== "unauthorized") {
      return;
    }
    if (currentUserId) return;
    if (pathname.startsWith("/autentificare")) return;
    router.replace(
      `/autentificare?next=${encodeURIComponent(pathname || "/acasa")}`
    );
  }, [hydrated, lastSyncError, currentUserId, pathname, router]);

  if (!hydrated) return null;

  const pending = offlineQueue.length;
  const authError =
    lastSyncError === "session_expired" || lastSyncError === "unauthorized";
  const show =
    !online || pending > 0 || syncing || Boolean(lastSyncError);

  if (!show) return null;

  const loginHref = `/autentificare?next=${encodeURIComponent(pathname || "/acasa")}`;

  return (
    <div
      className={cn(
        "border-b px-4 py-2 text-sm",
        !online
          ? "border-amber-800/20 bg-amber-50 text-amber-950"
          : lastSyncError
            ? "border-red-800/20 bg-red-50 text-red-900"
            : "border-sky-800/20 bg-sky-50 text-sky-950"
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        {!online ? (
          <>
            <CloudOff className="size-4 shrink-0" />
            <span className="flex-1">{t("offline.banner")}</span>
          </>
        ) : syncing ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" />
            <span className="flex-1">{t("offline.syncing")}</span>
          </>
        ) : authError ? (
          <>
            <CloudUpload className="size-4 shrink-0" />
            <span className="flex-1">{t("offline.sessionExpired")}</span>
            <Link
              href={loginHref}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              {t("nav.login")}
            </Link>
          </>
        ) : lastSyncError ? (
          <>
            <CloudUpload className="size-4 shrink-0" />
            <span className="flex-1">{t("offline.syncError")}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void flushOfflineQueue()}
            >
              <RefreshCw className="size-3.5" />
              {t("offline.syncNow")}
            </Button>
          </>
        ) : (
          <>
            <Wifi className="size-4 shrink-0" />
            <span className="flex-1">
              {t("offline.pending", { count: pending })}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void flushOfflineQueue()}
            >
              <CloudUpload className="size-3.5" />
              {t("offline.syncNow")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
