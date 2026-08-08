import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GameProps, normalise, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, SkipForward, Lightbulb } from "lucide-react";

const FALLBACK = [
  { value: "I have pages but no leaves of a tree, a spine but no back. What am I?", answer: "A book", hint: "Common in a library" },
];

export default function RiddleRounds({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => {
    const list = content
      .filter((c) => c.kind === "riddle")
      .map((c) => ({ value: c.value, answer: String(c.extra?.answer || ""), hint: c.hint || "" }))
      .filter((r) => r.answer);
    return shuffle(list.length ? list : FALLBACK).slice(0, 5);
  }, [content, seed]);

  const [i, setI] = useState(0);
  const [guess, setGuess] = useState("");
  const [correct, setCorrect] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const r = rounds[i];

  const next = (got: boolean) => {
    const nc = got ? correct + 1 : correct;
    setCorrect(nc);
    setGuess("");
    setShowHint(false);
    setFeedback(got ? "Correct!" : `Answer: ${r.answer}`);
    window.setTimeout(() => setFeedback(null), 1500);
    if (i + 1 >= rounds.length) {
      setOver(true);
      onComplete(nc >= Math.ceil(rounds.length * 0.6), nc);
    } else setI((x) => x + 1);
  };

  const check = () => {
    if (!guess.trim()) return;
    next(normalise(guess).includes(normalise(r.answer)) || normalise(r.answer).includes(normalise(guess)));
  };

  const restart = () => {
    setI(0); setGuess(""); setCorrect(0); setOver(false); setShowHint(false); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">Riddle {Math.min(i + 1, rounds.length)}/{rounds.length}</Badge>
          <Badge variant="secondary">Correct {correct}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over ? (
        <Card className="p-6 space-y-4 text-center">
          <p className="text-lg font-medium">{r.value}</p>
          {showHint && r.hint && <p className="text-xs text-muted-foreground">Hint: {r.hint}</p>}
          <div className="flex gap-2 max-w-sm mx-auto">
            <Input value={guess} autoFocus placeholder="Your answer"
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()} />
            <Button onClick={check}>Check</Button>
            {r.hint && (
              <Button variant="outline" size="icon" onClick={() => setShowHint(true)} title="Hint">
                <Lightbulb className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => next(false)} title="Skip">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          {feedback && <p className="text-sm font-medium text-primary">{feedback}</p>}
        </Card>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">You solved {correct} of {rounds.length} riddles</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
