import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Send, Trash2, Users, User, Info, AlertTriangle, CheckCircle, GraduationCap, Mail, ShieldAlert, UserX } from "lucide-react";
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
  image_url: string | null;
  action_link: string | null;
}

interface Student {
  id: string;
  first_name: string | null;
  last_name: string | null;
  student_class: string | null;
  admission_number: string | null;
  community_blocked_until?: string | null;
  community_warn_count?: number;
  is_approved?: boolean;
}

const NotificationSender = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [actionLink, setActionLink] = useState("");
  const [type, setType] = useState("info");
  const [targetType, setTargetType] = useState<
    "all" | "class" | "specific" | "suspended_community" | "deactivated_dlms" | "all_suspended"
  >("all");
  const [targetClass, setTargetClass] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sending, setSending] = useState(false);
  const [sendAsEmail, setSendAsEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadStudents();
    loadNotifications();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, student_class, admission_number, community_blocked_until, community_warn_count, is_approved")
      .eq("role", "student")
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

  // Suspension & deactivation calculations
  const communitySuspendedCount = students.filter(
    s => s.community_blocked_until && new Date(s.community_blocked_until).getTime() > Date.now()
  ).length;

  const deactivatedCount = students.filter(s => s.is_approved === false).length;

  const allSuspendedCount = students.filter(
    s => (s.community_blocked_until && new Date(s.community_blocked_until).getTime() > Date.now()) || s.is_approved === false
  ).length;

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Title and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let recipientIds: string[] = [];

      if (targetType === "all") {
        recipientIds = students.filter(s => s.is_approved !== false).map(s => s.id);
      } else if (targetType === "class") {
        if (!targetClass) {
          toast({ title: "Class Required", description: "Please select a target class.", variant: "destructive" });
          setSending(false);
          return;
        }
        recipientIds = students.filter(s => s.student_class === targetClass).map(s => s.id);
      } else if (targetType === "specific") {
        if (selectedUserIds.size === 0) {
          toast({ title: "Selection Required", description: "Please check at least one student.", variant: "destructive" });
          setSending(false);
          return;
        }
        recipientIds = Array.from(selectedUserIds);
      } else if (targetType === "suspended_community") {
        recipientIds = students
          .filter(s => s.community_blocked_until && new Date(s.community_blocked_until).getTime() > Date.now())
          .map(s => s.id);
      } else if (targetType === "deactivated_dlms") {
        recipientIds = students
          .filter(s => s.is_approved === false)
          .map(s => s.id);
      } else if (targetType === "all_suspended") {
        recipientIds = students
          .filter(s => (s.community_blocked_until && new Date(s.community_blocked_until).getTime() > Date.now()) || s.is_approved === false)
          .map(s => s.id);
      }

      if (recipientIds.length === 0) {
        toast({ title: "No Recipients", description: "No matching students found for this selection.", variant: "destructive" });
        setSending(false);
        return;
      }

      const insertRows = recipientIds.map(uid => ({
        title,
        message,
        type,
        image_url: imageUrl.trim() || null,
        action_link: actionLink.trim() || null,
        target_user_id: uid,
        sent_by: user.id,
      }));

      const { data: inserted, error } = await supabase.from("notifications").insert(insertRows).select();
      if (error) throw error;

      // Dispatch automated email notification campaign if toggle is active
      if (sendAsEmail && recipientIds.length > 0) {
        try {
          await supabase.functions.invoke("send-email-campaign", {
            body: {
              recipientIds: recipientIds.slice(0, 300),
              preset: "moderation_warning",
              customSubject: title,
              customMessage: message,
              details: {
                warningTitle: title,
                warningMessage: message,
              },
            },
          });
        } catch (emailErr) {
          console.warn("Email dispatch error:", emailErr);
        }
      }

      // Fire push notifications via Edge Function (non-blocking, best-effort)
      if (inserted && inserted.length > 0) {
        const pushPayloads = inserted.slice(0, 50);
        pushPayloads.forEach(record => {
          supabase.functions.invoke("push-notification", {
            body: { record },
          }).catch(() => {});
        });
      }

      toast({
        title: "Dispatched!",
        description: `Notification sent to ${recipientIds.length} recipient(s)${sendAsEmail ? " and dispatched via email" : ""}.`,
      });
      setTitle("");
      setMessage("");
      setImageUrl("");
      setActionLink("");
      setType("info");
      setTargetType("all");
      setTargetClass("");
      setSelectedUserIds(new Set());
      setSendAsEmail(false);
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
        <h2 className="text-2xl font-bold text-foreground">Notifications &amp; Alerts Panel</h2>
        <p className="text-sm text-muted-foreground">Broadcast notifications or target specific classrooms, individuals, and suspended accounts.</p>
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
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Image URL (Optional)</Label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Action Link (Optional)</Label>
                <Input value={actionLink} onChange={e => setActionLink(e.target.value)} placeholder="https://..." />
              </div>
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
                    <SelectItem value="all">👥 All Active Students ({students.filter(s => s.is_approved !== false).length})</SelectItem>
                    <SelectItem value="class">🏫 Specific Class League</SelectItem>
                    <SelectItem value="specific">🎯 Checked Students ({selectedUserIds.size})</SelectItem>
                    <SelectItem value="suspended_community">
                      🚫 Community Suspended Accounts ({communitySuspendedCount})
                    </SelectItem>
                    <SelectItem value="deactivated_dlms">
                      🔒 Deactivated DLMS Accounts ({deactivatedCount})
                    </SelectItem>
                    <SelectItem value="all_suspended">
                      ⚠️ All Suspended &amp; Deactivated ({allSuspendedCount})
                    </SelectItem>
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
                <div className="flex items-center justify-between">
                  <Label>Check Recipient Students</Label>
                  <span className="text-[11px] text-muted-foreground">{selectedUserIds.size} selected</span>
                </div>
                <Input placeholder="Filter students by name or roll..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 mb-2" />
                <div className="max-h-56 overflow-y-auto border rounded-lg divide-y divide-border bg-muted/10 p-1">
                  {filteredStudents.map(s => {
                    const checked = selectedUserIds.has(s.id);
                    const isCommunitySuspended = s.community_blocked_until && new Date(s.community_blocked_until).getTime() > Date.now();
                    const isDeactivated = s.is_approved === false;

                    return (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-muted transition-colors cursor-pointer rounded">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectStudent(s.id)}
                          className="rounded text-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{s.first_name} {s.last_name}</span>
                            {isCommunitySuspended && (
                              <Badge className="bg-amber-500 text-white text-[9px] py-0 font-bold">🚫 Community Suspended</Badge>
                            )}
                            {isDeactivated && (
                              <Badge variant="destructive" className="text-[9px] py-0 font-bold">🔒 Deactivated</Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground text-[11px]">Class {s.student_class || "—"} · Adm #{s.admission_number || "—"}</span>
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

            {/* Target Audience Summary Callouts */}
            {targetType === "suspended_community" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <UserX className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Targeting Community-Suspended Accounts ({communitySuspendedCount})</p>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    This notification will be dispatched to students who currently have an active community posting block.
                  </p>
                </div>
              </div>
            )}

            {targetType === "deactivated_dlms" && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />
                <div>
                  <p className="font-bold">Targeting Deactivated DLMS Accounts ({deactivatedCount})</p>
                  <p className="text-[11px] text-rose-800/90 mt-0.5">
                    This notification will be dispatched to students whose accounts have been deactivated (pending or 3rd strike).
                  </p>
                </div>
              </div>
            )}

            {targetType === "all_suspended" && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Targeting All Suspended &amp; Deactivated Accounts ({allSuspendedCount})</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Dispatched to all accounts with active community suspensions or deactivated DLMS access.
                  </p>
                </div>
              </div>
            )}

            {/* Also Send as Email Checkbox */}
            <div className="pt-2 border-t border-border/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground hover:text-primary transition-colors">
                <Checkbox
                  checked={sendAsEmail}
                  onCheckedChange={v => setSendAsEmail(v === true)}
                />
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-indigo-600" />
                  Also dispatch as official Email Notice to recipient addresses
                </span>
              </label>
            </div>

            <Button onClick={handleSend} disabled={sending} className="w-full gradient-primary border-0">
              <Send className="h-4 w-4 mr-2" /> {sending ? "Sending..." : "Dispatch Notification"}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card className="border-border/50 bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Dispatched Notifications ({notifications.length})
            </CardTitle>
            <CardDescription>Recently sent broadcasts and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {notifications.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet.</p>
              )}
              {notifications.map(n => (
                <div key={n.id} className="p-3.5 rounded-xl border border-border/60 hover:border-border transition-colors bg-muted/20 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground truncate">{n.title}</p>
                        <Badge variant="outline" className="text-[10px] capitalize py-0">{n.type}</Badge>
                        {n.target_user_id ? (
                          <Badge variant="secondary" className="text-[10px] py-0">Targeted</Badge>
                        ) : (
                          <Badge className="bg-primary/10 text-primary text-[10px] py-0 border-0">Broadcast</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="h-4 w-4" />
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
