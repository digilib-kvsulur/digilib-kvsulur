import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const TASKS = [
  "Read 10 pages today",
  "Borrow a non-fiction book",
  "Find a book by an Indian author",
  "Read a poem",
  "Recommend a book to a friend",
  "Write a book review",
  "Read for 20 minutes",
  "Visit the library reading corner",
  "Finish a chapter",
  "Read a science article",
  "Look up a new word",
  "Read aloud to someone",
  "Explore a new genre",
  "Read a comic or graphic novel",
  "Note down a favourite quote",
  "Read a biography page",
  "Solve a book puzzle",
  "Check out a magazine",
  "Read before bedtime",
  "Share a reading photo",
  "Read a folk tale",
  "Study with a library book",
  "Read a newspaper headline",
  "Return a book on time",
];

export default function LibraryBingo({ onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const cells = useMemo(() => {
    const picks = shuffle(TASKS).slice(0, 24);
    picks.splice(12, 0, "FREE");
    return picks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const [marked, setMarked] = useState<number[]>([12]);
  const [won, setWon] = useState(false);

  useEffect(() => setMarked([12]), [cells]);

  const lines = useMemo(() => {
    const l: number[][] = [];
    for (let r = 0; r < 5; r++) l.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
    for (let c = 0; c < 5; c++) l.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
    l.push([0, 6, 12, 18, 24]);
    l.push([4, 8, 12, 16, 20]);
    return l;
  }, []);

  const completedLines = lines.filter((line) => line.every((i) => marked.includes(i))).length;

  useEffect(() => {
    if (!won && completedLines > 0) {
      setWon(true);
      onComplete(true, completedLines * 20 + marked.length);
    }
  }, [completedLines, won, marked.length, onComplete]);

  const toggle = (i: number) => {
    if (i === 12) return;
    setMarked((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Badge variant="secondary">Marked: {marked.length}/25</Badge>
          <Badge variant="secondary">Lines: {completedLines}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSeed((s) => s + 1);
              setWon(false);
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" /> New card
          </Button>
          <Button size="sm" variant="ghost" onClick={onExit}>
            Close
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {cells.map((c, i) => {
          const on = marked.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`aspect-square rounded-lg border p-1 text-[9px] sm:text-[11px] leading-tight font-medium transition-colors flex items-center justify-center text-center ${
                on ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {won && (
        <Card className="p-4 flex items-center gap-3 border-primary/40 bg-primary/5">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium">BINGO! You completed {completedLines} line(s).</p>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Tick a task once you have actually done it — complete any full row, column or diagonal to win.
      </p>
    </div>
  );
}
