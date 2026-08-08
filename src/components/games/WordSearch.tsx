import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps, shuffle, wordsFrom } from "./gameTypes";
import { RotateCcw, Trophy } from "lucide-react";

const SIZE = 10;
const FALLBACK = ["NOVEL", "POEM", "SHELF", "AUTHOR", "INDEX", "STORY", "READ", "PAGE"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface Placed { word: string; cells: number[] }

function buildGrid(words: string[]) {
  const grid: string[] = Array(SIZE * SIZE).fill("");
  const placed: Placed[] = [];
  for (const word of words) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const horizontal = Math.random() < 0.5;
      const maxStart = SIZE - word.length;
      if (maxStart < 0) break;
      const line = Math.floor(Math.random() * SIZE);
      const offset = Math.floor(Math.random() * (maxStart + 1));
      const cells = word.split("").map((_, i) =>
        horizontal ? line * SIZE + offset + i : (offset + i) * SIZE + line
      );
      if (cells.some((c, i) => grid[c] && grid[c] !== word[i])) continue;
      cells.forEach((c, i) => (grid[c] = word[i]));
      placed.push({ word, cells });
      break;
    }
  }
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) grid[i] = LETTERS[Math.floor(Math.random() * 26)];
  }
  return { grid, placed };
}

export default function WordSearch({ content, onComplete, onExit }: GameProps) {
  const [seed, setSeed] = useState(0);
  const words = useMemo(() => {
    const list = [...new Set([...wordsFrom(content), ...FALLBACK])].filter((w) => w.length >= 3 && w.length <= SIZE);
    return shuffle(list).slice(0, 6);
  }, [content, seed]);

  const { grid, placed } = useMemo(() => buildGrid(words), [words]);
  const [found, setFound] = useState<string[]>([]);
  const [start, setStart] = useState<number | null>(null);
  const [reported, setReported] = useState(false);

  const foundCells = placed.filter((p) => found.includes(p.word)).flatMap((p) => p.cells);

  const clickCell = (idx: number) => {
    if (start === null) { setStart(idx); return; }
    const hit = placed.find(
      (p) =>
        !found.includes(p.word) &&
        ((p.cells[0] === start && p.cells[p.cells.length - 1] === idx) ||
          (p.cells[0] === idx && p.cells[p.cells.length - 1] === start))
    );
    setStart(null);
    if (!hit) return;
    const next = [...found, hit.word];
    setFound(next);
    if (next.length === placed.length && !reported) {
      setReported(true);
      onComplete(true, next.length * 10);
    }
  };

  const restart = () => { setFound([]); setStart(null); setReported(false); setSeed((s) => s + 1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="secondary">Found {found.length}/{placed.length}</Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restart}><RotateCcw className="h-4 w-4 mr-1" />New grid</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">Tap the first letter of a word, then its last letter.</p>

      <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0,1fr))`, maxWidth: 420 }}>
        {grid.map((ch, i) => (
          <button
            key={i}
            onClick={() => clickCell(i)}
            className={`aspect-square text-[11px] sm:text-sm font-semibold rounded-sm transition-colors ${
              foundCells.includes(i)
                ? "bg-emerald-500 text-white"
                : start === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-primary/20"
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {placed.map((p) => (
          <Badge key={p.word} variant={found.includes(p.word) ? "default" : "outline"}
            className={found.includes(p.word) ? "line-through" : ""}>
            {p.word}
          </Badge>
        ))}
      </div>

      {found.length === placed.length && placed.length > 0 && (
        <Card className="p-5 text-center space-y-2 border-primary/40 bg-primary/5">
          <Trophy className="h-7 w-7 text-primary mx-auto" />
          <p className="font-semibold">All words found!</p>
          <Button size="sm" variant="outline" onClick={restart}>Play again</Button>
        </Card>
      )}
    </div>
  );
}
