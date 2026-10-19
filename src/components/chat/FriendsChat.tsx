import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3, MessageCircle, Plus, Send, Users, X } from "lucide-react";
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
type GroupMessage = { id: string; sender_id: string; name: string; body: string; created_at: string };

const channelTopic = (a: string, b: string) => `friends-chat:${[a, b].sort().join(":")}`;
const displayName = (friend: Friend) => `${friend.first_name || ""} ${friend.last_name || ""}`.trim() || "Friend";
const groupTopic = "friends-group:online";

export default function FriendsChat({ userId }: { userId: string }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recentFriendIds, setRecentFriendIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [groupMode, setGroupMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [expiryHours, setExpiryHours] = useState("24");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const channelRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadFriends = useCallback(async () => {
    const { data: relations } = await supabase.from("friendships").select("requester_id, addressee_id")
      .eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    const ids = [...new Set((relations || []).map((r: any) => r.requester_id === userId ? r.addressee_id : r.requester_id))];
    if (!ids.length) { setFriends([]); setRecentFriendIds([]); setLoading(false); return; }
    const [{ data: profiles }, { data: recentMessages }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", ids),
      (supabase as any).from("chat_messages").select("sender_id, recipient_id")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(100),
    ]);
    const recents = [...new Set((recentMessages || []).map((m: any) => m.sender_id === userId ? m.recipient_id : m.sender_id))];
    setFriends((profiles || []) as Friend[]);
    setRecentFriendIds(recents);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadFriends(); }, [loadFriends]);

  const receiveMessage = useCallback((incoming: ChatMessage) => {
    if (!incoming?.id || new Date(incoming.expires_at).getTime() <= Date.now()) return;
    setMessages((current) => current.some((m) => m.id === incoming.id) ? current : [...current, incoming].slice(-100));
    const peerId = incoming.sender_id === userId ? incoming.recipient_id : incoming.sender_id;
    setRecentFriendIds((current) => [peerId, ...current.filter((id) => id !== peerId)]);
  }, [userId]);

  useEffect(() => {
    if (!selected || groupMode) { setMessages([]); return; }
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
  }, [selected, groupMode, userId, receiveMessage]);

  useEffect(() => {
    if (!groupMode) { setOnlineCount(0); return; }
    let mounted = true;
    let userProfile = { name: "Student", avatar_url: null as string | null };
    const channel = supabase.channel(groupTopic, { config: { private: true, presence: { key: userId } } });
    channel
      .on("presence", { event: "sync" }, () => {
        if (mounted) setOnlineCount(Object.keys(channel.presenceState()).length);
      })
      .on("broadcast", { event: "group_message" }, ({ payload }) => {
        const message = payload as GroupMessage;
        if (!message?.id || message.sender_id === userId) return;
        setGroupMessages((current) => current.some((m) => m.id === message.id) ? current : [...current, message].slice(-200));
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        const { data } = await supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", userId).maybeSingle();
        userProfile = { name: data ? `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Student" : "Student", avatar_url: data?.avatar_url || null };
        await channel.track({ user_id: userId, ...userProfile });
      });
    channelRef.current = channel;
    return () => { mounted = false; channelRef.current = null; void supabase.removeChannel(channel); };
  }, [groupMode, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => setMessages((current) => current.filter((m) => new Date(m.expires_at).getTime() > Date.now())), 15000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, groupMessages]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || body.length > 1000) return;
    setSending(true);
    const createdAt = new Date();
    try {
      if (groupMode) {
        const { data } = await supabase.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle();
        const message: GroupMessage = {
          id: crypto.randomUUID(), sender_id: userId,
          name: data ? `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Student" : "Student",
          body, created_at: createdAt.toISOString(),
        };
        setGroupMessages((current) => [...current, message].slice(-200));
        if (channelRef.current) await channelRef.current.send({ type: "broadcast", event: "group_message", payload: message });
      } else {
        if (!selected) return;
        const message: ChatMessage = {
          id: crypto.randomUUID(), sender_id: userId, recipient_id: selected.id, body,
          created_at: createdAt.toISOString(), expires_at: new Date(createdAt.getTime() + Number(expiryHours) * 3600000).toISOString(),
        };
        const { error } = await (supabase as any).from("chat_messages").insert(message);
        if (error) throw error;
        receiveMessage(message);
        if (channelRef.current) await channelRef.current.send({ type: "broadcast", event: "message", payload: message });
      }
      setDraft("");
    } catch (error) { console.error("Unable to send chat message", error); }
    finally { setSending(false); }
  };

  const visibleFriends = useMemo(() => friends.filter((friend) => recentFriendIds.includes(friend.id) || selected?.id === friend.id), [friends, recentFriendIds, selected]);
  const matchingFriends = useMemo(() => friends.filter((friend) => displayName(friend).toLowerCase().includes(friendSearch.trim().toLowerCase())), [friends, friendSearch]);
  const activeMessages = groupMode ? groupMessages : messages;

  return (
    <div className="mx-auto grid h-[min(720px,calc(100dvh-10rem))] min-h-[420px] max-w-5xl gap-4 md:grid-cols-[280px_1fr]">
      <Card className={`${selected || groupMode ? "hidden md:flex" : "flex"} min-h-0 flex-col`}>
        <CardHeader className="gap-3 pb-3">
          <div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Chats</CardTitle>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => { setNewMessageOpen(true); setFriendSearch(""); }}><Plus className="h-3.5 w-3.5" /> New message</Button>
          </div>
          <button type="button" onClick={() => { setSelected(null); setGroupMode(true); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-muted ${groupMode ? "border-primary bg-primary/5" : "border-border"}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><Users className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Everyone online</span><span className="block text-xs text-muted-foreground">Live group chat</span></span>
            <Badge variant="secondary" className="shrink-0">{onlineCount} online</Badge>
          </button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-3">
          <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent chats</p>
          {loading ? <p className="p-3 text-sm text-muted-foreground">Loading chats…</p> : visibleFriends.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No chats yet. Choose New message to start one.</p> :
            visibleFriends.map((friend) => <button key={friend.id} onClick={() => { setGroupMode(false); setSelected(friend); }} className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted ${selected?.id === friend.id && !groupMode ? "bg-muted" : ""}`}>
              <Avatar className="h-10 w-10"><AvatarImage src={friend.avatar_url ? getAvatarUrl(friend.avatar_url) : undefined} /><AvatarFallback>{displayName(friend).slice(0, 1)}</AvatarFallback></Avatar>
              <span className="truncate text-sm font-medium">{displayName(friend)}</span><MessageCircle className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>)}
        </CardContent>
      </Card>

      <Card className={`${selected || groupMode ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
        {groupMode ? <>
          <CardHeader className="flex-row items-center gap-3 space-y-0 border-b py-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setGroupMode(false)} aria-label="Back to chats"><ArrowLeft className="h-4 w-4" /></Button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white"><Users className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><CardTitle className="text-base">Everyone online</CardTitle><p className="text-xs text-muted-foreground">Ephemeral room · messages are not saved</p></div>
            <Badge variant="secondary">{onlineCount} online</Badge>
          </CardHeader>
          <ScrollArea className="min-h-0 flex-1 p-4"><div className="space-y-3">
            {groupMessages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Join the conversation with everyone online.</p>}
            {groupMessages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${message.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {message.sender_id !== userId && <p className="mb-1 text-[11px] font-semibold opacity-75">{message.name}</p>}<p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
              <p className="mt-1 text-right text-[10px] opacity-70">{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div></div>)}<div ref={scrollRef} /></div></ScrollArea>
          <div className="border-t p-3"><form onSubmit={sendMessage} className="flex gap-2"><Input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} placeholder="Message everyone online…" maxLength={1000} autoComplete="off" /><Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send group message"><Send className="h-4 w-4" /></Button></form></div>
        </> : selected ? <>
          <CardHeader className="flex-row items-center gap-3 space-y-0 border-b py-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelected(null)} aria-label="Back to chats"><ArrowLeft className="h-4 w-4" /></Button>
            <Avatar className="h-9 w-9"><AvatarImage src={selected.avatar_url ? getAvatarUrl(selected.avatar_url) : undefined} /><AvatarFallback>{displayName(selected).slice(0, 1)}</AvatarFallback></Avatar>
            <div className="min-w-0"><CardTitle className="truncate text-base">{displayName(selected)}</CardTitle><p className="text-xs text-muted-foreground">Private · messages disappear automatically</p></div>
          </CardHeader>
          <ScrollArea className="min-h-0 flex-1 p-4"><div className="space-y-3">{messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hello to {displayName(selected)}.</p>}
            {messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${message.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p><p className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70"><Clock3 className="h-3 w-3" />{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div></div>)}<div ref={scrollRef} /></div></ScrollArea>
          <div className="border-t p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Auto-delete</span>
            <Select value={expiryHours} onValueChange={setExpiryHours}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">After 1 hour</SelectItem><SelectItem value="24">After 1 day</SelectItem><SelectItem value="168">After 7 days</SelectItem></SelectContent></Select>
          </div><form onSubmit={sendMessage} className="flex gap-2"><Input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} placeholder="Write a message…" maxLength={1000} autoComplete="off" /><Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send message"><Send className="h-4 w-4" /></Button></form>
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{draft.length}/1000</p></div>
        </> : <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><MessageCircle className="h-10 w-10 opacity-40" /><p className="text-sm">Choose a chat or start a new message.</p><Badge variant="secondary">Private, real-time chat</Badge></CardContent>}
      </Card>

      {newMessageOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setNewMessageOpen(false); }}>
        <Card className="flex max-h-[min(600px,85dvh)] w-full max-w-md flex-col shadow-2xl" role="dialog" aria-modal="true" aria-label="Start a new message">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3"><div><CardTitle className="text-lg">New message</CardTitle><p className="mt-1 text-xs text-muted-foreground">Choose one of your accepted friends.</p></div><Button variant="ghost" size="icon" onClick={() => setNewMessageOpen(false)} aria-label="Close"><X className="h-4 w-4" /></Button></CardHeader>
          <CardContent className="flex min-h-0 flex-col gap-3"><Input value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} placeholder="Search friends…" autoFocus />
            <ScrollArea className="min-h-0 flex-1"><div className="space-y-1">{matchingFriends.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">No matching friends.</p> : matchingFriends.map((friend) => <button key={friend.id} onClick={() => { setSelected(friend); setGroupMode(false); setRecentFriendIds((current) => current.includes(friend.id) ? current : [friend.id, ...current]); setNewMessageOpen(false); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted">
              <Avatar className="h-10 w-10"><AvatarImage src={friend.avatar_url ? getAvatarUrl(friend.avatar_url) : undefined} /><AvatarFallback>{displayName(friend).slice(0, 1)}</AvatarFallback></Avatar><span className="flex-1 truncate text-sm font-medium">{displayName(friend)}</span><MessageCircle className="h-4 w-4 text-muted-foreground" />
            </button>)}</div></ScrollArea>
          </CardContent>
        </Card>
      </div>}
    </div>
  );
}
