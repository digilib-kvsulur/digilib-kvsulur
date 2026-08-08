import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const FALLBACK = [
  "A room without books is like a body without a soul.",
  "There is no friend as loyal as a good book waiting on the shelf.",
];

export default function SpeedTyping({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const passage = useMemo(() => {
    const list = content.filter((c) => c.kind === "passage").map((c) => c.value);
    return shuffle(list.length ? list : FALLBACK)[0];
  }, [content, seed]);

  const [typed, setTyped] = useState("");
  const [startAt, setStartAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!startAt || done) return;
    const t = window.setInterval(() => setElapsed((Date.now() - startAt) / 1000), 200);
    return () => window.clearInterval(t);
  }, [startAt, done]);

  const correctChars = typed.split("").filter((c, i) => c === passage[i]).length;
  const accuracy = typed.length ? Math.round((correctChars / typed.length) * 100) : 100;
  const minutes = Math.max(elapsed / 60, 1 / 60);
  const wpm = Math.round(correctChars / 5 / minutes);

  const onChange = (v: string) => {
    if (done) return;
    if (!startAt) setStartAt(Date.now());
    setTyped(v);
    if (v.length >= passage.length) {
      setDone(true);
      const finalAcc = Math.round((v.split("").filter((c, i) => c === passage[i]).length / passage.length) * 100);
      onComplete(finalAcc >= 90, wpm);
    }
  };

  const restart = () => {
    setTyped(""); setStartAt(null); setElapsed(0); setDone(false); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">{wpm} WPM</Badge>
          <Badge variant={accuracy < 90 ? "destructive" : "secondary"}>{accuracy}% accuracy</Badge>
          <Badge variant="secondary">{elapsed.toFixed(1)}s</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />New passage</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <Card className="p-5 text-base leading-relaxed">
        {passage.split("").map((ch, i) => {
          const t = typed[i];
          const cls = t === undefined ? "text-muted-foreground" : t === ch ? "text-emerald-600" : "text-destructive underline";
          return <span key={i} className={cls}>{ch}</span>;
        })}
      </Card>

      {!done ? (
        <Textarea
          autoFocus
          value={typed}
          rows={4}
          placeholder="Start typing the passage…"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">{wpm} WPM at {accuracy}% accuracy</p>
          <Button size="sm" variant="outline" onClick={restart}>Try another</Button>
        </Card>
      )}
    </div>
  );
}
