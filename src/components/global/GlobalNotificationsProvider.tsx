import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import PWANotificationPrompt from "@/components/pwa/PWANotificationPrompt";

interface GlobalNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  action_link?: string | null;
  target_user_id?: string | null;
  created_at?: string;
}

interface NotificationsContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  triggerTestNotification: () => void;
  requestPermission: () => Promise<NotificationPermission | null>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  triggerTestNotification: () => {},
  requestPermission: async () => null,
});

export const useGlobalNotifications = () => useContext(NotificationsContext);

// Audio chime using Web Audio API (no external asset needed)
export const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch {
    // Ignore audio autoplay restrictions
  }
};

// Universal System/Push Notification (works across Android Chrome, PWAs, and Desktop)
export const showSystemPushNotification = async (
  title: string,
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    action_link?: string | null;
    tag?: string;
  } = {}
) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  const iconUrl = options.icon || "/pwa-192x192.png";
  const badgeUrl = options.badge || "/pwa-192x192.png";
  const notifOptions: NotificationOptions = {
    body: options.body || "You have a new update from KV Sulur DLMS.",
    icon: iconUrl,
    badge: badgeUrl,
    tag: options.tag || `notif-${Date.now()}`,
    data: {
      url: options.action_link || "/",
    },
    // Vibration pattern for mobile phones (supported on Android)
    vibrate: [200, 100, 200, 100, 200] as any,
  };

  // 1. ServiceWorker showNotification — REQUIRED for Android Chrome & Installed PWAs
  // calling `new Notification()` on Android throws TypeError: Illegal constructor!
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    } catch (swErr) {
      console.warn("ServiceWorker showNotification failed, trying fallback:", swErr);
    }
  }

  // 2. Desktop Browser fallback (where new Notification() is supported in window context)
  try {
    new Notification(title, notifOptions);
    return true;
  } catch (desktopErr) {
    console.warn("Desktop Notification constructor failed:", desktopErr);
  }

  return false;
};

export const GlobalNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  // Deduplication cache: prevents duplicate toasts/alerts when multiple events fire in short succession
  const seenNotifKeys = React.useRef<Map<string, number>>(new Map());

  // Auto-subscribe to Web Push and Native Capacitor Push
  usePushSubscription(userId);

  const fetchUnreadCount = async (uid: string) => {
    try {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .or(`target_user_id.eq.${uid},target_user_id.is.null`);

      setUnreadCount(count || 0);
    } catch (e) {
      console.warn("Could not fetch unread notifications count:", e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) fetchUnreadCount(uid);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid) fetchUnreadCount(uid);
      else setUnreadCount(0);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime Supabase postgres_changes listener on notifications table
  useEffect(() => {
    if (!userId) return;

    const channelName = `global_realtime_notifs_${userId}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async (payload) => {
          const newNotif = payload.new as GlobalNotification;
          // Check if notification is targeted to this user or global (null)
          if (!newNotif.target_user_id || newNotif.target_user_id === userId) {
            // Deduplication: prevent showing the same notification multiple times
            const dedupKey = newNotif.id || `${newNotif.title}__${newNotif.message}`;
            const now = Date.now();
            // Prune keys older than 30 seconds
            for (const [k, t] of seenNotifKeys.current.entries()) {
              if (now - t > 30000) seenNotifKeys.current.delete(k);
            }
            if (seenNotifKeys.current.has(dedupKey)) {
              return; // Already processed this notification!
            }
            seenNotifKeys.current.set(dedupKey, now);

            setUnreadCount((prev) => prev + 1);
            playNotificationChime();

            // Native PWA system notification (system tray, status bar & lockscreen)
            await showSystemPushNotification(newNotif.title || "KV Sulur DLMS", {
              body: newNotif.message,
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              action_link: newNotif.action_link,
              tag: newNotif.id,
            });

            // Single In-app interactive toast
            toast(newNotif.title || "Library Notification", {
              description: newNotif.message,
              action: newNotif.action_link
                ? {
                    label: "View",
                    onClick: () => {
                      if (newNotif.action_link) window.location.href = newNotif.action_link;
                    },
                  }
                : undefined,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const requestPermission = async (): Promise<NotificationPermission | null> => {
    if (!("Notification" in window)) return null;
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch {
      return null;
    }
  };

  const triggerTestNotification = async () => {
    playNotificationChime();
    
    // Request permission if not yet decided
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
        await showSystemPushNotification("🔔 KV Sulur DLMS Notification Test", {
          body: "PWA push notification pipeline is active and working on your device!",
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          action_link: "/",
        });
      }
    }

    toast.success("🔔 Test Notification Triggered!", {
      description: "Push notification sound & toast pipeline operational.",
    });
  };

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount: () => (userId ? fetchUnreadCount(userId) : Promise.resolve()),
        triggerTestNotification,
        requestPermission,
      }}
    >
      <PWANotificationPrompt userId={userId} />
      {children}
    </NotificationsContext.Provider>
  );
};
