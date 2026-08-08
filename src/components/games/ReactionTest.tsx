import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps } from "./gameTypes";
import { RotateCcw, Trophy, Zap } from "lucide-react";

const ROUNDS = 5;
type Phase = "idle" | "waiting" | "go" | "done";

export default function ReactionTest({ onComplete, onExit }: GameProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [message, setMessage] = useState("Tap start, then tap the shelf the moment it lights up.");
  const goAt = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const arm = () => {
    setPhase("waiting");
    setMessage("Wait for green…");
    timer.current = window.setTimeout(() => {
      goAt.current = Date.now();
      setPhase("go");
      setMessage("Tap now!");
    }, 1200 + Math.random() * 2500);
  };

  const tap = () => {
    if (phase === "idle" || phase === "done") { setTimes([]); arm(); return; }
    if (phase === "waiting") {
      if (timer.current) window.clearTimeout(timer.current);
      setMessage("Too early! Try again.");
      arm();
      return;
    }
    const ms = Date.now() - goAt.current;
    const next = [...times, ms];
    setTimes(next);
    if (next.length >= ROUNDS) {
      const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
      setPhase("done");
      setMessage(`Average reaction: ${avg} ms`);
      onComplete(avg <= 400, Math.max(1000 - avg, 0));
    } else {
      setMessage(`${ms} ms — get ready…`);
      arm();
    }
  };

  const restart = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setTimes([]); setPhase("idle"); setMessage("Tap start, then tap the shelf the moment it lights up.");
  };

  const bg = phase === "go" ? "bg-emerald-500 text-white" : phase === "waiting" ? "bg-destructive/80 text-white" : "bg-muted";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="secondary">Try {Math.min(times.length + 1, ROUNDS)}/{ROUNDS}</Badge>
          {times.length > 0 && <Badge variant="outline">Last {times[times.length - 1]} ms</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />Restart</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      {phase !== "done" ? (
        <button onClick={tap} className={`w-full rounded-xl h-56 flex flex-col items-center justify-center gap-2 transition-colors ${bg}`}>
          <Zap className="h-8 w-8" />
          <span className="font-semibold">{phase === "idle" ? "Start" : message}</span>
        </button>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">{message}</p>
          <Button size="sm" variant="outline" onClick={restart}>Try again</Button>
        </Card>
      )}
      {phase !== "done" && <p className="text-xs text-center text-muted-foreground">{message}</p>}
    </div>
  );
}
