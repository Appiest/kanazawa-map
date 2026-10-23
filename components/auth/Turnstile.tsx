"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, shown only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 * Supabase checks the token itself once captcha protection is switched on in
 * the dashboard, so the secret key never reaches this app.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load")));
    script.onerror = () => reject(new Error("Turnstile did not load"));
    document.head.appendChild(script);
  });
  return loading;
}

/** Calls back with a fresh token, or null when it expires. Changing `round` asks for a new one. */
export function Turnstile({ onToken, round }: { onToken: (token: string | null) => void; round: number }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !container.current) return;
    const element = container.current;
    let widgetId: string | null = null;
    let current = true;

    loadTurnstile().then(
      (turnstile) => {
        if (!current) return;
        widgetId = turnstile.render(element, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      },
      () => onToken(null),
    );

    return () => {
      current = false;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [onToken, round]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={container} className="min-h-16" />;
}
