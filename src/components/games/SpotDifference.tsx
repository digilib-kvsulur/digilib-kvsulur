import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, formatClock, shuffle } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const SYMBOLS = ["📕", "📗", "📘", "📙", "📓", "📔", "📚", "📖", "🔖", "✏️", "🖊️", "🗞️"];
const ROUNDS = 6;

export default function SpotDifference({ onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [over, setOver] = useState(false);

  const board = useMemo(() => {
    const size = 16 + round * 4;
    const [base, odd] = shuffle(SYMBOLS).slice(0, 2);
    const cells = Array(size).fill(base);
    const oddIndex = Math.floor(Math.random() * size);
    cells[oddIndex] = odd;
    return { cells, oddIndex };
  }, [round, seed]);

  const finish = useCallback((score: number) => {
    setOver(true);
    onComplete(score >= Math.ceil(ROUNDS * 0.6), score);
  }, [onComplete]);

  useEffect(() => {
    if (over) return;
    if (timeLeft <= 0) { finish(correct); return; }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [timeLeft, over, correct, finish]);

  const pick = (i: number) => {
    if (over) return;
    const nc = i === board.oddIndex ? correct + 1 : correct;
    setCorrect(nc);
    if (round + 1 >= ROUNDS) finish(nc);
    else setRound((r) => r + 1);
  };

  const restart = () => {
    setRound(0); setCorrect(0); setTimeLeft(60); setOver(false); setSeed((s) => s + 1);
  };

  const cols = Math.ceil(Math.sqrt(board.cells.length));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">Round {Math.min(round + 1, ROUNDS)}/{ROUNDS}</Badge>
          <Badge variant="secondary">Correct {correct}</Badge>
          <Badge variant={timeLeft < 15 ? "destructive" : "secondary"}>{formatClock(timeLeft)}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over ? (
        <Card className="p-4">
          <p className="text-xs text-center text-muted-foreground mb-3">Tap the symbol that is different.</p>
          <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, maxWidth: 400 }}>
            {board.cells.map((s, i) => (
              <button key={i} onClick={() => pick(i)}
                className="aspect-square rounded-md bg-muted hover:bg-primary/15 flex items-center justify-center text-xl">
                {s}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">You spotted {correct} of {ROUNDS}</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
