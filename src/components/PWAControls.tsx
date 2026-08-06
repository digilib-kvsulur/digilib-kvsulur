import { useState, useEffect, useRef } from "react";
import { Download, Bell, BellOff, BellRing, HelpCircle, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

interface PWAControlsProps {
  userId?: string | null;
  className?: string;
  buttonClassName?: string;
  showText?: boolean;
}

/**
 * Shows:
 * - "Install App" button when the browser supports PWA installation.
 * - "Enable Notifications" button when push permission hasn't been granted yet.
 */
export function PWAControls({ userId, className = "flex items-center gap-1", buttonClassName = "", showText = false }: PWAControlsProps) {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const subscribing = useRef(false);

  useEffect(() => {
    // Track install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Read current notification permission
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      toast({ title: "App installed!", description: "Digilib has been added to your home screen." });
    }
    setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    if (subscribing.current) return;
    subscribing.current = true;

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission !== "granted") {
        toast({ title: "Notifications blocked", description: "Enable notifications in your browser settings.", variant: "destructive" });
        return;
      }

      const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!VAPID_PUBLIC_KEY) {
        toast({ title: "Notifications enabled", description: "Push alerts will work after the next deployment." });
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast({ title: "Notifications enabled", description: "In-app alerts are active. Push alerts need a supported browser." });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      if (userId) {
        await supabase.from("push_subscriptions").upsert(
          { user_id: userId, subscription_object: subscription.toJSON() as any },
          { onConflict: "user_id" }
        );
      }

      toast({ title: "🔔 Notifications enabled!", description: "You'll receive alerts even when the app is closed." });
    } catch (err) {
      console.warn("Notification subscribe error:", err);
      toast({ title: "Could not enable notifications", description: "Please try again or check browser settings.", variant: "destructive" });
    } finally {
      subscribing.current = false;
    }
  };

  const showNotifButton = "Notification" in window && notifPermission !== "granted";
  const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  return (
    <div className={className}>
      {isInstallable ? (
        <Button
          onClick={handleInstall}
          size="sm"
          variant="outline"
          className={`gap-1.5 h-8 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 ${buttonClassName}`}
          title="Install App"
        >
          <Download className="w-3.5 h-3.5" />
          {(showText || window.innerWidth > 640) && <span>Install App</span>}
        </Button>
      ) : (
        /* Manual PWA installation guide trigger when automatic beforeinstallprompt hasn't fired */
        <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={`gap-1.5 h-8 text-xs font-semibold border-indigo-100 text-slate-600 hover:bg-slate-50 ${buttonClassName}`}
              title="How to install the App"
            >
              <Download className="w-3.5 h-3.5" />
              {(showText || window.innerWidth > 640) && <span>Download App</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-[92%] rounded-2xl p-5 gap-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Download className="h-4.5 w-4.5 text-indigo-600" /> How to Download the App
              </DialogTitle>
              <DialogDescription className="text-xs">
                Follow these simple steps to install KV Sulur Digilib on your device.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-1">
              {!isSecure && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 leading-normal">
                  <strong>Non-secure connection:</strong> Install only works over <strong>https://</strong> (or localhost). Open the live site with HTTPS.
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                Digilib is a <strong>web app</strong>. You install it from the browser (Add to Home Screen) — there is no separate APK/EXE store file. That gives you an app icon and full-screen mode without Play Store / Windows Store publishing.
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">On Mobile (Android / Chrome)</h4>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">Tap the browser menu (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Smartphone className="h-4 w-4 text-pink-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">On Apple iOS (Safari)</h4>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Monitor className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">On Desktop (Chrome / Edge)</h4>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">Click the install icon in the address bar, or menu → <strong>Install KV Sulur DLMS</strong>.</p>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => setIsGuideOpen(false)} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs">
              Got it
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {showNotifButton && (
        <Button
          onClick={handleEnableNotifications}
          size="sm"
          variant="outline"
          className={`gap-1.5 h-8 text-xs font-semibold border-amber-200 text-amber-700 hover:bg-amber-50 ${buttonClassName}`}
          title="Enable push notifications"
        >
          {notifPermission === "denied" ? (
            <BellOff className="w-3.5 h-3.5" />
          ) : (
            <BellRing className="w-3.5 h-3.5" />
          )}
          {(showText || window.innerWidth > 640) && (
            <span>
              {notifPermission === "denied" ? "Notifications Blocked" : "Enable Alerts"}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
