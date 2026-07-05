import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Trash2, Users, User, Info, AlertTriangle, CheckCircle, GraduationCap } from "lucide-react";
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
  const [targetType, setTargetType] = useState<"all" | "class" | "specific">("all");
  const [targetClass, setTargetClass] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
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
    if (data) {
      setStudents(data);
      const uniqClasses = Array.from(new Set(data.map(s => s.student_class).filter(Boolean))) as string[];
      setClasses(uniqClasses.sort());
    }
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

      let insertRows: any[] = [];

      if (targetType === "all") {
        insertRows = [{
          title,
          message,
          type,
          target_user_id: null,
          sent_by: user.id,
        }];
      } 
      else if (targetType === "class") {
        if (!targetClass) {
          toast({ title: "Class Required", description: "Please select a target class.", variant: "destructive" });
          setSending(false);
          return;
        }
        const classStudents = students.filter(s => s.student_class === targetClass);
        insertRows = classStudents.map(s => ({
          title,
          message,
          type,
          target_user_id: s.id,
          sent_by: user.id,
        }));
      } 
      else if (targetType === "specific") {
        if (selectedUserIds.size === 0) {
          toast({ title: "Selection Required", description: "Please check at least one student.", variant: "destructive" });
          setSending(false);
          return;
        }
        insertRows = Array.from(selectedUserIds).map(uid => ({
          title,
          message,
          type,
          target_user_id: uid,
          sent_by: user.id,
        }));
      }

      if (insertRows.length === 0) {
        toast({ title: "No Recipients", description: "No target students found.", variant: "destructive" });
        setSending(false);
        return;
      }

      const { error } = await supabase.from("notifications").insert(insertRows);
      if (error) throw error;

      toast({ title: "Sent!", description: `Notification dispatched to ${insertRows.length} user(s).` });
      setTitle("");
      setMessage("");
      setType("info");
      setTargetType("all");
      setTargetClass("");
      setSelectedUserIds(new Set());
      loadNotifications();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Failed to send notifications", variant: "destructive" });
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

  const toggleSelectStudent = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const typeIcon = (t: string) => {
    if (t === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
    if (t === "success") return <CheckCircle className="h-4 w-4 text-success" />;
    return <Info className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Notifications Panel</h2>
        <p className="text-sm text-muted-foreground">Broadcast notifications or target specific classrooms and individuals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <Card className="border-border/50 bg-white">
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
                <Label>Target Audience</Label>
                <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="class">Specific Class League</SelectItem>
                    <SelectItem value="specific">Checked Students ({selectedUserIds.size})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {targetType === "class" && (
              <div className="space-y-1 animate-fade-in">
                <Label>Select Target Class</Label>
                <Select value={targetClass} onValueChange={setTargetClass}>
                  <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === "specific" && (
              <div className="space-y-2 animate-fade-in">
                <Label>Check Recipient Students</Label>
                <Input placeholder="Filter students by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 mb-2" />
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-border bg-muted/10 p-1">
                  {filteredStudents.map(s => {
                    const checked = selectedUserIds.has(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-muted transition-colors cursor-pointer rounded">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectStudent(s.id)}
                          className="rounded text-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">{s.first_name} {s.last_name}</span>
                          <span className="text-muted-foreground ml-2">Class {s.student_class} · Roll #{s.admission_number || "—"}</span>
                        </div>
                      </label>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No students match search filter.</p>
                  )}
                </div>
              </div>
            )}

            <Button onClick={handleSend} disabled={sending} className="w-full gradient-primary border-0">
              <Send className="h-4 w-4 mr-2" /> {sending ? "Sending..." : "Dispatch Notification"}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-border/50 bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary animate-pulse" /> Recent Outbox
            </CardTitle>
            <CardDescription>Last 50 notifications dispatched</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notifications.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet</p>
              )}
              {notifications.map(n => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group border border-transparent hover:border-border/40 transition-all">
                  {typeIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {n.target_user_id ? <User className="h-2.5 w-2.5 mr-1" /> : <GraduationCap className="h-2.5 w-2.5 mr-1" />}
                        {n.target_user_id ? "Direct Target" : "Broadcast"}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => handleDelete(n.id)}>
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
