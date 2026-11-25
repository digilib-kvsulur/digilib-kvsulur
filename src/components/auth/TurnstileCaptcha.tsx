import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

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
  const [ready, setReady] = useState(false);
  const [localReset, setLocalReset] = useState(0);
  const [widgetSize, setWidgetSize] = useState<"flexible" | "compact">("flexible");
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || DEFAULT_TURNSTILE_SITE_KEY;
  callbacksRef.current = { onToken, onError };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const updateSize = (width: number) => {
      // Cloudflare Turnstile "flexible" / "normal" needs >= 300px; switch to compact below 308px to prevent clipping on narrow phones.
      setWidgetSize(width > 0 && width < 308 ? "compact" : "flexible");
    };
    updateSize(container.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let disposed = false;
    let widgetId: TurnstileWidgetId | undefined;
    setLoadError(false);
    setReady(false);
    callbacksRef.current.onToken("");

    loadTurnstile().then(() => {
      if (disposed || !containerRef.current || !window.turnstile) return;
      const isDark = document.documentElement.classList.contains("dark");
      setReady(true);
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: widgetSize,
        callback: (token: string) => callbacksRef.current.onToken(token),
        "expired-callback": () => callbacksRef.current.onToken(""),
        "error-callback": () => {
          callbacksRef.current.onToken("");
          setLoadError(true);
          callbacksRef.current.onError?.("Verification failed to load. Please try again.");
          return true;
        },
        theme: isDark ? "dark" : "light",
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
  }, [siteKey, resetKey, localReset, widgetSize]);

  if (!siteKey) {
    return <p role="status" className="text-xs text-destructive">Verification is not configured. Please contact the site administrator.</p>;
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl flex flex-col items-center justify-center py-0.5">
      <div className="relative w-full min-h-[65px] min-w-0 overflow-hidden flex items-center justify-center">
        {!ready && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary/70 animate-pulse" />
            <span>Loading security check…</span>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full min-h-[65px] min-w-0 overflow-hidden flex justify-center"
        />
      </div>
      {loadError && (
        <div className="mt-1.5 flex items-center justify-center gap-2 text-xs text-destructive">
          <span role="alert">Security check failed to load.</span>
          <button
            type="button"
            onClick={() => setLocalReset((n) => n + 1)}
            className="font-semibold text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
