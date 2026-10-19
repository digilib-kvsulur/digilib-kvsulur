import { useCallback, useEffect, useState } from "react";
import { Activity, Clock3, MessageSquare, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const GROUP_TOPIC = "friends-group:online";
const getBool = (value: unknown, fallback: boolean) => value === undefined || value === null ? fallback : value === true || value === "true";
const getNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default function FriendsChatAdmin() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [groupEnabled, setGroupEnabled] = useState(true);
  const [maxRetention, setMaxRetention] = useState("168");
  const [activeMessages, setActiveMessages] = useState<number | null>(null);
  const [todayMessages, setTodayMessages] = useState<number | null>(null);
  const [expiredPending, setExpiredPending] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const [settingsRes, statsRes] = await Promise.all([
      supabase.from("system_settings").select("key, value").in("key", ["friends_chat_enabled", "friends_group_chat_enabled", "friends_chat_max_retention_hours"]),
      (supabase as any).rpc("get_friends_chat_admin_stats"),
    ]);
    if (!settingsRes.error) {
      const values = Object.fromEntries((settingsRes.data || []).map((row) => [row.key, row.value]));
      setEnabled(getBool(values.friends_chat_enabled, true));
      setGroupEnabled(getBool(values.friends_group_chat_enabled, true));
      setMaxRetention(String(getNumber(values.friends_chat_max_retention_hours, 168)));
    }
    setActiveMessages(statsRes.error ? null : Number(statsRes.data?.active_messages ?? 0));
    setTodayMessages(statsRes.error ? null : Number(statsRes.data?.today_messages ?? 0));
    setExpiredPending(statsRes.error ? null : Number(statsRes.data?.expired_pending ?? 0));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel(GROUP_TOPIC, { config: { private: true } })
      .on("presence", { event: "sync" }, () => setOnlineCount(Object.keys(channel.presenceState()).length));
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const saveSetting = async (key: string, value: boolean | number, onSuccess: () => void) => {
    setSavingKey(key);
    const { error } = await supabase.from("system_settings").upsert({ key, value: value as any }, { onConflict: "key" });
    if (error) toast({ title: "Could not save chat setting", description: error.message, variant: "destructive" });
    else { onSuccess(); toast({ title: "Chat setting updated" }); }
    setSavingKey(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-1 sm:p-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="mb-2 flex items-center gap-2"><Badge variant="secondary">Student messaging</Badge><Badge className="gap-1 bg-emerald-600"><Activity className="h-3 w-3" /> Live</Badge></div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Friends Chat</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Control chat availability and retention, and review service activity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2 self-start sm:self-auto"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="People in group room" value={onlineCount} detail="Live presence" accent="text-violet-600 bg-violet-500/10" />
        <Metric icon={MessageSquare} label="Active private messages" value={activeMessages} detail="Awaiting expiry" accent="text-indigo-600 bg-indigo-500/10" />
        <Metric icon={Activity} label="Messages today" value={todayMessages} detail="Private chat volume" accent="text-sky-600 bg-sky-500/10" />
        <Metric icon={Clock3} label="Expired, awaiting cleanup" value={expiredPending} detail="Removed by scheduled cleanup" accent="text-amber-600 bg-amber-500/10" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5 text-primary" /> Availability</CardTitle><CardDescription>Changes apply to students across this school.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <SettingRow title="Private friend chat" description="Allow accepted friends to send each other expiring messages." checked={enabled} disabled={savingKey === "friends_chat_enabled"} onChange={(checked) => void saveSetting("friends_chat_enabled", checked, () => setEnabled(checked))} />
            <div className="border-t" />
            <SettingRow title="Everyone online group room" description="Allow students to join the live, unsaved group chat." checked={groupEnabled} disabled={!enabled || savingKey === "friends_group_chat_enabled"} onChange={(checked) => void saveSetting("friends_group_chat_enabled", checked, () => setGroupEnabled(checked))} />
            {!enabled && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Turn on private friend chat to make the chat area available to students.</p>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5 text-primary" /> Message retention</CardTitle><CardDescription>Private chat messages are deleted after their expiry time.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Maximum student-selected duration</p><p className="text-xs text-muted-foreground">Students may choose a shorter expiry per message.</p></div>
              <Select value={maxRetention} onValueChange={(value) => { const hours = Number(value); void saveSetting("friends_chat_max_retention_hours", hours, () => setMaxRetention(value)); }} disabled={loading || savingKey === "friends_chat_max_retention_hours"}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 hour</SelectItem><SelectItem value="24">1 day</SelectItem><SelectItem value="168">7 days</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 rounded-xl border bg-muted/30 p-3.5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><p className="text-xs leading-relaxed text-muted-foreground">Private message contents are not shown on this admin page. The counts above show usage only. The online count includes students currently present in the group room.</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, accent }: { icon: React.ElementType; label: string; value: number | null; detail: string; accent: string }) {
  return <Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold leading-tight">{value === null ? "—" : value.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{detail}</p></div></CardContent></Card>;
}

function SettingRow({ title, description, checked, disabled, onChange }: { title: string; description: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p></div><Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={title} /></div>;
}
