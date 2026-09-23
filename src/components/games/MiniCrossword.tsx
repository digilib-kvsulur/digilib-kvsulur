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
  // PUZZLE 1 – original
  {
    rows: ["READS", "E...H", "A...E", "D...L", "SHELF"],
    clues: [
      { label: "1 Across", text: "Goes through a book (5)" },
      { label: "5 Across", text: "Where library books are stored (5)" },
      { label: "1 Down", text: "Peruses printed pages (5)" },
      { label: "4 Down", text: "A row of stored books (5)" },
    ],
  },
  // PUZZLE 2 – original
  {
    rows: ["NOVEL", "O...E", "T...A", "E...F", "STORY"],
    clues: [
      { label: "1 Across", text: "A long work of fiction (5)" },
      { label: "5 Across", text: "A tale you read (5)" },
      { label: "1 Down", text: "Things you jot down while studying (5)" },
      { label: "4 Down", text: "Covered in leaves; also lush (5)" },
    ],
  },
  // PUZZLE 3 – original
  {
    rows: ["PAGES", "O...T", "E...U", "T...D", "STUDY"],
    clues: [
      { label: "1 Across", text: "Sheets of a book (5)" },
      { label: "5 Across", text: "What you do before an exam (5)" },
      { label: "1 Down", text: "Writers of verse (5)" },
      { label: "4 Down", text: "Quiet learning time (5)" },
    ],
  },
  // PUZZLE 4 – library theme
  {
    rows: ["BOOKS", "O...S", "R...S", "R...A", "ESSAY"],
    clues: [
      { label: "1 Across", text: "Published volumes of knowledge (5)" },
      { label: "5 Across", text: "A short piece of writing on a topic (5)" },
      { label: "1 Down", text: "Borrow from library; verb (5)" },
      { label: "4 Down", text: "Polished and smooth surface (5)" },
    ],
  },
  // PUZZLE 5 – science theme
  {
    rows: ["ATOMS", "L...O", "G...U", "A...N", "EARTH"],
    clues: [
      { label: "1 Across", text: "Tiniest particles of elements (5)" },
      { label: "5 Across", text: "Our home planet (5)" },
      { label: "1 Down", text: "Green plant pigment (5)" },
      { label: "4 Down", text: "Going around an orbit (5)" },
    ],
  },
  // PUZZLE 6 – geography theme
  {
    rows: ["OCEAN", "R...S", "B...L", "I...A", "TIBET"],
    clues: [
      { label: "1 Across", text: "Vast body of salt water (5)" },
      { label: "5 Across", text: "High plateau region in Asia (5)" },
      { label: "1 Down", text: "Circular loop or track (5)" },
      { label: "4 Down", text: "Highest point on a mountain (5)" },
    ],
  },
  // PUZZLE 7 – literature
  {
    rows: ["FABLE", "A...I", "B...T", "L...H", "SATYR"],
    clues: [
      { label: "1 Across", text: "A short moral story with animals (5)" },
      { label: "5 Across", text: "Half-man half-goat in Greek myth (5)" },
      { label: "1 Down", text: "A short story; tale (5)" },
      { label: "4 Down", text: "Distance from base to top (5)" },
    ],
  },
  // PUZZLE 8 – vocabulary theme
  {
    rows: ["WORDS", "R...O", "I...O", "T...N", "ESSAY"],
    clues: [
      { label: "1 Across", text: "Units of language and meaning (5)" },
      { label: "5 Across", text: "Written composition on a topic (5)" },
      { label: "1 Down", text: "To create and design (5)" },
      { label: "4 Down", text: "Written piece; authored work (5)" },
    ],
  },
  // PUZZLE 9 – school theme
  {
    rows: ["CLASS", "H...T", "A...U", "L...D", "STUDY"],
    clues: [
      { label: "1 Across", text: "A group of students learning together (5)" },
      { label: "5 Across", text: "Revise and learn for exams (5)" },
      { label: "1 Down", text: "Piece of chalk or board (5)" },
      { label: "4 Down", text: "Quiet time for thinking (5)" },
    ],
  },
  // PUZZLE 10 – nature theme
  {
    rows: ["PLANT", "H...E", "O...A", "T...L", "SEEDS"],
    clues: [
      { label: "1 Across", text: "Green organism that makes food from sunlight (5)" },
      { label: "5 Across", text: "Small beginnings of new plants (5)" },
      { label: "1 Down", text: "Photos of nature or sky (5)" },
      { label: "4 Down", text: "Where plants grow in (5)" },
    ],
  },
  // PUZZLE 11 – history theme
  {
    rows: ["KINGS", "I...A", "N...V", "G...E", "SWORD"],
    clues: [
      { label: "1 Across", text: "Rulers of ancient kingdoms (5)" },
      { label: "5 Across", text: "A long bladed weapon (5)" },
      { label: "1 Down", text: "Prickly plant from a hot desert (5)" },
      { label: "4 Down", text: "Digging device for soft earth (5)" },
    ],
  },
  // PUZZLE 12 – reading theme
  {
    rows: ["GENRE", "L...D", "O...I", "B...T", "ESSAY"],
    clues: [
      { label: "1 Across", text: "Category or type of book (5)" },
      { label: "5 Across", text: "Short academic piece of writing (5)" },
      { label: "1 Down", text: "Happy or joyful sound (5)" },
      { label: "4 Down", text: "A note at the end of a text (5)" },
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
