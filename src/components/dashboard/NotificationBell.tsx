import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, ExternalLink, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  image_url: string | null;
  action_link: string | null;
  target_user_id?: string | null;
}

const playNotificationChime = () => {
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

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch {
    // Audio autoplay restrictions can be safely ignored
  }
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at, target_user_id, image_url, action_link")
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) setNotifications(data as unknown as Notification[]);
  };

  // Realtime Supabase listener
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (!newNotif.target_user_id || newNotif.target_user_id === currentUserId) {
            setNotifications((prev) => [newNotif, ...prev]);
            playNotificationChime();
            toast({
              title: newNotif.title || "New Notification",
              description: newNotif.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, toast]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (!unread.length) return;
    const ids = unread.map((n) => n.id);
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast({ title: "All notifications marked as read" });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const displayed = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  const typeColor = (t: string) => {
    if (t === "warning") return "border-l-warning";
    if (t === "success") return "border-l-success";
    return "border-l-primary";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-primary/10 transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[94vw] sm:max-w-md max-h-[85vh] p-4 sm:p-6 rounded-2xl flex flex-col gap-3">
        <DialogHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Bell className="h-4 w-4 text-primary" /> Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2">
                  {unreadCount} new
                </Badge>
              )}
            </DialogTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-primary px-2"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 pt-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
                filter === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto max-h-[55vh] pr-1 no-scrollbar">
          {displayed.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Updates regarding replies, likes, and rotational badges will appear here.
              </p>
            </div>
          )}
          {displayed.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.is_read) markAsRead(n.id);
                if (n.action_link) {
                  setOpen(false);
                  if (n.action_link.startsWith("http")) {
                    window.open(n.action_link, "_blank");
                  } else {
                    window.location.href = n.action_link;
                  }
                }
              }}
              className={`p-3 rounded-xl border-l-4 cursor-pointer transition-all ${typeColor(n.type)} ${
                n.is_read ? "bg-muted/30 opacity-75" : "bg-primary/5 hover:bg-primary/10 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground leading-tight">{n.title}</p>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
              {n.image_url && (
                <div className="mt-2 relative h-28 w-full rounded-lg overflow-hidden border border-border/50">
                  <img src={n.image_url} alt="attachment" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-muted-foreground border-t border-border/30">
                <span>{new Date(n.created_at).toLocaleString()}</span>
                {n.action_link && (
                  <span className="text-primary font-semibold flex items-center gap-0.5 hover:underline">
                    View <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationBell;
