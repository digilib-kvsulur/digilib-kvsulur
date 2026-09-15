/**
 * MigrationInstallGuide
 *
 * Full-screen step-by-step install guide shown on the NEW domain
 * when a student arrives via the migration link (?migrated=true).
 *
 * Problem being solved:
 *   - Students already have the old PWA installed → browser thinks "already installed"
 *     and may delay or skip the beforeinstallprompt on the new domain.
 *   - iOS Safari never fires beforeinstallprompt — requires manual steps.
 *   - The prompt may fire BEFORE React mounts → captured globally in index.html.
 *
 * This component:
 *   1. Reads window.__pwaInstallPrompt (captured before React mounts).
 *   2. Listens for the custom 'pwa-install-ready' event if prompt arrives later.
 *   3. Shows native install button if available (Android Chrome / Edge).
 *   4. Shows step-by-step manual instructions for iOS Safari.
 *   5. Shows a congratulations screen after successful install.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Smartphone, Share, Plus, MoreVertical, CheckCircle2, X,
  Download, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const GUIDE_SHOWN_KEY = "migration_install_guide_shown_v1";

type Platform = "android" | "ios" | "samsung" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function getStoredPrompt(): any {
  return (window as any).__pwaInstallPrompt ?? null;
}

export default function MigrationInstallGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"guide" | "done">("guide");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [platform] = useState<Platform>(detectPlatform);

  useEffect(() => {
    // Only show on the new domain, only when arriving via migration link
    const migrated = sessionStorage.getItem("pwa_migration_flow");
    if (!migrated) return;
    // Don't re-show if already done
    if (localStorage.getItem(GUIDE_SHOWN_KEY) === "done") return;

    setVisible(true);

    // Pick up prompt captured before React mounted
    const stored = getStoredPrompt();
    if (stored) setInstallPrompt(stored);

    // Also listen in case the event fires after mount
    const onPromptReady = (e: Event) => {
      setInstallPrompt((e as CustomEvent).detail);
    };
    const onInstalled = () => {
      setStep("done");
      localStorage.setItem(GUIDE_SHOWN_KEY, "done");
    };

    window.addEventListener("pwa-install-ready", onPromptReady);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-install-ready", onPromptReady);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  const handleNativeInstall = useCallback(async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      (window as any).__pwaInstallPrompt = null;
      setInstallPrompt(null);
      if (outcome === "accepted") {
        setStep("done");
        localStorage.setItem(GUIDE_SHOWN_KEY, "done");
      }
    } catch {
      /* ignore */
    }
  }, [installPrompt]);

  const handleDone = () => {
    localStorage.setItem(GUIDE_SHOWN_KEY, "done");
    sessionStorage.removeItem("pwa_migration_flow");
    setVisible(false);
  };

  if (!visible) return null;

  if (step === "done") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-6 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">You're all set! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-5">
            KV Sulur DigiLib is now installed from the official school domain.
            You can delete the old <span className="font-mono text-xs">dlmskvsulur.vercel.app</span> shortcut from your home screen.
          </p>
          <Button className="w-full gradient-primary border-0" onClick={handleDone}>
            Start using the app
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-blue-600 text-white px-5 pt-5 pb-6">
          <button
            onClick={handleDone}
            aria-label="Skip install guide"
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs opacity-80">Step 2 of 2</p>
              <h2 className="text-base font-bold leading-tight">Install the new app</h2>
            </div>
          </div>
          <p className="text-xs opacity-80">
            You're on <strong>dlms.kvsulur.in</strong> — now add it to your home screen.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Android / Chrome — native prompt available */}
          {(platform === "android" || platform === "other") && installPrompt && (
            <div>
              <Button
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                onClick={handleNativeInstall}
              >
                <Download className="h-4 w-4" />
                Add to Home Screen
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Tap the button above — a system dialog will appear.
              </p>
            </div>
          )}

          {/* Android / Chrome — prompt not yet available */}
          {(platform === "android" || platform === "other") && !installPrompt && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Manual steps</p>
              {[
                { icon: <MoreVertical className="h-4 w-4 shrink-0 text-indigo-500" />, text: "Tap the ⋮ menu in Chrome (top right)" },
                { icon: <Plus className="h-4 w-4 shrink-0 text-indigo-500" />, text: 'Tap "Add to Home screen"' },
                { icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />, text: 'Tap "Add" to confirm' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
                  <span className="text-xs font-bold text-indigo-600 w-4">{i + 1}</span>
                  {s.icon}
                  <p className="text-xs text-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* iOS Safari */}
          {platform === "ios" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">iPhone / iPad steps</p>
              {[
                {
                  icon: <Share className="h-4 w-4 shrink-0 text-indigo-500" />,
                  text: 'Tap the Share button (□↑) at the bottom of Safari',
                },
                {
                  icon: <Plus className="h-4 w-4 shrink-0 text-indigo-500" />,
                  text: 'Scroll down and tap "Add to Home Screen"',
                },
                {
                  icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />,
                  text: 'Tap "Add" in the top right corner',
                },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
                  <span className="text-xs font-bold text-indigo-600 w-4">{i + 1}</span>
                  {s.icon}
                  <p className="text-xs text-foreground">{s.text}</p>
                </div>
              ))}
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                ⚠️ Make sure you're using Safari — "Add to Home Screen" is not available in Chrome on iPhone.
              </p>
            </div>
          )}

          {/* Samsung Browser */}
          {platform === "samsung" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Samsung Browser steps</p>
              {[
                { icon: <MoreVertical className="h-4 w-4 shrink-0 text-indigo-500" />, text: "Tap the ☰ menu (bottom right)" },
                { icon: <Plus className="h-4 w-4 shrink-0 text-indigo-500" />, text: 'Tap "Add page to" → "Home screen"' },
                { icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />, text: 'Tap "Add" to confirm' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
                  <span className="text-xs font-bold text-indigo-600 w-4">{i + 1}</span>
                  {s.icon}
                  <p className="text-xs text-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* After install CTA */}
          <div className="pt-1 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleDone}
            >
              Skip for now
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs gap-1 gradient-primary border-0"
              onClick={() => { setStep("done"); localStorage.setItem(GUIDE_SHOWN_KEY, "done"); }}
            >
              Done — I installed it
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
