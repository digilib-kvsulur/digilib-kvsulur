import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CardBook {
  title: string;
  author: string;
  cover_url?: string | null;
  count: number;
}

const ROUNDS = 6;

export default function BookCards({ books, onComplete, onExit }: GameProps) {
  const [deck, setDeck] = useState<CardBook[]>([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [over, setOver] = useState(false);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.rpc("get_book_borrow_counts");
      const counts = new Map<string, number>();
      (data || []).forEach((r: any) => counts.set(r.book_id, Number(r.borrow_count) || 0));
      const enriched = books.map((b) => ({
        title: b.title,
        author: b.author,
        cover_url: b.cover_url,
        count: counts.get(b.id) ?? 0,
      }));
      const withVariety = enriched.length >= 4 ? enriched : [];
      if (active) setDeck(shuffle(withVariety).slice(0, ROUNDS * 2 + 2));
    })();
    return () => {
      active = false;
    };
  }, [books, seed]);

  const pair = useMemo(() => {
    const a = deck[round * 2];
    const b = deck[round * 2 + 1];
    return a && b ? [a, b] : null;
  }, [deck, round]);

  const pick = (idx: 0 | 1) => {
    if (!pair || reveal) return;
    const win = pair[idx].count >= pair[1 - idx].count;
    setReveal(true);
    if (win) setScore((s) => s + 1);
    window.setTimeout(() => {
      setReveal(false);
      if (round + 1 >= ROUNDS || (round + 1) * 2 + 1 >= deck.length) {
        const finalScore = win ? score + 1 : score;
        setOver(true);
        onComplete(finalScore >= Math.ceil(ROUNDS * 0.6), finalScore);
      } else {
        setRound((r) => r + 1);
      }
    }, 1300);
  };

  const restart = () => {
    setRound(0);
    setScore(0);
    setOver(false);
    setReveal(false);
    setSeed((s) => s + 1);
  };

  if (!deck.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Shuffling the deck…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Badge variant="secondary">Round {Math.min(round + 1, ROUNDS)}/{ROUNDS}</Badge>
          <Badge variant="secondary">Score: {score}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restart
          </Button>
          <Button size="sm" variant="ghost" onClick={onExit}>
            Close
          </Button>
        </div>
      </div>

      {!over && pair ? (
        <>
          <p className="text-center text-sm text-muted-foreground">
            Which book has been borrowed more often from our library?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {pair.map((b, i) => (
              <button
                key={i}
                onClick={() => pick(i as 0 | 1)}
                className="rounded-xl border border-border bg-card p-3 text-left hover:border-primary transition-colors"
              >
                <div className="aspect-[3/4] rounded-lg bg-muted mb-2 overflow-hidden flex items-center justify-center">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={`Cover of ${b.title}`} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <p className="font-medium text-sm line-clamp-2">{b.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{b.author}</p>
                {reveal && (
                  <Badge className="mt-2" variant="secondary">
                    {b.count} issues
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Card className="p-6 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-8 w-8 text-primary mx-auto" />
          <p className="font-semibold">
            Final score: {score}/{ROUNDS}
          </p>
          <Button size="sm" variant="outline" onClick={restart}>
            Play again
          </Button>
        </Card>
      )}
    </div>
  );
}
