import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle, formatClock } from "./gameTypes";
import { RotateCcw, Trophy, SkipForward } from "lucide-react";

const WORDS = [
  "LIBRARY", "CHAPTER", "AUTHOR", "NOVEL", "POETRY", "SHELF", "FICTION",
  "READER", "STORY", "CATALOG", "BORROW", "SCIENCE", "HISTORY", "DICTIONARY",
];

const scrambleWord = (w: string) => {
  let s = w;
  let guard = 0;
  while (s === w && guard++ < 10) s = shuffle(w.split("")).join("");
  return s;
};

const ROUNDS = 5;

export default function WordScramble({ books, onComplete, onExit }: GameProps) {
  const pool = useMemo(() => {
    const fromBooks = books
      .map((b) => b.title.replace(/[^a-zA-Z]/g, "").toUpperCase())
      .filter((t) => t.length >= 5 && t.length <= 11);
    return shuffle([...new Set([...fromBooks, ...WORDS])]).slice(0, ROUNDS);
  }, [books]);

  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState("");
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [over, setOver] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);

  const word = pool[round] || "";
  const scrambled = useMemo(() => scrambleWord(word), [word, seed]);

  const finish = useCallback(
    (score: number) => {
      setOver(true);
      onComplete(score >= Math.ceil(ROUNDS * 0.6), score);
    },
    [onComplete]
  );

  useEffect(() => {
    if (over) return;
    if (timeLeft <= 0) {
      finish(correct);
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [timeLeft, over, correct, finish]);

  const next = (gotIt: boolean) => {
    const nc = gotIt ? correct + 1 : correct;
    setCorrect(nc);
    setGuess("");
    setFeedback(gotIt ? "Correct!" : `It was ${word}`);
    window.setTimeout(() => setFeedback(null), 1200);
    if (round + 1 >= pool.length) finish(nc);
    else setRound((r) => r + 1);
  };

  const submit = () => {
    if (!guess.trim()) return;
    next(guess.trim().toUpperCase() === word);
  };

  const restart = () => {
    setRound(0);
    setGuess("");
    setCorrect(0);
    setTimeLeft(90);
    setOver(false);
    setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Badge variant="secondary">Round {Math.min(round + 1, pool.length)}/{pool.length}</Badge>
          <Badge variant="secondary">Correct: {correct}</Badge>
          <Badge variant={timeLeft < 15 ? "destructive" : "secondary"}>{formatClock(timeLeft)}</Badge>
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

      {!over ? (
        <Card className="p-6 text-center space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Unscramble</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {scrambled.split("").map((ch, i) => (
              <span
                key={i}
                className="h-10 w-8 sm:h-12 sm:w-10 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-lg"
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm mx-auto">
            <Input
              value={guess}
              autoFocus
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Your answer"
              className="uppercase"
            />
            <Button onClick={submit}>Check</Button>
            <Button variant="outline" size="icon" onClick={() => next(false)} title="Skip">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          {feedback && <p className="text-sm font-medium text-primary">{feedback}</p>}
        </Card>
      ) : (
        <Card className="p-6 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-8 w-8 text-primary mx-auto" />
          <p className="font-semibold">
            You solved {correct} of {pool.length} words
          </p>
          <Button size="sm" onClick={restart} variant="outline">
            Play again
          </Button>
        </Card>
      )}
    </div>
  );
}
