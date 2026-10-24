import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dices, Loader2, RotateCcw, Swords } from "lucide-react";

type DuelState = {
  id: string; game_key: string; status: string; host_id: string; guest_id: string;
  turn_user_id: string | null; winner_id: string | null; board_state: Record<string, any>;
};
const LADDERS: Record<number, number> = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 };
const SNAKES: Record<number, number> = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 99: 78 };

export default function LiveArcadeBoard({ gameKey, roomId, userId, onExit }: { gameKey: string; roomId: string; userId: string; onExit: () => void }) {
  const { toast } = useToast();
  const [room, setRoom] = useState<DuelState | null>(null);
  const [busy, setBusy] = useState(false);
  const loadRoom = useCallback(async () => {
    const { data, error } = await (supabase as any).from("game_duel_rooms")
      .select("id,game_key,status,host_id,guest_id,turn_user_id,winner_id,board_state")
      .eq("id", roomId).maybeSingle();
    if (error) toast({ title: "Could not load match", description: error.message, variant: "destructive" });
    else if (data) setRoom(data as DuelState);
  }, [roomId, toast]);
  useEffect(() => {
    const channel = supabase.channel(`arcade_board_${roomId}`).on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "game_duel_rooms", filter: `id=eq.${roomId}`,
    }, (payload) => setRoom(payload.new as DuelState)).subscribe((status) => {
      if (status === "SUBSCRIBED") void loadRoom();
    });
    return () => { void supabase.removeChannel(channel); };
  }, [roomId, loadRoom]);

  const play = async (action: Record<string, unknown>) => {
    if (busy || !room || room.status !== "active" || room.turn_user_id !== userId) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("play_game_duel_turn", { p_room_id: roomId, p_action: action });
    setBusy(false);
    const next = Array.isArray(data) ? data[0] : data;
    if (error) toast({ title: "Move not accepted", description: error.message, variant: "destructive" });
    else if (next) setRoom((current) => current ? { ...current, ...next } : current);
  };
  const isMyTurn = room?.status === "active" && room.turn_user_id === userId;
  const winnerText = room?.status === "completed"
    ? room.winner_id === userId ? "You win!" : room.winner_id ? "Your friend wins this round." : "It's a draw!"
    : isMyTurn ? "Your turn" : "Waiting for your friend…";

  const ladderCells = useMemo(() => Array.from({ length: 100 }, (_, i) => {
    const row = 9 - Math.floor(i / 10), col = i % 10;
    return row % 2 === 0 ? row * 10 + col + 1 : row * 10 + 10 - col;
  }), []);

  if (!room) return <div className="grid min-h-60 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return <div className="mx-auto max-w-xl space-y-4 text-center">
    <div><Badge variant="secondary" className="mb-2"><Swords className="mr-1 h-3 w-3" />Live head-to-head</Badge><h3 className="text-xl font-bold">{gameKey === "tic-tac-toe" ? "Tic-Tac-Toe" : "Snakes & Ladders"}</h3><p aria-live="polite" className="text-sm text-muted-foreground">{winnerText}</p></div>
    {gameKey === "tic-tac-toe" ? <div className="mx-auto grid max-w-[270px] grid-cols-3 gap-2">{(room.board_state?.board || Array(9).fill("")).map((mark: string, index: number) => <button key={index} type="button" aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ", empty"}`} onClick={() => void play({ type: "place", index })} disabled={!isMyTurn || !!mark || room.status !== "active" || busy} className="grid aspect-square place-items-center rounded-2xl border-2 bg-card text-4xl font-black shadow-sm transition hover:bg-muted disabled:cursor-default"><span className={mark === "X" ? "text-violet-600" : "text-sky-600"}>{mark}</span></button>)}</div> : <>
      <div className="grid grid-cols-10 overflow-hidden rounded-xl border bg-amber-50">{ladderCells.map((number) => { const positions = room.board_state?.players || {}; const host = Number(positions.host) === number, guest = Number(positions.guest) === number; return <div key={number} className={`relative grid aspect-square place-items-center border-[0.5px] border-amber-200 text-[9px] font-semibold sm:text-xs ${number % 2 ? "bg-amber-100" : "bg-white"}`}><span>{number}</span>{LADDERS[number] && <span className="absolute right-0 top-0 text-[7px] text-emerald-700 sm:text-[8px]">↗{LADDERS[number]}</span>}{SNAKES[number] && <span className="absolute right-0 top-0 text-[7px] text-rose-600 sm:text-[8px]">↘{SNAKES[number]}</span>}{host && <span className="absolute bottom-0 left-0 z-10 h-3 w-3 rounded-full border border-white bg-violet-600 sm:h-5 sm:w-5" title="Host" />}{guest && <span className="absolute bottom-0 right-0 z-10 h-3 w-3 rounded-full border border-white bg-sky-500 sm:h-5 sm:w-5" title="Guest" />}</div>; })}</div>
      <div className="flex justify-center gap-4 text-xs"><span className="text-violet-700">● You: {Number(room.board_state?.players?.[room.host_id === userId ? "host" : "guest"]) || 0}</span><span className="text-sky-700">● Friend: {Number(room.board_state?.players?.[room.host_id === userId ? "guest" : "host"]) || 0}</span></div>
      {room.board_state?.last_roll && <p className="text-sm text-muted-foreground">Last roll: {room.board_state.last_roll}</p>}
      <p className="text-xs text-muted-foreground">Exactly 100 wins. Rolling past 100 leaves your piece in place.</p>
      <Button onClick={() => void play({ type: "roll" })} disabled={!isMyTurn || busy || room.status !== "active"}><Dices className="mr-2 h-4 w-4" />{busy ? "Rolling…" : "Roll dice"}</Button>
    </>}
    {room.status === "completed" && <Card><CardContent className="space-y-2 p-4"><p className="font-semibold">{winnerText}</p><p className="text-xs text-muted-foreground">Nice match! Invite a friend for another round from Head-to-head.</p></CardContent></Card>}
    {room.status === "expired" && <Card><CardContent className="p-4 text-sm">This match expired before it finished. Start a new room for another game.</CardContent></Card>}
    <Button variant="ghost" onClick={onExit}>{room.status === "active" ? "Leave match" : "Back to arcade"}</Button>
  </div>;
}
