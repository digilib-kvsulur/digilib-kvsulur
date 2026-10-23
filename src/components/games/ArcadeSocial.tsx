import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords, Users, Trophy, Copy, Loader2 } from "lucide-react";
import { GameDef } from "./gameTypes";
import { useToast } from "@/hooks/use-toast";

type ClassStanding = { student_class: string; total_xp: number; students: number };
type Room = { id: string; room_code: string; status: string; game_key: string; winner_id: string | null; expires_at: string };
const VERIFIED_DUEL_GAMES = new Set(["logic-grid", "map-quest", "science-sprint", "code-breakers", "eco-sort"]);

export default function ArcadeSocial({ userId, games, onStartDuel }: { userId: string; games: GameDef[]; onStartDuel: (gameKey: string, roomId: string) => void }) {
  const { toast } = useToast();
  const [standings, setStandings] = useState<ClassStanding[]>([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const onStartRef = useRef(onStartDuel);
  const roomRef = useRef<Room | null>(null);
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
    if (!room?.id) return;
    const channel = supabase.channel(`game_duel_${room.id}`).on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "game_duel_rooms", filter: `id=eq.${room.id}`,
    }, (payload) => trackRoom(payload.new as Room)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [room?.id, trackRoom]);
  useEffect(() => {
    if (!room || !["waiting", "active"].includes(room.status)) return;
    const timer = window.setTimeout(() => setRoom((current) => current?.id === room.id ? { ...current, status: "expired" } : current), Math.max(0, new Date(room.expires_at).getTime() - Date.now()));
    return () => window.clearTimeout(timer);
  }, [room?.id, room?.expires_at, room?.status]);

  const createRoom = async () => {
    if (!selectedGame) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("create_game_duel", { p_game_key: selectedGame });
    setBusy(false);
    const created = Array.isArray(data) ? data[0] : data;
    if (error) toast({ title: "Could not create room", description: error.message, variant: "destructive" });
    else if (created) {
      const nextRoom = { id: created.room_id, room_code: created.room_code, status: "waiting", game_key: selectedGame, winner_id: null, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() };
      roomRef.current = nextRoom;
      setRoom(nextRoom);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("join_game_duel", { p_room_code: roomCode.trim() });
    setBusy(false);
    const joined = Array.isArray(data) ? data[0] : data;
    if (error) toast({ title: "Could not join room", description: error.message, variant: "destructive" });
    else if (joined) trackRoom({ id: joined.room_id, room_code: roomCode.trim().toUpperCase(), status: "active", game_key: joined.game_key, winner_id: null, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() });
  };

  return <div className="grid gap-4 lg:grid-cols-2">
    <Card className="overflow-hidden rounded-2xl border-violet-500/20">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" /> Class Challenge <Badge variant="secondary" className="ml-auto">This week</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Classes earn XP together whenever students clear a game. See the weekly standings below.</p>
        {standings.length ? standings.slice(0, 5).map((entry, index) => <div key={entry.student_class} className="flex items-center gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"}`}>{index + 1}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">Class {entry.student_class}</span><span className="font-bold tabular-nums">{Number(entry.total_xp).toLocaleString()} XP</span></div><p className="text-[11px] text-muted-foreground">{entry.students} students</p></div></div>) : <p className="py-4 text-center text-sm text-muted-foreground">No class activity yet this week. Start the first streak!</p>}
        <Button size="sm" variant="outline" className="w-full" onClick={() => void loadStandings()}><Users className="mr-2 h-4 w-4" /> Refresh standings</Button>
      </CardContent>
    </Card>
    <Card className="overflow-hidden rounded-2xl border-sky-500/20">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Swords className="h-4 w-4 text-sky-600" /> Head-to-head</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Challenge a friend in the same game. Compare scores after your verified rounds.</p>
        <Select value={selectedGame} onValueChange={setSelectedGame}><SelectTrigger aria-label="Choose a game for your duel"><SelectValue placeholder="Choose a game" /></SelectTrigger><SelectContent>{gameChoices.map((g) => <SelectItem key={g.key} value={g.key}>{g.name}</SelectItem>)}</SelectContent></Select>
        <Button className="w-full" onClick={() => void createRoom()} disabled={busy || !selectedGame || !!room && !["completed", "expired", "cancelled"].includes(room.status)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Swords className="mr-2 h-4 w-4" />}Create room</Button>
        <div className="flex gap-2"><Input aria-label="Room code" placeholder="Enter 6-character code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={6} /><Button variant="outline" onClick={() => void joinRoom()} disabled={busy || roomCode.trim().length < 6}>Join</Button></div>
        {room && <div className="rounded-xl bg-muted/60 p-3 text-sm"><div className="flex items-center justify-between"><span className="font-semibold">{room.status === "waiting" ? "Waiting for a friend" : room.status === "completed" ? "Duel complete" : room.status === "expired" ? "Room expired" : "Match starting"}</span><Badge variant={room.status === "completed" ? "default" : "secondary"}>{room.status}</Badge></div>{room.status === "waiting" && <div className="mt-2 flex items-center justify-between"><span className="font-mono text-lg font-bold tracking-[0.25em]">{room.room_code}</span><Button size="icon" variant="ghost" aria-label="Copy room code" onClick={() => void navigator.clipboard.writeText(room.room_code)}><Copy className="h-4 w-4" /></Button></div>}{room.status === "completed" && <p className="mt-1 text-xs text-muted-foreground">{room.winner_id ? room.winner_id === userId ? "You won this duel!" : "Your friend won this duel." : "It's a tie!"}</p>}</div>}
      </CardContent>
    </Card>
  </div>;
}
