import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
}

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const typeColor = (t: string) => {
    if (t === "warning") return "border-l-warning";
    if (t === "success") return "border-l-success";
    return "border-l-primary";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center min-w-[18px] h-[18px]">
              {unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 overflow-y-auto max-h-[50vh]">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          )}
          {notifications.map(n => (
            <div key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={`p-3 rounded-lg border-l-4 cursor-pointer transition-colors ${typeColor(n.type)} ${n.is_read ? "bg-muted/30 opacity-70" : "bg-muted/60 hover:bg-muted"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationBell;
