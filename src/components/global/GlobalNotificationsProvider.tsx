import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";

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

export const GlobalNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

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
        (payload) => {
          const newNotif = payload.new as GlobalNotification;
          // Check if notification is targeted to this user or global (null)
          if (!newNotif.target_user_id || newNotif.target_user_id === userId) {
            setUnreadCount((prev) => prev + 1);
            playNotificationChime();

            // Native browser notification if window is minimized or in background
            if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
              try {
                new Notification(newNotif.title || "KV Sulur DLMS", {
                  body: newNotif.message,
                  icon: "/logos/kv-logo.png",
                });
              } catch {
                /* ignore */
              }
            }

            // In-app interactive toast
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

  const triggerTestNotification = () => {
    playNotificationChime();
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("🔔 KV Sulur DLMS Notification Test", {
          body: "Realtime push notification pipeline is active and working!",
          icon: "/favicon.ico",
        });
      } catch (err) {
        console.warn("Desktop notification error:", err);
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
      {children}
    </NotificationsContext.Provider>
  );
};
