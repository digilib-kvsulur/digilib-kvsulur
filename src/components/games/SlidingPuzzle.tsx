import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, formatClock } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const SIZE = 3; // 3x3 => 8 tiles + blank

const isSolvable = (arr: number[]) => {
  let inv = 0;
  const t = arr.filter((n) => n !== 0);
  for (let i = 0; i < t.length; i++)
    for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
  return inv % 2 === 0;
};

const makeBoard = () => {
  let arr: number[];
  do {
    arr = [...Array(SIZE * SIZE).keys()].sort(() => Math.random() - 0.5);
  } while (!isSolvable(arr) || arr.every((v, i) => v === (i + 1) % (SIZE * SIZE)));
  return arr;
};

export default function SlidingPuzzle({ books, onComplete, onExit }: GameProps) {
  const cover = useMemo(() => books.find((b) => b.cover_url)?.cover_url || null, [books]);
  const [board, setBoard] = useState<number[]>(makeBoard);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (won) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [won]);

  const solved = board.every((v, i) => (i === board.length - 1 ? v === 0 : v === i + 1));

  useEffect(() => {
    if (solved && moves > 0 && !won) {
      setWon(true);
      onComplete(true, Math.max(200 - moves - seconds, 20));
    }
  }, [solved, moves, seconds, won, onComplete]);

  const move = (idx: number) => {
    if (won) return;
    const blank = board.indexOf(0);
    const [r1, c1] = [Math.floor(idx / SIZE), idx % SIZE];
    const [r2, c2] = [Math.floor(blank / SIZE), blank % SIZE];
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const b = [...board];
    [b[idx], b[blank]] = [b[blank], b[idx]];
    setBoard(b);
    setMoves((m) => m + 1);
  };

  const restart = () => {
    setBoard(makeBoard());
    setMoves(0);
    setSeconds(0);
    setWon(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Badge variant="secondary">Moves: {moves}</Badge>
          <Badge variant="secondary">{formatClock(seconds)}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}>
            <RotateCcw className="h-4 w-4 mr-1" /> Shuffle
          </Button>
          <Button size="sm" variant="ghost" onClick={onExit}>
            Close
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[320px] aspect-square grid grid-cols-3 gap-1.5">
        {board.map((v, i) => {
          if (v === 0) return <div key={i} className="rounded-lg bg-muted/40" />;
          const pos = v - 1;
          const bgStyle = cover
            ? {
                backgroundImage: `url(${cover})`,
                backgroundSize: `${SIZE * 100}% ${SIZE * 100}%`,
                backgroundPosition: `${(pos % SIZE) * 50}% ${Math.floor(pos / SIZE) * 50}%`,
              }
            : undefined;
          return (
            <button
              key={i}
              onClick={() => move(i)}
              style={bgStyle}
              className="rounded-lg border border-border bg-primary/10 text-primary font-bold text-xl flex items-center justify-center transition-transform hover:scale-[1.02]"
            >
              {!cover && v}
              {cover && <span className="bg-background/70 rounded px-1 text-xs">{v}</span>}
            </button>
          );
        })}
      </div>

      {won && (
        <Card className="p-4 flex items-center gap-3 border-primary/40 bg-primary/5">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium">
            Solved in {moves} moves and {formatClock(seconds)}!
          </p>
        </Card>
      )}
      <p className="text-xs text-muted-foreground text-center">
        Slide the tiles into order 1-8 with the blank at the end.
      </p>
    </div>
  );
}
