import { useState, useEffect, useRef } from "react";
import { BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


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
 * Shows an "Enable Notifications" button when push permission hasn't been granted yet.
 */
export function PWAControls({ userId, className = "flex items-center gap-1", buttonClassName = "", showText = false }: PWAControlsProps) {
  const { toast } = useToast();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const subscribing = useRef(false);

  useEffect(() => {
    // Read current notification permission
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

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

  return (
    <div className={className}>
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
