import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, formatClock, shuffle } from "./gameTypes";
import { RotateCcw, Trophy, Eraser, Check } from "lucide-react";

const FALLBACK = ["A stack of books", "A reading lamp", "A bookmark", "An open magazine"];

export default function QuickDraw({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const prompt = useMemo(() => {
    const list = content.filter((c) => c.kind === "prompt").map((c) => c.value);
    return shuffle(list.length ? list : FALLBACK)[0];
  }, [content, seed]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const strokes = useRef(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (timeLeft <= 0) { finish(); return; }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, done]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (done) return;
    drawing.current = true;
    strokes.current += 1;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(var(--primary))";
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    strokes.current = 0;
  };

  const finish = () => {
    if (done) return;
    setDone(true);
    // Win requires at least 3 strokes AND at least 10 seconds spent drawing (timeLeft <= 50)
    const win = strokes.current >= 3 && timeLeft <= 50;
    onComplete(win, strokes.current);
  };

  const restart = () => {
    clear(); setTimeLeft(60); setDone(false); setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Badge>{prompt}</Badge>
          <Badge variant={timeLeft < 15 ? "destructive" : "secondary"}>{formatClock(timeLeft)}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />New prompt</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <Card className="p-2">
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          className="w-full rounded-md bg-background touch-none border border-border"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </Card>

      {!done ? (
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={clear}><Eraser className="h-4 w-4 mr-1" />Clear</Button>
          <Button size="sm" onClick={finish}><Check className="h-4 w-4 mr-1" />I'm done</Button>
        </div>
      ) : (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">Sketch submitted — nice work!</p>
          <Button size="sm" variant="outline" onClick={restart}>Draw another</Button>
        </Card>
      )}
    </div>
  );
}
