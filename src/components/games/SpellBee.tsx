import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle, wordsFrom } from "./gameTypes";
import { RotateCcw, Trophy, Volume2, SkipForward } from "lucide-react";

const FALLBACK = ["RHYTHM", "LIBRARY", "CATALOGUE", "LITERATURE", "PARAGRAPH"];
const ROUNDS = 5;

export default function SpellBee({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const pool = useMemo(() => {
    const list = [...new Set([...wordsFrom(content), ...FALLBACK])];
    return shuffle(list).slice(0, ROUNDS);
  }, [content, seed]);

  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState(0);
  const [over, setOver] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const word = pool[round] || "";
  const hint = content.find((c) => c.value.toUpperCase() === word)?.hint;

  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(word.toLowerCase());
    u.rate = 0.75;
    window.speechSynthesis.speak(u);
  };

  const next = (got: boolean) => {
    const nc = got ? correct + 1 : correct;
    setCorrect(nc);
    setFeedback(got ? "Correct!" : `It was ${word}`);
    setAnswer("");
    window.setTimeout(() => setFeedback(null), 1400);
    if (round + 1 >= pool.length) {
      setOver(true);
      onComplete(nc >= Math.ceil(pool.length * 0.6), nc);
    } else setRound((r) => r + 1);
  };

  const restart = () => {
    setRound(0); setAnswer(""); setCorrect(0); setOver(false); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">Word {Math.min(round + 1, pool.length)}/{pool.length}</Badge>
          <Badge variant="secondary">Correct {correct}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {!over ? (
        <Card className="p-6 text-center space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Listen and spell</p>
          <Button onClick={speak} size="lg" className="rounded-full">
            <Volume2 className="h-5 w-5 mr-2" /> Hear the word
          </Button>
          {hint && <p className="text-xs text-muted-foreground">Hint: {hint}</p>}
          <div className="flex gap-2 max-w-sm mx-auto">
            <Input
              value={answer}
              autoFocus
              className="uppercase"
              placeholder="Spell it"
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && answer.trim() && next(answer.trim().toUpperCase() === word)}
            />
            <Button onClick={() => answer.trim() && next(answer.trim().toUpperCase() === word)}>Check</Button>
            <Button variant="outline" size="icon" onClick={() => next(false)} title="Skip">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          {feedback && <p className="text-sm font-medium text-primary">{feedback}</p>}
        </Card>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">You spelled {correct} of {pool.length} correctly</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
