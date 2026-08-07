import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps } from "./gameTypes";
import { RotateCcw, Trophy, Lightbulb } from "lucide-react";

interface Puzzle {
  rows: string[]; // 5 chars, "." = block
  clues: { label: string; text: string }[];
}

const PUZZLES: Puzzle[] = [
  {
    rows: ["READS", "E...H", "A...E", "D...L", "SHELF"],
    clues: [
      { label: "1 Across", text: "Goes through a book (5)" },
      { label: "5 Across", text: "Where library books are stored (5)" },
      { label: "1 Down", text: "Peruses printed pages (5)" },
      { label: "4 Down", text: "A row of stored books (5)" },
    ],
  },
  {
    rows: ["NOVEL", "O...E", "T...A", "E...F", "STORY"],
    clues: [
      { label: "1 Across", text: "A long work of fiction (5)" },
      { label: "5 Across", text: "A tale you read (5)" },
      { label: "1 Down", text: "Things you jot down while studying (5)" },
      { label: "4 Down", text: "Covered in leaves; also lush (5)" },
    ],
  },
  {
    rows: ["PAGES", "O...T", "E...U", "T...D", "STUDY"],
    clues: [
      { label: "1 Across", text: "Sheets of a book (5)" },
      { label: "5 Across", text: "What you do before an exam (5)" },
      { label: "1 Down", text: "Writers of verse (5)" },
      { label: "4 Down", text: "Quiet learning time (5)" },
    ],
  },
];

export default function MiniCrossword({ onComplete, onExit }: GameProps) {
  const [pIndex, setPIndex] = useState(() => Math.floor(Math.random() * PUZZLES.length));
  const puzzle = PUZZLES[pIndex];
  const solution = useMemo(() => puzzle.rows.map((r) => r.split("")), [puzzle]);
  const [grid, setGrid] = useState<string[][]>(() =>
    puzzle.rows.map((r) => r.split("").map((c) => (c === "." ? "." : "")))
  );
  const [checked, setChecked] = useState(false);
  const [won, setWon] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const reset = (nextIndex = pIndex) => {
    setPIndex(nextIndex);
    setGrid(PUZZLES[nextIndex].rows.map((r) => r.split("").map((c) => (c === "." ? "." : ""))));
    setChecked(false);
    setWon(false);
  };

  const setCell = (r: number, c: number, val: string) => {
    const ch = val.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(-1);
    setGrid((g) => g.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? ch : cell))));
    setChecked(false);
    if (ch) {
      for (let i = r * 5 + c + 1; i < 25; i++) {
        if (solution[Math.floor(i / 5)][i % 5] !== ".") {
          inputs.current[i]?.focus();
          break;
        }
      }
    }
  };

  const filledCount = grid.flat().filter((c) => c && c !== ".").length;
  const totalCells = solution.flat().filter((c) => c !== ".").length;

  const check = () => {
    setChecked(true);
    const ok = grid.every((row, r) => row.every((c, ci) => solution[r][ci] === "." || c === solution[r][ci]));
    if (ok && !won) {
      setWon(true);
      onComplete(true, totalCells);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <Badge variant="secondary">
          {filledCount}/{totalCells} letters
        </Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => reset((pIndex + 1) % PUZZLES.length)}>
            <RotateCcw className="h-4 w-4 mr-1" /> New puzzle
          </Button>
          <Button size="sm" variant="ghost" onClick={onExit}>
            Close
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto,1fr] md:items-start">
        <div className="mx-auto grid grid-cols-5 gap-1 w-full max-w-[280px]">
          {solution.map((row, r) =>
            row.map((cell, c) => {
              const i = r * 5 + c;
              if (cell === ".") return <div key={i} className="aspect-square rounded bg-foreground/80" />;
              const val = grid[r][c];
              const wrong = checked && val !== cell;
              return (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  value={val === "." ? "" : val}
                  onChange={(e) => setCell(r, c, e.target.value)}
                  maxLength={1}
                  aria-label={`Row ${r + 1} column ${c + 1}`}
                  className={`aspect-square w-full rounded border text-center font-bold uppercase text-base focus:outline-none focus:ring-2 focus:ring-primary ${
                    wrong ? "border-destructive bg-destructive/10" : "border-border bg-card"
                  }`}
                />
              );
            })
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1">
            <Lightbulb className="h-4 w-4 text-primary" /> Clues
          </p>
          <ul className="space-y-1.5">
            {puzzle.clues.map((cl) => (
              <li key={cl.label} className="text-sm">
                <span className="font-medium text-primary">{cl.label}:</span>{" "}
                <span className="text-muted-foreground">{cl.text}</span>
              </li>
            ))}
          </ul>
          <Button size="sm" onClick={check} className="mt-2">
            Check answers
          </Button>
        </div>
      </div>

      {won && (
        <Card className="p-4 flex items-center gap-3 border-primary/40 bg-primary/5">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium">Crossword solved!</p>
        </Card>
      )}
    </div>
  );
}
