import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords, Users, Trophy, Copy, Loader2, Send, Check, X, Circle } from "lucide-react";
import { GameDef } from "./gameTypes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

type ClassStanding = { student_class: string; total_xp: number; students: number };
type Room = { id: string; room_code: string; status: string; game_key: string; winner_id: string | null; expires_at: string };
type OnlineStudent = { user_id: string; name: string };
type DuelInvite = { room_code: string; game_key: string; game_name: string; inviter_name: string };
const VERIFIED_DUEL_GAMES = new Set(["logic-grid", "map-quest", "science-sprint", "code-breakers", "eco-sort", "ping-pong", "snake", "tic-tac-toe", "snakes-ladders"]);
const ONLINE_TOPIC = "arcade_online_students";

export default function ArcadeSocial({ userId, games, onStartDuel }: { userId: string; games: GameDef[]; onStartDuel: (gameKey: string, roomId: string) => void }) {
  const { toast } = useToast();
  const location = useLocation();
  const [standings, setStandings] = useState<ClassStanding[]>([]);
  const [online, setOnline] = useState<OnlineStudent[]>([]);
  const [invite, setInvite] = useState<DuelInvite | null>(null);
  const [selectedGame, setSelectedGame] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const onStartRef = useRef(onStartDuel);
  const roomRef = useRef<Room | null>(null);
  const nameRef = useRef("Student");
  useEffect(() => { onStartRef.current = onStartDuel; }, [onStartDuel]);
  const gameChoices = useMemo(() => games.filter((g) => g.is_enabled && VERIFIED_DUEL_GAMES.has(g.key)), [games]);

  const loadStandings = useCallback(async () => {
    const { data } = await (supabase as any).rpc("get_game_weekly_class_standings");
    setStandings((data || []) as ClassStanding[]);
  }, []);

  const trackRoom = useCallback((next: Room) => {
    const previous = roomRef.current;
    roomRef.current = next;
    setRoom(next);
    if (next.status === "active" && (previous?.id !== next.id || previous.status !== "active")) onStartRef.current(next.game_key, next.id);
  }, []);

  useEffect(() => { void loadStandings(); }, [loadStandings]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCodeFromLink = params.get("duel_invite");
    if (!roomCodeFromLink) return;
    setInvite({ room_code: roomCodeFromLink.toUpperCase(), game_key: "", game_name: "Head-to-head", inviter_name: "A student" });
    params.delete("duel_invite");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [location.search]);
  useEffect(() => {
    let mounted = true;
    let presenceChannel: ReturnType<typeof supabase.channel> | undefined;
    let inviteChannel: ReturnType<typeof supabase.channel> | undefined;
    const connect = async () => {
      const { data: profile } = await supabase.from("profiles").select("first_name,last_name").eq("id", userId).maybeSingle();
      const displayName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Student";
      if (!mounted) return;
      nameRef.current = displayName;
      presenceChannel = supabase.channel(ONLINE_TOPIC, { config: { presence: { key: userId } } });
      presenceChannel.on("presence", { event: "sync" }, () => {
        const entries = Object.values(presenceChannel!.presenceState()).flatMap((items) => items as OnlineStudent[]);
        setOnline(entries.filter((entry) => entry.user_id !== userId).reduce<OnlineStudent[]>((list, entry) => {
          if (!list.some((student) => student.user_id === entry.user_id)) list.push(entry);
          return list;
        }, []));
      }).subscribe(async (status) => {
        if (status === "SUBSCRIBED") await presenceChannel!.track({ user_id: userId, name: displayName });
      });
      inviteChannel = supabase.channel(`arcade_invites_${userId}`);
      inviteChannel.on("broadcast", { event: "duel_invite" }, ({ payload }) => {
        if (payload?.room_code && payload?.game_key && payload?.inviter_id !== userId) setInvite(payload as DuelInvite);
      }).subscribe();
    };
    void connect();
    return () => {
      mounted = false;
      if (presenceChannel) void supabase.removeChannel(presenceChannel);
      if (inviteChannel) void supabase.removeChannel(inviteChannel);
    };
  }, [userId]);

  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase.channel(`game_duel_${room.id}`).on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "game_duel_rooms", filter: `id=eq.${room.id}`,
    }, (payload) => trackRoom(payload.new as Room)).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { data } = await (supabase as any).from("game_duel_rooms").select("id,room_code,status,game_key,winner_id,expires_at").eq("id", room.id).maybeSingle();
        if (data) trackRoom(data as Room);
      }
    });
    return () => { void supabase.removeChannel(channel); };
  }, [room?.id, trackRoom]);
  useEffect(() => {
    if (!room || !["waiting", "active"].includes(room.status)) return;
    const timer = window.setTimeout(() => setRoom((current) => current?.id === room.id ? { ...current, status: "expired" } : current), Math.max(0, new Date(room.expires_at).getTime() - Date.now()));
    return () => window.clearTimeout(timer);
  }, [room?.id, room?.expires_at, room?.status]);

  const createRoom = async () => {
    if (!selectedGame) throw new Error("Choose a game first.");
    const { data, error } = await (supabase as any).rpc("create_game_duel", { p_game_key: selectedGame });
    const created = Array.isArray(data) ? data[0] : data;
    if (error || !created) throw error || new Error("Could not create a duel room.");
    const nextRoom: Room = { id: created.room_id, room_code: created.room_code, status: "waiting", game_key: selectedGame, winner_id: null, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() };
    roomRef.current = nextRoom;
    setRoom(nextRoom);
    return nextRoom;
  };

  const inviteStudent = async (student: OnlineStudent) => {
    if (!selectedGame || busy) return;
    setBusy(true);
    try {
      const activeRoom = roomRef.current && roomRef.current.game_key === selectedGame && roomRef.current.status === "waiting" ? roomRef.current : await createRoom();
      const gameName = gameChoices.find((game) => game.key === selectedGame)?.name || "a game";
      const recipient = supabase.channel(`arcade_invites_${student.user_id}`).on("broadcast", { event: "duel_invite" }, () => undefined);
      const subscribed = await new Promise<boolean>((resolve) => {
        recipient.on("broadcast", { event: "unused" }, () => undefined).subscribe((status) => {
          if (status === "SUBSCRIBED") resolve(true);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") resolve(false);
        });
      });
      if (!subscribed) throw new Error("Could not reach that player. Try again in a moment.");
      const { error } = await recipient.send({ type: "broadcast", event: "duel_invite", payload: { room_code: activeRoom.room_code, game_key: selectedGame, game_name: gameName, inviter_name: nameRef.current, inviter_id: userId } });
      await supabase.removeChannel(recipient);
      if (error) throw error;
      const { data: pushResult, error: pushError } = await supabase.functions.invoke("send-game-duel-invite", {
        body: { room_code: activeRoom.room_code, recipient_id: student.user_id },
      });
      const pushMessage = pushError
        ? "The live invite was sent, but the push notification could not be delivered."
        : pushResult?.sent > 0
          ? `A push notification was sent to ${pushResult.sent} device${pushResult.sent === 1 ? "" : "s"}.`
          : "The live invite was sent. This player has no registered push device.";
      toast({ title: `Invite sent to ${student.name}`, description: pushMessage });
    } catch (error: any) {
      toast({ title: "Invite could not be sent", description: error?.message || "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const joinRoom = async (code = roomCode.trim()) => {
    if (!code) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("join_game_duel", { p_room_code: code });
    setBusy(false);
    const joined = Array.isArray(data) ? data[0] : data;
    if (error) toast({ title: "Could not join room", description: error.message, variant: "destructive" });
    else if (joined) {
      trackRoom({ id: joined.room_id, room_code: code.toUpperCase(), status: "active", game_key: joined.game_key, winner_id: null, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() });
      setInvite(null);
    }
  };

  return <div className="grid gap-4 lg:grid-cols-2">
    {invite && <Card role="status" className="border-sky-500/40 bg-sky-500/5 lg:col-span-2"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-500/10 text-sky-700"><Swords className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold">{invite.inviter_name || "A player"} invited you!</p><p className="text-sm text-muted-foreground">Join a {invite.game_name || "head-to-head"} duel?</p></div><div className="flex gap-2"><Button onClick={() => void joinRoom(invite.room_code)} disabled={busy}><Check className="mr-1 h-4 w-4" />Join duel</Button><Button variant="ghost" onClick={() => setInvite(null)} aria-label="Dismiss invite"><X className="h-4 w-4" /></Button></div></CardContent></Card>}
    <Card className="overflow-hidden rounded-2xl border-violet-500/20">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" /> Class Challenge <Badge variant="secondary" className="ml-auto">This week</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Classes earn XP together whenever students clear a game. See the weekly standings below.</p>
        {standings.length ? standings.slice(0, 5).map((entry, index) => <div key={entry.student_class} className="flex items-center gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">Class {entry.student_class}</span><span className="font-bold tabular-nums">{Number(entry.total_xp).toLocaleString()} XP</span></div><p className="text-[11px] text-muted-foreground">{entry.students} students</p></div></div>) : <p className="py-4 text-center text-sm text-muted-foreground">No class activity yet this week. Start the first streak!</p>}
        <Button size="sm" variant="outline" className="w-full" onClick={() => void loadStandings()}><Users className="mr-2 h-4 w-4" /> Refresh standings</Button>
      </CardContent>
    </Card>
    <Card className="overflow-hidden rounded-2xl border-sky-500/20">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Swords className="h-4 w-4 text-sky-600" /> Head-to-head <Badge variant="secondary" className="ml-auto"><Circle className="mr-1 h-2 w-2 fill-emerald-500 text-emerald-500" />{online.length} online</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Invite someone playing right now, or share a room code with a friend.</p>
        <Select value={selectedGame} onValueChange={setSelectedGame}><SelectTrigger aria-label="Choose a game for your duel"><SelectValue placeholder="Choose a game" /></SelectTrigger><SelectContent>{gameChoices.map((g) => <SelectItem key={g.key} value={g.key}>{g.name}</SelectItem>)}</SelectContent></Select>
        {online.length > 0 ? <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2" aria-label="Online players">{online.map((student) => <div key={student.user_id} className="flex items-center gap-2 rounded-lg px-2 py-1.5"><Circle className="h-2 w-2 shrink-0 fill-emerald-500 text-emerald-500" /><span className="min-w-0 flex-1 truncate text-sm">{student.name || "Student"}</span><Button size="sm" variant="outline" onClick={() => void inviteStudent(student)} disabled={busy || !selectedGame}><Send className="mr-1 h-3.5 w-3.5" />Invite</Button></div>)}</div> : <p className="rounded-xl bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">No other players online right now. Create a room and share the code.</p>}
        <div className="flex gap-2"><Input aria-label="Room code" placeholder="Enter 6-character code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={6} /><Button variant="outline" onClick={() => void joinRoom()} disabled={busy || roomCode.trim().length < 6}>Join</Button></div>
        {room && <div className="rounded-xl bg-muted/60 p-3 text-sm"><div className="flex items-center justify-between"><span className="font-semibold">{room.status === "waiting" ? "Waiting for a friend" : room.status === "completed" ? "Duel complete" : room.status === "expired" ? "Room expired" : "Match starting"}</span><Badge variant={room.status === "completed" ? "default" : "secondary"}>{room.status}</Badge></div>{room.status === "waiting" && <div className="mt-2 flex items-center justify-between"><span className="font-mono text-lg font-bold tracking-[0.25em]">{room.room_code}</span><Button size="icon" variant="ghost" aria-label="Copy room code" onClick={() => void navigator.clipboard.writeText(room.room_code)}><Copy className="h-4 w-4" /></Button></div>}{room.status === "completed" && <p className="mt-1 text-xs text-muted-foreground">{room.winner_id ? room.winner_id === userId ? "You won this duel!" : "Your friend won this duel." : "It's a tie!"}</p>}</div>}
      </CardContent>
    </Card>
  </div>;
}
