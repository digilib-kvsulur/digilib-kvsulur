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
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<{ from: string; to: string; promotion?: string }[]>([]);
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
  const chessRequest = async (payload: Record<string, unknown>) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("chess-duel", { body: { room_id: roomId, ...payload } });
    setBusy(false);
    if (error || data?.error) {
      toast({ title: "Chess move not accepted", description: data?.error || error?.message || "Please try again.", variant: "destructive" });
      return null;
    }
    return data;
  };
  const selectChessSquare = async (square: string, piece: string) => {
    if (!isMyTurn || busy) return;
    if (selectedSquare && legalMoves.some((move) => move.to === square)) {
      const move = legalMoves.find((candidate) => candidate.to === square && (!candidate.promotion || candidate.promotion === "q"));
      if (move) {
        const result = await chessRequest({ action: "move", from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
        if (result) setRoom((current) => current ? { ...current, ...result } : current);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }
    const isWhitePiece = piece !== "" && piece === piece.toUpperCase();
    const isPlayersPiece = piece !== "" && (room?.host_id === userId ? isWhitePiece : !isWhitePiece);
    if (!isPlayersPiece) { setSelectedSquare(null); setLegalMoves([]); return; }
    setSelectedSquare(square);
    const result = await chessRequest({ action: "legal_moves", from: square });
    setLegalMoves(result?.moves || []);
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
    <div><Badge variant="secondary" className="mb-2"><Swords className="mr-1 h-3 w-3" />Live head-to-head</Badge><h3 className="text-xl font-bold">{gameKey === "tic-tac-toe" ? "Tic-Tac-Toe" : gameKey === "ludo-dash" ? "Ludo Dash" : gameKey === "chess" ? "Chess" : "Snakes & Ladders"}</h3><p aria-live="polite" className="text-sm text-muted-foreground">{winnerText}</p></div>
    {gameKey === "chess" ? (() => {
      const fen = String(room.board_state?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      const rows = fen.split(" ")[0].split("/").map((rank) => rank.split("").flatMap((char) => /[1-8]/.test(char) ? Array(Number(char)).fill("") : [char]));
      const rotated = room.host_id !== userId;
      const squares = rows.flatMap((rank, row) => rank.map((piece, col) => ({ piece, square: `${String.fromCharCode(97 + col)}${8 - row}` })));
      if (rotated) squares.reverse();
      const glyph: Record<string, string> = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙", k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
      const lastMove = room.board_state?.last_move;
      return <div className="space-y-3">
        <div className="mx-auto grid aspect-square w-full max-w-[min(88vw,440px)] grid-cols-8 overflow-hidden rounded-2xl border-4 border-amber-950/80 shadow-lg" role="grid" aria-label="Chess board">
          {squares.map(({ piece, square }) => {
            const [file, rank] = square;
            const dark = (file.charCodeAt(0) - 97 + Number(rank)) % 2 === 0;
            const target = legalMoves.some((move) => move.to === square);
            const highlighted = selectedSquare === square || lastMove?.from === square || lastMove?.to === square;
            return <button key={square} type="button" role="gridcell" aria-label={`${square}${piece ? ` ${piece === piece.toUpperCase() ? "white" : "black"} ${({ k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" } as Record<string,string>)[piece.toLowerCase()]}` : " empty"}${target ? ", legal move" : ""}`} onClick={() => void selectChessSquare(square, piece)} disabled={!isMyTurn || busy || room.status !== "active"} className={`relative grid aspect-square place-items-center text-[clamp(1.45rem,8vw,3.15rem)] leading-none disabled:cursor-default ${dark ? "bg-amber-700" : "bg-amber-100"} ${highlighted ? "ring-4 ring-inset ring-yellow-300/90" : ""}`}>
              {piece && <span className={piece === piece.toUpperCase() ? "text-white [text-shadow:0_2px_3px_rgba(0,0,0,.7)]" : "text-slate-900 [text-shadow:0_1px_1px_rgba(255,255,255,.35)]"}>{glyph[piece]}</span>}
              {!piece && target && <span className="absolute h-3 w-3 rounded-full bg-emerald-800/60 sm:h-4 sm:w-4" />}
              {piece && target && <span className="absolute inset-0 rounded-full border-[3px] border-emerald-800/65" />}
              <span className={`absolute bottom-0.5 left-0.5 text-[8px] font-bold opacity-70 sm:text-[10px] ${dark ? "text-amber-50" : "text-amber-950"}`}>{square}</span>
            </button>;
          })}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground"><Badge variant="outline">White · {room.host_id === userId ? "You" : "Friend"}</Badge><Badge variant="outline">Black · {room.guest_id === userId ? "You" : "Friend"}</Badge><span>Tap a piece, then a highlighted square. Promotions become queens.</span></div>
        {room.board_state?.reason && <p className="font-semibold capitalize">{room.board_state.reason}</p>}
        {room.board_state?.last_move?.san && <p className="text-xs text-muted-foreground">Last move: {room.board_state.last_move.san}</p>}
      </div>;
    })() : null}
    {gameKey === "chess" ? null : gameKey === "tic-tac-toe" ? <div className="mx-auto grid max-w-[270px] grid-cols-3 gap-2">{(room.board_state?.board || Array(9).fill("")).map((mark: string, index: number) => <button key={index} type="button" aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ", empty"}`} onClick={() => void play({ type: "place", index })} disabled={!isMyTurn || !!mark || room.status !== "active" || busy} className="grid aspect-square place-items-center rounded-2xl border-2 bg-card text-4xl font-black shadow-sm transition hover:bg-muted disabled:cursor-default"><span className={mark === "X" ? "text-violet-600" : "text-sky-600"}>{mark}</span></button>)}</div> : gameKey === "snakes-ladders" ? <>
      <div className="grid grid-cols-10 overflow-hidden rounded-xl border bg-amber-50">{ladderCells.map((number) => { const positions = room.board_state?.players || {}; const host = Number(positions.host) === number, guest = Number(positions.guest) === number; return <div key={number} className={`relative grid aspect-square place-items-center border-[0.5px] border-amber-200 text-[9px] font-semibold sm:text-xs ${number % 2 ? "bg-amber-100" : "bg-white"}`}><span>{number}</span>{LADDERS[number] && <span className="absolute right-0 top-0 text-[7px] text-emerald-700 sm:text-[8px]">↗{LADDERS[number]}</span>}{SNAKES[number] && <span className="absolute right-0 top-0 text-[7px] text-rose-600 sm:text-[8px]">↘{SNAKES[number]}</span>}{host && <span className="absolute bottom-0 left-0 z-10 h-3 w-3 rounded-full border border-white bg-violet-600 sm:h-5 sm:w-5" title="Host" />}{guest && <span className="absolute bottom-0 right-0 z-10 h-3 w-3 rounded-full border border-white bg-sky-500 sm:h-5 sm:w-5" title="Guest" />}</div>; })}</div>
      <div className="flex justify-center gap-4 text-xs"><span className="text-violet-700">● You: {Number(room.board_state?.players?.[room.host_id === userId ? "host" : "guest"]) || 0}</span><span className="text-sky-700">● Friend: {Number(room.board_state?.players?.[room.host_id === userId ? "guest" : "host"]) || 0}</span></div>
      {room.board_state?.last_roll && <p className="text-sm text-muted-foreground">Last roll: {room.board_state.last_roll}</p>}
      <p className="text-xs text-muted-foreground">Exactly 100 wins. Rolling past 100 leaves your piece in place.</p>
      <Button onClick={() => void play({ type: "roll" })} disabled={!isMyTurn || busy || room.status !== "active"}><Dices className="mr-2 h-4 w-4" />{busy ? "Rolling…" : "Roll dice"}</Button>
    </> : <>
      <div className="mx-auto grid max-w-[360px] grid-cols-8 gap-1 rounded-2xl border bg-rose-50 p-2">{Array.from({ length: 57 }, (_, index) => index + 1).map((space) => {
        const players = room.board_state?.players || {};
        const host = Number(players.host) === space, guest = Number(players.guest) === space;
        return <div key={space} className={`relative grid aspect-square place-items-center rounded-lg border text-[9px] font-semibold sm:text-xs ${space > 52 ? "border-amber-300 bg-amber-100" : space % 2 ? "border-rose-200 bg-white" : "border-rose-200 bg-rose-100"}`}><span>{space}</span>{host && <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border border-white bg-violet-600 sm:h-5 sm:w-5" title="Host token" />}{guest && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-white bg-sky-500 sm:h-5 sm:w-5" title="Guest token" />}</div>;
      })}</div>
      <div className="flex justify-center gap-4 text-xs"><span className="text-violet-700">● You: {Number(room.board_state?.players?.[room.host_id === userId ? "host" : "guest"]) || "Home"}</span><span className="text-sky-700">● Friend: {Number(room.board_state?.players?.[room.host_id === userId ? "guest" : "host"]) || "Home"}</span></div>
      {room.board_state?.last_roll && <p className="text-sm text-muted-foreground">Last roll: {room.board_state.last_roll}{room.board_state?.captured ? " · A token was sent home!" : ""}</p>}
      <p className="text-xs text-muted-foreground">Roll a 6 to leave home. Capture your friend on the shared track and reach 57 to win.</p>
      <Button onClick={() => void play({ type: "roll" })} disabled={!isMyTurn || busy || room.status !== "active"}><Dices className="mr-2 h-4 w-4" />{busy ? "Rolling…" : "Roll dice"}</Button>
    </>}
    {room.status === "completed" && <Card><CardContent className="space-y-2 p-4"><p className="font-semibold">{winnerText}</p><p className="text-xs text-muted-foreground">{gameKey === "chess" ? room.board_state?.reason || "Checkmate" : "Nice match! Invite a friend for another round from Head-to-head."}</p></CardContent></Card>}
    {room.status === "expired" && <Card><CardContent className="p-4 text-sm">This match expired before it finished. Start a new room for another game.</CardContent></Card>}
    <Button variant="ghost" onClick={onExit}>{room.status === "active" ? "Leave match" : "Back to arcade"}</Button>
  </div>;
}
