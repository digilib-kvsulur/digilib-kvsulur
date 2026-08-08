import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle, wordsFrom } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const FALLBACK = ["LIBRARIAN", "BIOGRAPHY", "ANTHOLOGY", "MANUSCRIPT", "PUBLISHER"];
const MAX_WRONG = 6;

export default function BookHangman({ books, content, onComplete, onExit }: GameProps) {
  const pool = useMemo(() => {
    const fromBooks = books
      .map((b) => b.title.replace(/[^a-zA-Z]/g, "").toUpperCase())
      .filter((w) => w.length >= 5 && w.length <= 12);
    return [...new Set([...wordsFrom(content), ...fromBooks, ...FALLBACK])];
  }, [books, content]);

  const [seed, setSeed] = useState(0);
  const item = useMemo(() => {
    const w = shuffle(pool)[0] || "LIBRARY";
    const hint = content.find((c) => c.value.toUpperCase() === w)?.hint || null;
    return { word: w, hint };
  }, [pool, content, seed]);

  const [picked, setPicked] = useState<string[]>([]);
  const [reported, setReported] = useState(false);
  const wrong = picked.filter((l) => !item.word.includes(l));
  const solved = item.word.split("").every((l) => picked.includes(l));
  const lost = wrong.length >= MAX_WRONG;
  const over = solved || lost;

  const pick = (l: string) => {
    if (over || picked.includes(l)) return;
    const next = [...picked, l];
    setPicked(next);
    const nowSolved = item.word.split("").every((x) => next.includes(x));
    const nowWrong = next.filter((x) => !item.word.includes(x)).length;
    if ((nowSolved || nowWrong >= MAX_WRONG) && !reported) {
      setReported(true);
      onComplete(nowSolved, nowSolved ? (MAX_WRONG - nowWrong) * 10 : 0);
    }
  };

  const restart = () => { setPicked([]); setReported(false); setSeed((s) => s + 1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Badge variant={wrong.length >= 4 ? "destructive" : "secondary"}>
            Lives {MAX_WRONG - wrong.length}/{MAX_WRONG}
          </Badge>
          {item.hint && <Badge variant="outline">Hint: {item.hint}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />New word</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <Card className="p-6 text-center">
        <div className="flex flex-wrap justify-center gap-1.5">
          {item.word.split("").map((l, i) => (
            <span key={i} className="h-11 w-9 border-b-2 border-primary/60 flex items-center justify-center text-xl font-bold">
              {picked.includes(l) || lost ? l : ""}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
        {ALPHABET.map((l) => {
          const used = picked.includes(l);
          const hit = used && item.word.includes(l);
          return (
            <Button key={l} size="sm" variant={used ? (hit ? "default" : "outline") : "secondary"}
              disabled={used || over} onClick={() => pick(l)} className="h-9 px-0">
              {l}
            </Button>
          );
        })}
      </div>

      {over && (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">{solved ? "You saved the book!" : `The word was ${item.word}`}</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
