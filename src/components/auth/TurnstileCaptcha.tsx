import { useEffect, useRef, useState } from "react";

type TurnstileWidgetId = string;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => TurnstileWidgetId;
      remove: (widgetId: TurnstileWidgetId) => void;
    };
  }
}

let turnstileScript: Promise<void> | null = null;
const DEFAULT_TURNSTILE_SITE_KEY = "0x4AAAAAAFZDcuZbH-6YM_-A";

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!turnstileScript) {
    turnstileScript = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');
      const script = existing || document.createElement("script");
      const onLoad = () => window.turnstile ? resolve() : reject(new Error("Turnstile did not initialize"));
      const onError = () => reject(new Error("Turnstile could not be loaded"));
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      if (!existing) {
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "true";
        document.head.appendChild(script);
      }
    }).catch((error) => {
      turnstileScript = null;
      throw error;
    });
  }
  return turnstileScript;
}

interface TurnstileCaptchaProps {
  onToken: (token: string) => void;
  onError?: (message: string) => void;
  resetKey?: number;
}

export function TurnstileCaptcha({ onToken, onError, resetKey = 0 }: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onToken, onError });
  const [loadError, setLoadError] = useState(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || DEFAULT_TURNSTILE_SITE_KEY;
  callbacksRef.current = { onToken, onError };

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let disposed = false;
    let widgetId: TurnstileWidgetId | undefined;
    setLoadError(false);
    callbacksRef.current.onToken("");

    loadTurnstile().then(() => {
      if (disposed || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onToken(token),
        "expired-callback": () => callbacksRef.current.onToken(""),
        "error-callback": () => {
          callbacksRef.current.onToken("");
          setLoadError(true);
          callbacksRef.current.onError?.("Verification failed to load. Please try again.");
          return true;
        },
        theme: "auto",
      });
    }).catch(() => {
      if (!disposed) {
        setLoadError(true);
        callbacksRef.current.onToken("");
        callbacksRef.current.onError?.("Verification could not be loaded. Check your connection and try again.");
      }
    });

    return () => {
      disposed = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, resetKey]);

  if (!siteKey) {
    return <p role="status" className="text-xs text-destructive">Verification is not configured. Please contact the site administrator.</p>;
  }

  return (
    <div className="space-y-1">
      <div ref={containerRef} className="min-h-[65px]" />
      {loadError && <p role="alert" className="text-xs text-destructive">Verification could not be loaded. Please refresh and try again.</p>}
    </div>
  );
}
