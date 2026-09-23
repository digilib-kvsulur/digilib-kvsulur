import { useState, useEffect, useRef } from "react";
import { BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { subscribeWebPush } from "@/hooks/usePushSubscription";

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
    if (!userId) {
      toast({ title: "Please sign in", description: "Sign in to enable push notifications on this device.", variant: "destructive" });
      return;
    }
    subscribing.current = true;

    try {
      const ok = await subscribeWebPush(userId);
      if ("Notification" in window) {
        setNotifPermission(Notification.permission);
      }
      if (ok) {
        toast({ title: "🔔 Notifications enabled!", description: "You'll receive alerts and updates on this device." });
      } else {
        if (Notification.permission === "denied") {
          toast({ title: "Notifications blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
        } else {
          toast({ title: "Could not enable notifications", description: "Please allow notifications when prompted by your browser.", variant: "destructive" });
        }
      }
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
