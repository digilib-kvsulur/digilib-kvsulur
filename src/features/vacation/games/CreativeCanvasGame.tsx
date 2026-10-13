import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VacationGameProps } from "./types";
import { triggerConfetti, triggerWinnerConfetti } from "@/lib/confetti";
import {
  Palette,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Eraser,
  PenTool,
  Download,
  Image as ImageIcon,
} from "lucide-react";

export default function CreativeCanvasGame({ dayTitle, onComplete, onClose }: VacationGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState("#f59e0b");
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokesCount, setStrokesCount] = useState(0);
  const [theme, setTheme] = useState<"future" | "green" | "space">("future");
  const [slogan, setSlogan] = useState("Empower Minds • Ignite Futures");
  const [artworkSaved, setArtworkSaved] = useState(false);
  const [savedDataUrl, setSavedDataUrl] = useState<string | null>(null);

  // Setup canvas background
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * c.width,
      y: ((clientY - rect.top) / rect.height) * c.height,
    };
  };

  const startDraw = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    setStrokesCount((s) => s + 1);
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isEraser ? "#ffffff" : color;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = (e: any) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setStrokesCount(0);
  };

  const handleStamp = (emoji: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.font = "32px sans-serif";
    ctx.fillText(emoji, Math.random() * (c.width - 50) + 20, Math.random() * (c.height - 50) + 40);
    setStrokesCount((s) => s + 5);
    triggerConfetti();
  };

  const handleSaveArtwork = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    setSavedDataUrl(dataUrl);
    setArtworkSaved(true);
    triggerWinnerConfetti(1);
  };

  const handleFinish = () => {
    onComplete({
      score: 500,
      maxScore: 500,
      stars: 3,
      summary: `Completed Creative Arts & Poster Studio: Handcrafted digital artwork with theme '${theme.toUpperCase()}' and custom slogan '${slogan}'.`,
      artworkDataUrl: savedDataUrl || undefined,
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">{dayTitle}</h3>
            <p className="text-xs text-muted-foreground">Digital Poster Studio, Visual Design &amp; Innovation Expo</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-pink-600 text-white font-black text-xs">
            Reward: 500 XP
          </Badge>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{strokesCount} Strokes</p>
        </div>
      </div>

      {!artworkSaved ? (
        <div className="space-y-3">
          {/* Theme selector */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1.5">
              {[
                { id: "future", name: "🚀 Future of Education" },
                { id: "green", name: "🌱 My Dream Green India" },
                { id: "space", name: "🌌 Space Library 2050" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as any)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                    theme === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground font-semibold">Stamps:</span>
              {["🌱", "🚀", "🎨", "☀️", "📚"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleStamp(emoji)}
                  className="p-1 rounded hover:bg-muted text-base transition-transform active:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Palette Tools */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl border bg-card">
            <div className="flex items-center gap-1.5">
              {["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6", "#0f172a"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setIsEraser(false); }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c && !isEraser ? "scale-110 border-primary" : "border-white"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEraser(!isEraser)}
                className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                  isEraser ? "bg-rose-500 text-white" : "hover:bg-muted"
                }`}
              >
                <Eraser className="h-3.5 w-3.5" /> Eraser
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg border text-xs hover:bg-muted flex items-center gap-1 text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>

          {/* Drawing Canvas */}
          <div className="border-2 rounded-2xl overflow-hidden shadow-inner bg-white touch-none">
            <canvas
              ref={canvasRef}
              width={640}
              height={320}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              className="w-full h-56 sm:h-72 cursor-crosshair block"
            />
          </div>

          {/* Slogan Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold">Poster Title / Slogan:</label>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Enter your poster title / message..."
              className="w-full border rounded-xl px-3 py-1.5 text-xs bg-background font-semibold"
            />
          </div>

          <div className="pt-1">
            <Button
              onClick={handleSaveArtwork}
              disabled={strokesCount < 3}
              className="w-full gradient-primary text-white font-bold text-xs gap-1.5 shadow-md"
            >
              <Sparkles className="h-3.5 w-3.5" /> Complete Poster &amp; Showcase Art!
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">Masterpiece Created! 🎨</h3>
            <p className="text-xs text-muted-foreground">
              Your digital poster &lsquo;{slogan}&rsquo; has been framed and ready for exhibition!
            </p>
          </div>

          {savedDataUrl && (
            <div className="max-w-xs mx-auto rounded-xl border p-1 shadow-md bg-card">
              <img src={savedDataUrl} alt="Poster Artwork" className="rounded-lg w-full h-auto" />
            </div>
          )}

          <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-900 dark:text-pink-100 font-bold text-sm">
            <span>⭐ ⭐ ⭐ 3 Stars</span>
            <span>•</span>
            <span>+500 Vacation XP Earned!</span>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleFinish}
              className="gradient-primary text-white font-black text-sm px-6 py-2 rounded-xl shadow-lg hover:scale-105 transition-transform"
            >
              Submit Artwork &amp; Claim 500 Pts →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
