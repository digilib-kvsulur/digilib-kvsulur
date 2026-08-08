import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle, wordsFrom } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const FALLBACK = ["BOOKS", "NOVEL", "PAGES", "STORY", "INDEX", "SHELF", "ATLAS", "PROSE"];

export default function ReadingWordle({ books, content, onComplete, onExit }: GameProps) {
  const pool = useMemo(() => {
    const fromBooks = books
      .map((b) => b.title.replace(/[^a-zA-Z]/g, "").toUpperCase())
      .filter((w) => w.length === 5);
    const list = [...wordsFrom(content).filter((w) => w.length === 5), ...fromBooks, ...FALLBACK];
    return [...new Set(list)];
  }, [books, content]);

  const [seed, setSeed] = useState(0);
  const answer = useMemo(() => shuffle(pool)[0] || "BOOKS", [pool, seed]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [guess, setGuess] = useState("");
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);

  const colour = (row: string, i: number) => {
    const ch = row[i];
    if (ch === answer[i]) return "bg-emerald-500 text-white border-emerald-500";
    if (answer.includes(ch)) return "bg-amber-400 text-white border-amber-400";
    return "bg-muted text-muted-foreground";
  };

  const submit = () => {
    const g = guess.trim().toUpperCase();
    if (g.length !== 5 || over) return;
    const next = [...guesses, g];
    setGuesses(next);
    setGuess("");
    if (g === answer) {
      setOver(true);
      setWon(true);
      onComplete(true, Math.max(7 - next.length, 1) * 10);
    } else if (next.length >= 6) {
      setOver(true);
      onComplete(false, 0);
    }
  };

  const restart = () => {
    setGuesses([]); setGuess(""); setOver(false); setWon(false); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="secondary">Try {Math.min(guesses.length + 1, 6)}/6</Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {[...Array(6)].map((_, r) => (
          <div key={r} className="flex justify-center gap-1.5">
            {[...Array(5)].map((_, c) => {
              const row = guesses[r];
              return (
                <span
                  key={c}
                  className={`h-11 w-11 rounded-md border flex items-center justify-center font-bold text-lg ${
                    row ? colour(row, c) : "border-border"
                  }`}
                >
                  {row ? row[c] : ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {!over ? (
        <div className="flex gap-2 max-w-xs mx-auto">
          <Input
            value={guess}
            autoFocus
            maxLength={5}
            className="uppercase"
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="5-letter word"
          />
          <Button onClick={submit}>Guess</Button>
        </div>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">{won ? "Solved it!" : `The word was ${answer}`}</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
