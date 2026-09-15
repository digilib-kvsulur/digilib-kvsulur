/**
 * DomainMigrationBanner
 *
 * Shows a prominent, friendly prompt when a student is running the OLD
 * installed PWA from dlmskvsulur.vercel.app in standalone mode.
 *
 * Strategy:
 *  1. The Service Worker on the old domain sends a "DOMAIN_MIGRATED" message.
 *  2. OR we detect standalone mode + legacy hostname on startup.
 *  3. The banner invites them to open the new domain in their browser so
 *     the OS will offer to install the new PWA from dlms.kvsulur.in.
 *
 * After the user taps "Switch", we:
 *  - Open https://dlms.kvsulur.in/?migrated=true in a new tab/window.
 *  - Mark localStorage so the banner doesn't repeat endlessly.
 */

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, ArrowRightCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const LEGACY_HOST = "dlmskvsulur.vercel.app";
const NEW_ORIGIN = "https://dlms.kvsulur.in";
const DISMISSED_KEY = "domain_migration_dismissed_v1";

function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function isOnLegacyHost(): boolean {
  return window.location.hostname === LEGACY_HOST;
}

export default function DomainMigrationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already dismissed by user previously
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Case 1: running as installed PWA on the old domain right now
    if (isOnLegacyHost() && isStandaloneMode()) {
      setVisible(true);
      return;
    }

    // Case 2: Service Worker on the old domain posts a DOMAIN_MIGRATED message
    const handleSwMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "DOMAIN_MIGRATED") {
        setVisible(true);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
    };
  }, []);

  if (!visible) return null;

  const handleSwitch = () => {
    // Open the new domain — browser will re-offer PWA install prompt there
    window.open(`${NEW_ORIGIN}/?migrated=true`, "_blank", "noopener,noreferrer");
    // Don't auto-dismiss — let them tap ✕ once they've installed the new PWA
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-400"
    >
      <div className="relative rounded-2xl border border-indigo-300 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/80 dark:to-blue-950/80 shadow-xl p-4 overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss migration prompt"
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-indigo-500/15 rounded-xl shrink-0">
            <RefreshCw className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-tight">
              🎓 Official Domain Upgrade!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              KV Sulur DigiLib has a new verified school domain.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="mb-3 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          <p>
            The library app has moved to our official school address:
          </p>
          <p className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-md inline-block">
            🌐 dlms.kvsulur.in
          </p>
          <p>
            Tap <strong>"Switch & Install"</strong> to open the new app, then add it to your home screen. You can then safely delete this old shortcut.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 text-xs"
            onClick={handleSwitch}
          >
            <ArrowRightCircle className="h-3.5 w-3.5" />
            Switch &amp; Install New App
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground px-2"
            onClick={handleDismiss}
          >
            Later
          </Button>
        </div>

        {/* Footer tip */}
        <p className="mt-2.5 text-[10px] text-muted-foreground/70 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Opens in browser · Your login &amp; data transfer automatically
        </p>
      </div>
    </div>
  );
}
