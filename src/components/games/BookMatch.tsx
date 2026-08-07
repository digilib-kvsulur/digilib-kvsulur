import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle, formatClock } from "./gameTypes";
import { Check, RotateCcw, Trophy } from "lucide-react";

interface Tile {
  id: number;
  pairId: number;
  label: string;
  kind: "title" | "author";
}

const FALLBACK = [
  { title: "The Jungle Book", author: "Rudyard Kipling" },
  { title: "Wings of Fire", author: "A P J Abdul Kalam" },
  { title: "Malgudi Days", author: "R K Narayan" },
  { title: "Harry Potter", author: "J K Rowling" },
  { title: "The Alchemist", author: "Paulo Coelho" },
  { title: "Gitanjali", author: "Rabindranath Tagore" },
];

export default function BookMatch({ books, onComplete, onExit }: GameProps) {
  const pairs = useMemo(() => {
    const src = books.filter((b) => b.title && b.author).slice(0, 40);
    const chosen = (src.length >= 6 ? shuffle(src).slice(0, 6) : FALLBACK).map((b) => ({
      title: b.title,
      author: b.author,
    }));
    return chosen;
  }, [books]);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState(false);

  const reset = () => {
    const t: Tile[] = [];
    pairs.forEach((p, i) => {
      t.push({ id: i * 2, pairId: i, label: p.title, kind: "title" });
      t.push({ id: i * 2 + 1, pairId: i, label: p.author, kind: "author" });
    });
    setTiles(shuffle(t));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
    setDone(false);
  };

  useEffect(reset, [pairs]);

  useEffect(() => {
    if (done) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [done]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped.map((id) => tiles.find((t) => t.id === id)!);
    setMoves((m) => m + 1);
    if (a && b && a.pairId === b.pairId) {
      setMatched((m) => [...m, a.pairId]);
      setFlipped([]);
    } else {
      const to = window.setTimeout(() => setFlipped([]), 850);
      return () => window.clearTimeout(to);
    }
  }, [flipped, tiles]);

  useEffect(() => {
    if (pairs.length && matched.length === pairs.length && !done) {
      setDone(true);
      const score = Math.max(100 - moves * 3 - seconds, 10);
      onComplete(true, score);
    }
  }, [matched, pairs.length, done, moves, seconds, onComplete]);

  const flip = (id: number) => {
    if (done || flipped.length === 2 || flipped.includes(id)) return;
    const tile = tiles.find((t) => t.id === id);
    if (!tile || matched.includes(tile.pairId)) return;
    setFlipped((f) => [...f, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Badge variant="secondary">Moves: {moves}</Badge>
          <Badge variant="secondary">{formatClock(seconds)}</Badge>
          <Badge variant="secondary">
            {matched.length}/{pairs.length} matched
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restart
          </Button>
          <Button size="sm" variant="ghost" onClick={onExit}>
            Close
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
        {tiles.map((t) => {
          const isOpen = flipped.includes(t.id) || matched.includes(t.pairId);
          return (
            <button
              key={t.id}
              onClick={() => flip(t.id)}
              className={`min-h-[86px] sm:min-h-[100px] rounded-xl border p-2 text-[11px] sm:text-xs font-medium transition-all duration-300 flex items-center justify-center text-center ${
                isOpen
                  ? matched.includes(t.pairId)
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-accent/15 border-accent"
                  : "bg-muted/60 border-border hover:bg-muted"
              }`}
            >
              {isOpen ? (
                <span className="line-clamp-4">
                  {t.kind === "author" && <span className="block text-[9px] opacity-70">Author</span>}
                  {t.label}
                </span>
              ) : (
                <span className="text-2xl opacity-40">?</span>
              )}
            </button>
          );
        })}
      </div>

      {done && (
        <Card className="p-4 flex items-center gap-3 border-primary/40 bg-primary/5">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium">
            All pairs matched in {moves} moves and {formatClock(seconds)}!
          </p>
          <Check className="h-4 w-4 text-primary ml-auto" />
        </Card>
      )}
    </div>
  );
}
