import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GameProps } from "./gameTypes";
import { RotateCcw, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Undo2 } from "lucide-react";

type Grid = number[][];

const TILE_INFO: Record<number, { label: string; icon: string; bg: string; text: string }> = {
  2: { label: "Letter", icon: "🔤", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-200" },
  4: { label: "Word", icon: "✍️", bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-800 dark:text-amber-200" },
  8: { label: "Sentence", icon: "📝", bg: "bg-orange-100 dark:bg-orange-950/60", text: "text-orange-800 dark:text-orange-200" },
  16: { label: "Paragraph", icon: "📄", bg: "bg-rose-100 dark:bg-rose-950/60", text: "text-rose-800 dark:text-rose-200" },
  32: { label: "Chapter", icon: "📑", bg: "bg-fuchsia-100 dark:bg-fuchsia-950/60", text: "text-fuchsia-800 dark:text-fuchsia-200" },
  64: { label: "Novella", icon: "📖", bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-800 dark:text-purple-200" },
  128: { label: "Book", icon: "📚", bg: "bg-indigo-200 dark:bg-indigo-900/60", text: "text-indigo-900 dark:text-indigo-100" },
  256: { label: "Bestseller", icon: "🌟", bg: "bg-blue-300 dark:bg-blue-800", text: "text-blue-950 dark:text-blue-100" },
  512: { label: "Classic", icon: "🏛️", bg: "bg-teal-300 dark:bg-teal-700", text: "text-teal-950 dark:text-teal-50" },
  1024: { label: "Masterpiece", icon: "👑", bg: "bg-emerald-400 dark:bg-emerald-600", text: "text-emerald-950 dark:text-emerald-50" },
  2048: { label: "Library", icon: "🏆", bg: "bg-amber-400 dark:bg-amber-500", text: "text-amber-950 dark:text-amber-50" },
};

const createEmptyGrid = (): Grid => [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const addRandomTile = (grid: Grid): Grid => {
  const emptyCoords: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) emptyCoords.push([r, c]);
    }
  }
  if (emptyCoords.length === 0) return grid;

  const [randR, randC] = emptyCoords[Math.floor(Math.random() * emptyCoords.length)];
  const newGrid = grid.map((row) => [...row]);
  newGrid[randR][randC] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
};

export default function Book2048({ onComplete, onExit }: GameProps) {
  const [grid, setGrid] = useState<Grid>(() => {
    let initial = createEmptyGrid();
    initial = addRandomTile(initial);
    return addRandomTile(initial);
  });

  const [score, setScore] = useState(0);
  const [prevGrid, setPrevGrid] = useState<Grid | null>(null);
  const [prevScore, setPrevScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasReached2048, setHasReached2048] = useState(false);
  const [reportedWin, setReportedWin] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check if grid has moves left
  const hasMovesLeft = (g: Grid): boolean => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (g[r][c] === 0) return true;
        if (r < 3 && g[r][c] === g[r + 1][c]) return true;
        if (c < 3 && g[r][c] === g[r][c + 1]) return true;
      }
    }
    return false;
  };

  // Slide & Merge Row Left
  const slideRowLeft = (row: number[]): { newRow: number[]; gained: number } => {
    const nonZeros = row.filter((val) => val !== 0);
    const newRow: number[] = [];
    let gained = 0;

    for (let i = 0; i < nonZeros.length; i++) {
      if (i + 1 < nonZeros.length && nonZeros[i] === nonZeros[i + 1]) {
        const mergedVal = nonZeros[i] * 2;
        newRow.push(mergedVal);
        gained += mergedVal;
        i++; // skip merged
      } else {
        newRow.push(nonZeros[i]);
      }
    }

    while (newRow.length < 4) {
      newRow.push(0);
    }

    return { newRow, gained };
  };

  const move = useCallback((direction: "LEFT" | "RIGHT" | "UP" | "DOWN") => {
    if (gameOver) return;

    let rotated = grid.map((row) => [...row]);
    let rotatedTimes = 0;

    if (direction === "DOWN") rotatedTimes = 1;
    else if (direction === "RIGHT") rotatedTimes = 2;
    else if (direction === "UP") rotatedTimes = 3;

    // Helper to rotate grid 90 deg clockwise
    const rotateClockwise = (m: Grid): Grid => {
      const res = createEmptyGrid();
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          res[c][3 - r] = m[r][c];
        }
      }
      return res;
    };

    for (let i = 0; i < rotatedTimes; i++) {
      rotated = rotateClockwise(rotated);
    }

    let gainedScore = 0;
    let moved = false;
    const movedGrid = rotated.map((row) => {
      const { newRow, gained } = slideRowLeft(row);
      gainedScore += gained;
      if (newRow.some((val, idx) => val !== row[idx])) moved = true;
      return newRow;
    });

    if (!moved) return;

    // Rotate back
    let finalGrid = movedGrid;
    const reverseRotations = (4 - rotatedTimes) % 4;
    for (let i = 0; i < reverseRotations; i++) {
      finalGrid = rotateClockwise(finalGrid);
    }

    // Save previous for Undo
    setPrevGrid(grid);
    setPrevScore(score);

    // Add random new tile
    const withNewTile = addRandomTile(finalGrid);
    setGrid(withNewTile);
    const newScore = score + gainedScore;
    setScore(newScore);

    // Check for 2048 milestone
    const maxVal = Math.max(...withNewTile.flat());
    if (maxVal >= 2048 && !hasReached2048) {
      setHasReached2048(true);
    }
    if (maxVal >= 512 && !reportedWin) {
      setReportedWin(true);
      onComplete(true, Math.min(newScore, 100));
    }

    // Check game over
    if (!hasMovesLeft(withNewTile)) {
      setGameOver(true);
      onComplete(maxVal >= 256, Math.min(newScore, 100));
    }
  }, [grid, score, gameOver, hasReached2048, reportedWin, onComplete]);

  // Arrow Key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        move("UP");
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        move("DOWN");
      } else if (["ArrowLeft", "KeyA"].includes(e.code)) {
        e.preventDefault();
        move("LEFT");
      } else if (["ArrowRight", "KeyD"].includes(e.code)) {
        e.preventDefault();
        move("RIGHT");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move]);

  const handleUndo = () => {
    if (!prevGrid) return;
    setGrid(prevGrid);
    setScore(prevScore);
    setPrevGrid(null);
    setGameOver(false);
  };

  const restart = () => {
    let initial = createEmptyGrid();
    initial = addRandomTile(initial);
    initial = addRandomTile(initial);
    setGrid(initial);
    setScore(0);
    setPrevGrid(null);
    setGameOver(false);
    setHasReached2048(false);
    setReportedWin(false);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Top Header stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Goal: Grand Library</Badge>
          <Badge variant="outline" className="text-primary font-bold">Score: {score}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleUndo} disabled={!prevGrid}>
            <Undo2 className="h-4 w-4 mr-1" /> Undo
          </Button>
          <Button size="sm" variant="outline" onClick={restart}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restart
          </Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Close</Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5 flex flex-col items-center max-w-[380px] mx-auto bg-muted/20">
        {/* 4x4 Grid */}
        <div
          ref={containerRef}
          className="grid grid-cols-4 gap-2 w-full aspect-square bg-muted/60 p-2.5 rounded-xl border border-border/70"
        >
          {grid.map((row, rIdx) =>
            row.map((val, cIdx) => {
              const info = TILE_INFO[val] || {
                label: val > 0 ? String(val) : "",
                icon: "",
                bg: "bg-muted/40",
                text: "text-muted-foreground",
              };

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`rounded-lg flex flex-col items-center justify-center p-1 font-bold shadow-xs transition-transform duration-100 ${info.bg} ${info.text}`}
                >
                  {val > 0 ? (
                    <>
                      <span className="text-lg sm:text-xl leading-none">{info.icon}</span>
                      <span className="text-[10px] sm:text-xs font-semibold mt-0.5 tracking-tight line-clamp-1">
                        {info.label}
                      </span>
                      <span className="text-[9px] opacity-75">{val}</span>
                    </>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Directional Pad for mobile & mouse users */}
        <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
          <Button size="sm" variant="secondary" className="h-10 w-20" onClick={() => move("UP")}>
            <ArrowUp className="h-5 w-5" />
          </Button>
          <div className="flex gap-3">
            <Button size="sm" variant="secondary" className="h-10 w-20" onClick={() => move("LEFT")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button size="sm" variant="secondary" className="h-10 w-20" onClick={() => move("DOWN")}>
              <ArrowDown className="h-5 w-5" />
            </Button>
            <Button size="sm" variant="secondary" className="h-10 w-20" onClick={() => move("RIGHT")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {gameOver && (
          <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30 text-center w-full space-y-2">
            <Trophy className="h-6 w-6 text-primary mx-auto" />
            <h4 className="font-bold text-sm">Game Over! Final Score: {score}</h4>
            <Button size="sm" onClick={restart}>Play again</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
