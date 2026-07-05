import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Trash2, Users, User, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_user_id: string | null;
  created_at: string;
  is_read: boolean;
}

interface Student {
  id: string;
  first_name: string | null;
  last_name: string | null;
  student_class: string | null;
  admission_number: string | null;
}

const NotificationSender = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadStudents();
    loadNotifications();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, student_class, admission_number")
      .eq("role", "student")
      .eq("is_approved", true)
      .order("first_name");
    if (data) setStudents(data);
  };

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as Notification[]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Title and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("notifications").insert({
        title,
        message,
        type,
        target_user_id: targetType === "specific" ? targetUserId : null,
        sent_by: user.id,
      });

      if (error) throw error;
      toast({ title: "Sent!", description: "Notification sent successfully" });
      setTitle("");
      setMessage("");
      setType("info");
      setTargetType("all");
      setTargetUserId("");
      loadNotifications();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to send notification", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted" });
      loadNotifications();
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeIcon = (t: string) => {
    if (t === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
    if (t === "success") return <CheckCircle className="h-4 w-4 text-success" />;
    return <Info className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground">Send targeted messages to students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="success">✅ Success</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target</Label>
                <Select value={targetType} onValueChange={(v: "all" | "specific") => setTargetType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="specific">Specific Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {targetType === "specific" && (
              <div>
                <Label>Select Student</Label>
                <Input placeholder="Search students..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="mb-2" />
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y divide-border">
                  {filteredStudents.slice(0, 20).map(s => (
                    <button key={s.id} onClick={() => { setTargetUserId(s.id); setSearchQuery(`${s.first_name} ${s.last_name}`); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${targetUserId === s.id ? "bg-primary/10" : ""}`}>
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      <span className="text-muted-foreground ml-2">{s.student_class} · {s.admission_number}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSend} disabled={sending} className="w-full gradient-primary border-0">
              <Send className="h-4 w-4 mr-2" /> {sending ? "Sending..." : "Send Notification"}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Recent Notifications
            </CardTitle>
            <CardDescription>Last 50 notifications sent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {notifications.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet</p>
              )}
              {notifications.map(n => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group">
                  {typeIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {n.target_user_id ? <User className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                        {n.target_user_id ? "Targeted" : "Broadcast"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSender;
