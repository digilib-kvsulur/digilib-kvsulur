import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Dices, CircleDot, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameProps } from "./gameTypes";

type Props = GameProps & { gameKey: string };
const WIN_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const LADDERS: Record<number, number> = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 };
const SNAKES: Record<number, number> = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 99: 78 };

function TicTacToe({ onComplete }: GameProps) {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState("");
  const completed = useRef(false);
  const markResult = useCallback((next: string[]) => {
    const win = WIN_LINES.find((line) => next[line[0]] && next[line[0]] === next[line[1]] && next[line[1]] === next[line[2]]);
    if (win) {
      const won = next[win[0]] === "X";
      setFinished(true); setResult(won ? "You win!" : "The computer wins this round.");
      if (!completed.current) { completed.current = true; void onComplete(won, won ? 3 : 0); }
      return true;
    }
    if (next.every(Boolean)) {
      setFinished(true); setResult("It's a draw!");
      if (!completed.current) { completed.current = true; void onComplete(false, 1); }
      return true;
    }
    return false;
  }, [onComplete]);
  const play = (index: number) => {
    if (finished || turn !== "X" || board[index]) return;
    const next = [...board]; next[index] = "X"; setBoard(next);
    if (!markResult(next)) setTurn("O");
  };
  useEffect(() => {
    if (turn !== "O" || finished) return;
    const timer = window.setTimeout(() => {
      const empty = board.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
      const winningMove = (mark: string) => WIN_LINES.find((line) => line.filter((index) => board[index] === mark).length === 2 && line.some((index) => !board[index]))?.find((index) => !board[index]);
      const choice = winningMove("O") ?? winningMove("X") ?? (board[4] ? undefined : 4) ?? empty[Math.floor(Math.random() * empty.length)];
      if (choice === undefined) return;
      const next = [...board]; next[choice] = "O"; setBoard(next);
      if (!markResult(next)) setTurn("X");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [board, finished, markResult, turn]);
  const reset = () => { setBoard(Array(9).fill("")); setTurn("X"); setFinished(false); setResult(""); completed.current = false; };
  return <div className="mx-auto max-w-sm space-y-4 text-center">
    <div><Badge variant="secondary">Practice match</Badge><h3 className="mt-2 text-xl font-bold">Tic-Tac-Toe</h3><p className="text-sm text-muted-foreground">You are X. Make three in a row before the computer.</p></div>
    <div className="mx-auto grid max-w-[270px] grid-cols-3 gap-2">{board.map((mark, index) => <button key={index} type="button" aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ", empty"}`} onClick={() => play(index)} disabled={finished || turn !== "X" || !!mark} className="grid aspect-square place-items-center rounded-2xl border-2 bg-card text-4xl font-black shadow-sm transition hover:bg-muted disabled:cursor-default"><span className={mark === "X" ? "text-violet-600" : "text-sky-600"}>{mark}</span></button>)}</div>
    <p aria-live="polite" className="min-h-5 text-sm font-medium text-muted-foreground">{finished ? result : turn === "X" ? "Your move" : "Computer is thinking…"}</p>
    {finished && <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Play again</Button>}
    <Button variant="ghost" onClick={onExit}>Back to arcade</Button>
  </div>;
}

function Pong({ onComplete, onExit }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef({ x: 180, y: 210, vx: 4, vy: 3, playerY: 175, cpuY: 175, player: 0, cpu: 0 });
  const onCompleteRef = useRef(onComplete); onCompleteRef.current = onComplete;
  const [paddleY, setPaddleY] = useState(175);
  const [score, setScore] = useState([0, 0]);
  const [done, setDone] = useState(false);
  const completed = useRef(false);
  useEffect(() => {
    if (done) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const draw = window.setInterval(() => {
      const g = game.current, w = canvas.width, h = canvas.height;
      g.x += g.vx; g.y += g.vy;
      if (g.y <= 8 || g.y >= h - 8) g.vy *= -1;
      g.cpuY += (g.y - (g.cpuY + 35)) * 0.08;
      if (g.x < 28 && g.y >= g.playerY && g.y <= g.playerY + 70) { g.vx = Math.abs(g.vx) * 1.04; g.vy += (g.y - (g.playerY + 35)) * 0.05; }
      if (g.x > w - 28 && g.y >= g.cpuY && g.y <= g.cpuY + 70) { g.vx = -Math.abs(g.vx) * 1.03; }
      if (g.x < 0 || g.x > w) {
        if (g.x > w) g.player += 1; else g.cpu += 1;
        setScore([g.player, g.cpu]);
        if (g.player >= 5 || g.cpu >= 5) {
          setDone(true); window.clearInterval(draw);
          if (!completed.current) { completed.current = true; void onCompleteRef.current(g.player >= 5, g.player); }
          return;
        }
        g.x = w / 2; g.y = h / 2; g.vx = (g.player > g.cpu ? -1 : 1) * 4; g.vy = Math.random() > .5 ? 3 : -3;
      }
      ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.setLineDash([7, 9]); ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#c4b5fd"; ctx.fillRect(14, g.playerY, 12, 70);
      ctx.fillStyle = "#7dd3fc"; ctx.fillRect(w - 26, g.cpuY, 12, 70);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(g.x, g.y, 8, 0, Math.PI * 2); ctx.fill();
    }, 24);
    return () => window.clearInterval(draw);
  }, [done]);
  const movePaddle = (value: number) => { const next = Math.max(0, Math.min(350, value)); game.current.playerY = next; setPaddleY(next); };
  const reset = () => { game.current = { x: 180, y: 210, vx: 4, vy: 3, playerY: 175, cpuY: 175, player: 0, cpu: 0 }; completed.current = false; setScore([0, 0]); setPaddleY(175); setDone(false); };
  return <div className="mx-auto max-w-sm space-y-3 text-center"><div><Badge variant="secondary">First to 5</Badge><h3 className="mt-2 text-xl font-bold">Ping Pong</h3><p className="text-sm text-muted-foreground">Move your paddle with the slider. Beat the arcade bot!</p></div><p className="font-mono text-2xl font-black">{score[0]} <span className="text-muted-foreground">:</span> {score[1]}</p><canvas ref={canvasRef} width={360} height={420} aria-label="Ping Pong game field" className="mx-auto w-full max-w-[300px] rounded-2xl border shadow-lg" /><input aria-label="Move paddle" type="range" min="0" max="350" value={paddleY} onChange={(event) => movePaddle(Number(event.target.value))} className="w-full accent-violet-600" />{done && <div aria-live="polite" className="flex justify-center gap-2"><Badge>{score[0] >= 5 ? "You win!" : "Bot wins — try again!"}</Badge><Button size="sm" variant="outline" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" />Again</Button></div>}<Button variant="ghost" onClick={onExit}>Back to arcade</Button></div>;
}

type Point = { x: number; y: number };
const DIRECTIONS: Record<string, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
function Snake({ onComplete, onExit }: GameProps) {
  const [body, setBody] = useState<Point[]>([{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }]);
  const bodyRef = useRef(body); bodyRef.current = body;
  const [food, setFood] = useState<Point>({ x: 10, y: 7 });
  const [score, setScore] = useState(0);
  const scoreRef = useRef(score); scoreRef.current = score;
  const [done, setDone] = useState(false);
  const direction = useRef<Point>(DIRECTIONS.right);
  const completed = useRef(false);
  const finish = useCallback((finalScore: number) => { setDone(true); if (!completed.current) { completed.current = true; void onComplete(finalScore >= 5, finalScore); } }, [onComplete]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const next = ({ ArrowUp: DIRECTIONS.up, ArrowDown: DIRECTIONS.down, ArrowLeft: DIRECTIONS.left, ArrowRight: DIRECTIONS.right } as Record<string, Point>)[event.key];
      if (next && next.x !== -direction.current.x && next.y !== -direction.current.y) { direction.current = next; event.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (done) return;
    const timer = window.setInterval(() => {
      const current = bodyRef.current;
      const head = { x: current[0].x + direction.current.x, y: current[0].y + direction.current.y };
      const ate = head.x === food.x && head.y === food.y;
      const collisionBody = ate ? current : current.slice(0, -1);
      if (head.x < 0 || head.x >= 14 || head.y < 0 || head.y >= 14 || collisionBody.some((segment) => segment.x === head.x && segment.y === head.y)) { finish(scoreRef.current); return; }
      const next = [head, ...current.slice(0, ate ? undefined : -1)];
      bodyRef.current = next; setBody(next);
      if (ate) {
        const nextScore = scoreRef.current + 1; scoreRef.current = nextScore; setScore(nextScore);
        const freeCells = Array.from({ length: 196 }, (_, i) => ({ x: i % 14, y: Math.floor(i / 14) })).filter((cell) => !next.some((segment) => segment.x === cell.x && segment.y === cell.y));
        setFood(freeCells[Math.floor(Math.random() * freeCells.length)] || { x: 0, y: 0 });
      }
    }, 180);
    return () => window.clearInterval(timer);
  }, [done, finish, food, score]);
  const setDirection = (key: string) => { const next = DIRECTIONS[key]; if (next.x !== -direction.current.x || next.y !== -direction.current.y) direction.current = next; };
  const reset = () => { const initialBody = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }]; bodyRef.current = initialBody; scoreRef.current = 0; setBody(initialBody); setFood({ x: 10, y: 7 }); setScore(0); setDone(false); completed.current = false; direction.current = DIRECTIONS.right; };
  const occupied = useMemo(() => new Set(body.map((part) => `${part.x},${part.y}`)), [body]);
  return <div className="mx-auto max-w-sm space-y-4 text-center"><div><Badge variant="secondary">Fruit collected: {score}</Badge><h3 className="mt-2 text-xl font-bold">Snake</h3><p className="text-sm text-muted-foreground">Guide the snake with arrow keys or the touch controls.</p></div><div className="mx-auto grid aspect-square w-full max-w-[300px] grid-cols-3 gap-0.5 rounded-2xl border bg-emerald-950 p-2" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))", gridAutoRows: "1fr" }}>{Array.from({ length: 196 }, (_, index) => { const x = index % 14, y = Math.floor(index / 14); const isSnake = occupied.has(`${x},${y}`); const isHead = body[0]?.x === x && body[0]?.y === y; const isFood = food.x === x && food.y === y; return <span key={index} className={`rounded-sm ${isHead ? "bg-lime-200" : isSnake ? "bg-lime-400" : isFood ? "grid place-items-center bg-transparent text-[10px]" : "bg-emerald-900/60"}`}>{isFood ? "🍎" : ""}</span>; })}</div><div className="mx-auto grid w-36 grid-cols-3 gap-1"><span /><Button size="icon" variant="outline" aria-label="Move up" onClick={() => setDirection("up")}><ArrowUp /></Button><span /><Button size="icon" variant="outline" aria-label="Move left" onClick={() => setDirection("left")}><ArrowLeft /></Button><Button size="icon" variant="outline" aria-label="Move down" onClick={() => setDirection("down")}><ArrowDown /></Button><Button size="icon" variant="outline" aria-label="Move right" onClick={() => setDirection("right")}><ArrowRight /></Button></div>{done && <div aria-live="polite" className="space-x-2"><Badge>{score >= 5 ? "Great run!" : "Run ended — try again!"}</Badge><Button size="sm" variant="outline" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" />Play again</Button></div>}<Button variant="ghost" onClick={onExit}>Back to arcade</Button></div>;
}

function SnakesAndLadders({ onComplete, onExit }: GameProps) {
  const [positions, setPositions] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [message, setMessage] = useState("Roll the dice to start. The computer takes its turn after you.");
  const [finished, setFinished] = useState(false);
  const completed = useRef(false);
  const cells = useMemo(() => Array.from({ length: 100 }, (_, i) => { const row = 9 - Math.floor(i / 10); const col = i % 10; return row % 2 === 0 ? row * 10 + col + 1 : row * 10 + 10 - col; }), []);
  const roll = () => {
    if (finished || turn !== 0) return;
    const die = Math.floor(Math.random() * 6) + 1; setLastRoll(die);
    const candidate = positions[0] + die;
    const playerPos = candidate <= 100 ? (LADDERS[candidate] || SNAKES[candidate] || candidate) : positions[0];
    const next = [playerPos, positions[1]]; setPositions(next);
    const special = LADDERS[candidate] ? `Climb the ladder to ${LADDERS[candidate]}!` : SNAKES[candidate] ? `A snake slides you to ${SNAKES[candidate]}.` : `You rolled a ${die}.`;
    if (playerPos >= 100) { setFinished(true); setMessage("You reached the finish first!"); if (!completed.current) { completed.current = true; void onComplete(true, 100); } return; }
    setMessage(special);
    setTurn(1);
    window.setTimeout(() => {
      const cpuRoll = Math.floor(Math.random() * 6) + 1; const cpuCandidate = next[1] + cpuRoll;
      const cpuPos = cpuCandidate <= 100 ? (LADDERS[cpuCandidate] || SNAKES[cpuCandidate] || cpuCandidate) : next[1];
      const final = [next[0], cpuPos]; setPositions(final); setLastRoll(cpuRoll);
      if (cpuPos >= 100) { setFinished(true); setMessage("The computer reached the finish first. Try again!"); if (!completed.current) { completed.current = true; void onComplete(false, 0); } }
      else { setMessage(`Computer rolled ${cpuRoll}. Your turn!`); setTurn(0); }
    }, 800);
  };
  const reset = () => { setPositions([0, 0]); setTurn(0); setLastRoll(null); setFinished(false); setMessage("Roll the dice to start. The computer takes its turn after you."); completed.current = false; };
  return <div className="mx-auto max-w-xl space-y-3 text-center"><div><Badge variant="secondary">You vs computer</Badge><h3 className="mt-2 text-xl font-bold">Snakes &amp; Ladders</h3><p className="text-sm text-muted-foreground">Race to 100. Ladders lift you up; snakes slide you down.</p></div><div className="grid grid-cols-10 overflow-hidden rounded-xl border bg-amber-50">{cells.map((number) => <div key={number} className={`relative grid aspect-square place-items-center border-[0.5px] border-amber-200 text-[9px] font-semibold sm:text-xs ${number % 2 ? "bg-amber-100" : "bg-white"}`}><span>{number}</span>{LADDERS[number] && <span className="absolute right-0 top-0 text-[8px] text-emerald-700">↗{LADDERS[number]}</span>}{SNAKES[number] && <span className="absolute right-0 top-0 text-[8px] text-rose-600">↘{SNAKES[number]}</span>}{positions[0] === number && <span className="absolute bottom-0 left-0 z-10 h-3 w-3 rounded-full border border-white bg-violet-600 sm:h-5 sm:w-5" title="You" />}{positions[1] === number && <span className="absolute bottom-0 right-0 z-10 h-3 w-3 rounded-full border border-white bg-sky-500 sm:h-5 sm:w-5" title="Computer" />}</div>)}</div><p aria-live="polite" className="min-h-5 text-sm text-muted-foreground">{message}</p><div className="flex justify-center gap-2"><Button onClick={roll} disabled={finished || turn !== 0}><Dices className="mr-2 h-4 w-4" />{finished ? "Finished" : "Roll dice"}</Button>{finished && <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Again</Button>}</div>{lastRoll !== null && <p className="text-sm font-semibold">Last roll: {lastRoll}</p>}<Button variant="ghost" onClick={onExit}>Back to arcade</Button></div>;
}

export default function ArcadeMiniGame(props: Props) {
  if (props.gameKey === "ping-pong") return <Pong {...props} />;
  if (props.gameKey === "snake") return <Snake {...props} />;
  if (props.gameKey === "tic-tac-toe") return <TicTacToe {...props} />;
  if (props.gameKey === "snakes-ladders") return <SnakesAndLadders {...props} />;
  return <div className="space-y-3 text-center"><CircleDot className="mx-auto h-10 w-10 text-primary" /><p>This game is coming soon.</p><Button variant="ghost" onClick={props.onExit}><Zap className="mr-2 h-4 w-4" />Back to arcade</Button></div>;
}
