import { useState, useEffect } from "react";
import { Bell, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeWebPush } from "@/hooks/usePushSubscription";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

interface PWANotificationPromptProps {
  userId?: string | null;
}

export default function PWANotificationPrompt({ userId }: PWANotificationPromptProps) {
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Do not show enable notification banner before login
    if (!userId) {
      setShowPrompt(false);
      return;
    }

    // If running in native Android APK (Capacitor), Capacitor handles push separately
    if (Capacitor.isNativePlatform()) return;

    // Only for browsers supporting push and notifications
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    // If permission is already granted or denied, don't show prompt
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return;
    }

    // Check if user dismissed it recently (cooldown: 2 days)
    const dismissedAt = localStorage.getItem("pwa_notif_prompt_dismissed");
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 2 * 24 * 60 * 60 * 1000) return;
    }

    // Show prompt after a short delay on mount
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [userId]);

  const handleEnable = async () => {
    if (!userId) {
      toast({
        title: "Please log in first",
        description: "Log in to link notifications to your library account.",
        variant: "destructive",
      });
      return;
    }

    setSubscribing(true);
    try {
      const success = await subscribeWebPush(userId);
      if (success) {
        toast({
          title: "🔔 Notifications Enabled!",
          description: "You'll now receive book alerts, quiz updates, and event reminders on your device.",
        });
        setShowPrompt(false);
      } else {
        if (Notification.permission === "denied") {
          toast({
            title: "Notifications Blocked",
            description: "Please enable notifications for this site in your Android browser settings.",
            variant: "destructive",
          });
          setShowPrompt(false);
        } else {
          toast({
            title: "Permission not granted",
            description: "Tap 'Allow' when the browser prompt appears.",
            variant: "destructive",
          });
        }
      }
    } catch (e) {
      console.warn("Push prompt error:", e);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_notif_prompt_dismissed", Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt || !userId) return null;

  return (
    <div className="fixed top-16 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-card/95 backdrop-blur-md border border-indigo-200 dark:border-indigo-900/60 shadow-xl rounded-2xl p-4 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md">
          <Bell className="h-5 w-5 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            Get Library Alerts on Android
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Never miss book due dates, new arrivals, quizzes, and school announcements.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={subscribing}
              className="h-8 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs gap-1.5"
            >
              {subscribing ? "Enabling..." : "Enable Alerts"}
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 shrink-0 rounded-lg hover:bg-muted transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
