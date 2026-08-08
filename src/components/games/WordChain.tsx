import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GameProps, formatClock, shuffle, wordsFrom } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const TARGET = 8;

export default function WordChain({ books, content, onComplete, onExit }: GameProps) {
  const starters = useMemo(() => {
    const list = [...wordsFrom(content), ...books.map((b) => b.title.replace(/[^a-zA-Z]/g, "").toUpperCase())]
      .filter((w) => w.length >= 4);
    return list.length ? list : ["READ"];
  }, [content, books]);

  const [seed, setSeed] = useState(0);
  const start = useMemo(() => shuffle(starters)[0] || "READ", [starters, seed]);
  const [chain, setChain] = useState<string[]>([start]);
  const [word, setWord] = useState("");
  const [timeLeft, setTimeLeft] = useState(90);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setChain([start]); }, [start]);

  const finish = useCallback((len: number) => {
    setOver(true);
    onComplete(len - 1 >= TARGET, (len - 1) * 5);
  }, [onComplete]);

  useEffect(() => {
    if (over) return;
    if (timeLeft <= 0) { finish(chain.length); return; }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [timeLeft, over, chain.length, finish]);

  const submit = () => {
    const w = word.trim().toUpperCase();
    const last = chain[chain.length - 1];
    if (w.length < 3) return setError("Words must be at least 3 letters.");
    if (!/^[A-Z]+$/.test(w)) return setError("Letters only, please.");
    if (w[0] !== last[last.length - 1]) return setError(`Must start with "${last[last.length - 1]}".`);
    if (chain.includes(w)) return setError("Already used that word.");
    setError(null);
    const next = [...chain, w];
    setChain(next);
    setWord("");
    if (next.length - 1 >= TARGET) finish(next.length);
  };

  const restart = () => {
    setWord(""); setTimeLeft(90); setOver(false); setError(null); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">{chain.length - 1}/{TARGET} words</Badge>
          <Badge variant={timeLeft < 15 ? "destructive" : "secondary"}>{formatClock(timeLeft)}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {chain.map((w, i) => (
            <Badge key={`${w}-${i}`} variant={i === chain.length - 1 ? "default" : "secondary"}>{w}</Badge>
          ))}
        </div>
      </Card>

      {!over ? (
        <div className="space-y-2 max-w-sm mx-auto">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={word}
              className="uppercase"
              placeholder={`Start with "${chain[chain.length - 1].slice(-1)}"`}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button onClick={submit}>Add</Button>
          </div>
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
        </div>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">You chained {chain.length - 1} words</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
