"use client";

import { useEffect, useRef } from "react";
import { TURNSTILE_TEST_SITE_KEY } from "@/lib/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

type Props = {
  onToken: (token: string | null) => void;
  siteKey?: string;
};

export function TurnstileWidget({ onToken, siteKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const key = siteKey || TURNSTILE_TEST_SITE_KEY;

  useEffect(() => {
    let cancelled = false;

    const mount = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      if (widgetId.current) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: key,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
        theme: "light",
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cali-turnstile="1"]'
    );
    if (window.turnstile) {
      mount();
    } else if (existing) {
      existing.addEventListener("load", mount);
    } else {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.caliTurnstile = "1";
      script.addEventListener("load", mount);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [key, onToken]);

  return <div ref={ref} className="min-h-[65px]" />;
}
