import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3, MessageCircle, Send, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAvatarUrl } from "@/lib/utils";

type Friend = { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null };
type ChatMessage = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; expires_at: string };

const channelTopic = (a: string, b: string) => `friends-chat:${[a, b].sort().join(":")}`;
const displayName = (friend: Friend) => `${friend.first_name || ""} ${friend.last_name || ""}`.trim() || "Friend";

export default function FriendsChat({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [expiryHours, setExpiryHours] = useState("24");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadFriends = useCallback(async () => {
    const { data: relations } = await supabase.from("friendships").select("requester_id, addressee_id")
      .eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    const ids = [...new Set((relations || []).map((r: any) => r.requester_id === userId ? r.addressee_id : r.requester_id))];
    if (!ids.length) { setFriends([]); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", ids);
    setFriends((data || []) as Friend[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadFriends(); }, [loadFriends]);

  const receiveMessage = useCallback((incoming: ChatMessage) => {
    if (!incoming?.id || new Date(incoming.expires_at).getTime() <= Date.now()) return;
    setMessages((current) => current.some((m) => m.id === incoming.id) ? current : [...current, incoming].slice(-100));
  }, []);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    let mounted = true;
    const friendId = selected.id;
    const fetchMessages = async () => {
      setMessages([]);
      const { data } = await (supabase as any).from("chat_messages").select("id, sender_id, recipient_id, body, created_at, expires_at")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`)
        .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: true }).limit(100);
      if (mounted) setMessages((data || []).filter((m: ChatMessage) => new Date(m.expires_at).getTime() > Date.now()));
    };
    void fetchMessages();
    const channel = supabase.channel(channelTopic(userId, friendId), { config: { private: true } })
      .on("broadcast", { event: "message" }, ({ payload }) => receiveMessage(payload as ChatMessage))
      .subscribe();
    channelRef.current = channel;
    return () => { mounted = false; channelRef.current = null; void supabase.removeChannel(channel); };
  }, [selected, userId, receiveMessage]);

  useEffect(() => {
    const timer = window.setInterval(() => setMessages((current) => current.filter((m) => new Date(m.expires_at).getTime() > Date.now())), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!selected || !body || sending || body.length > 1000) return;
    setSending(true);
    const createdAt = new Date();
    const message: ChatMessage = {
      id: crypto.randomUUID(), sender_id: userId, recipient_id: selected.id, body,
      created_at: createdAt.toISOString(), expires_at: new Date(createdAt.getTime() + Number(expiryHours) * 3600000).toISOString(),
    };
    try {
      const { error } = await (supabase as any).from("chat_messages").insert(message);
      if (error) throw error;
      receiveMessage(message);
      const channel = channelRef.current;
      if (channel) await channel.send({ type: "broadcast", event: "message", payload: message });
      setDraft("");
    } catch (error) {
      console.error("Unable to send chat message", error);
    } finally { setSending(false); }
  };

  const onlineLabel = useMemo(() => "Messages disappear after the selected time", []);

  return (
    <div className="mx-auto grid h-[min(720px,calc(100dvh-10rem))] min-h-[420px] max-w-5xl gap-4 md:grid-cols-[280px_1fr]">
      <Card className={`${selected ? "hidden md:flex" : "flex"} min-h-0 flex-col`}>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Friends</CardTitle></CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-3">
          {loading ? <p className="p-4 text-sm text-muted-foreground">Loading friends…</p> : friends.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Accepted friends will appear here. Add friends from Network.</p> :
            friends.map((friend) => <button key={friend.id} onClick={() => setSelected(friend)} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted ${selected?.id === friend.id ? "bg-muted" : ""}`}>
              <Avatar className="h-10 w-10"><AvatarImage src={friend.avatar_url ? getAvatarUrl(friend.avatar_url) : undefined} /><AvatarFallback>{displayName(friend).slice(0, 1)}</AvatarFallback></Avatar>
              <span className="truncate text-sm font-medium">{displayName(friend)}</span><MessageCircle className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>)}
        </CardContent>
      </Card>
      <Card className={`${selected ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
        {selected ? <>
          <CardHeader className="flex-row items-center gap-3 space-y-0 border-b py-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelected(null)} aria-label="Back to friends"><ArrowLeft className="h-4 w-4" /></Button>
            <Avatar className="h-9 w-9"><AvatarImage src={selected.avatar_url ? getAvatarUrl(selected.avatar_url) : undefined} /><AvatarFallback>{displayName(selected).slice(0, 1)}</AvatarFallback></Avatar>
            <div className="min-w-0"><CardTitle className="truncate text-base">{displayName(selected)}</CardTitle><p className="text-xs text-muted-foreground">{onlineLabel}</p></div>
          </CardHeader>
          <ScrollArea className="min-h-0 flex-1 p-4">
            <div className="space-y-3">{messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hello to {displayName(selected)}.</p>}
              {messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${message.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70"><Clock3 className="h-3 w-3" />{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>)}<div ref={scrollRef} /></div>
          </ScrollArea>
          <div className="border-t p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Auto-delete</span>
              <Select value={expiryHours} onValueChange={setExpiryHours}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">After 1 hour</SelectItem><SelectItem value="24">After 1 day</SelectItem><SelectItem value="168">After 7 days</SelectItem></SelectContent></Select>
            </div>
            <form onSubmit={sendMessage} className="flex gap-2"><Input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} placeholder="Write a message…" maxLength={1000} autoComplete="off" /><Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send message"><Send className="h-4 w-4" /></Button></form>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{draft.length}/1000</p>
          </div>
        </> : <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><MessageCircle className="h-10 w-10 opacity-40" /><p className="text-sm">Choose a friend to start chatting.</p><Badge variant="secondary">Private, real-time chat</Badge></CardContent>}
      </Card>
    </div>
  );
}
