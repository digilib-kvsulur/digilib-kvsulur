import { useState, useEffect, useRef } from "react";
import { Download, Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

/**
 * Shows:
 * - "Install App" button when the browser supports PWA installation.
 * - "Enable Notifications" button when push permission hasn't been granted yet.
 */
export function PWAControls({ userId }: PWAControlsProps) {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
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
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      if (userId) {
        await supabase.from("push_subscriptions").upsert(
          { user_id: userId, subscription_object: subscription.toJSON() },
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

  if (!isInstallable && !showNotifButton) return null;

  return (
    <div className="flex items-center gap-1">
      {isInstallable && (
        <Button
          onClick={handleInstall}
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          title="Install App"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </Button>
      )}

      {showNotifButton && (
        <Button
          onClick={handleEnableNotifications}
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-xs font-semibold border-amber-200 text-amber-700 hover:bg-amber-50"
          title="Enable push notifications"
        >
          {notifPermission === "denied" ? (
            <BellOff className="w-3.5 h-3.5" />
          ) : (
            <BellRing className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {notifPermission === "denied" ? "Notifications Blocked" : "Enable Alerts"}
          </span>
        </Button>
      )}
    </div>
  );
}
