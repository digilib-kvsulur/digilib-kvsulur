import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Compass,
  Plus,
  Trash2,
  Move,
  Maximize2,
  RefreshCw,
  Sparkles,
  Layers,
  MapPin,
  Check,
} from "lucide-react";

export interface LibraryZone {
  label: string;
  color: string;
  cupboards?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLOR_OPTIONS = [
  { value: "bg-blue-100 text-blue-800 border-blue-300", label: "Blue (General / Fiction)" },
  { value: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "Emerald (Science & Math)" },
  { value: "bg-amber-100 text-amber-800 border-amber-300", label: "Amber (History & Social)" },
  { value: "bg-indigo-100 text-indigo-800 border-indigo-300", label: "Indigo (NCERT & Textbooks)" },
  { value: "bg-purple-100 text-purple-800 border-purple-300", label: "Purple (Reference & Journals)" },
  { value: "bg-rose-100 text-rose-800 border-rose-300", label: "Rose (Periodicals & Comics)" },
  { value: "bg-teal-100 text-teal-800 border-teal-300", label: "Teal (Literature & Language)" },
];

const DEFAULT_PRESET: LibraryZone[] = [
  { label: "Fiction & Novels", color: "bg-blue-100 text-blue-800 border-blue-300", x: 40, y: 40, w: 210, h: 110, cupboards: "C-1, C-2" },
  { label: "Science & Math", color: "bg-emerald-100 text-emerald-800 border-emerald-300", x: 295, y: 40, w: 210, h: 110, cupboards: "C-3, C-4" },
  { label: "History & Geography", color: "bg-amber-100 text-amber-800 border-amber-300", x: 550, y: 40, w: 210, h: 110, cupboards: "C-5, C-6" },
  { label: "NCERT & Textbooks", color: "bg-indigo-100 text-indigo-800 border-indigo-300", x: 40, y: 220, w: 210, h: 110, cupboards: "C-7, C-8" },
  { label: "Reference & Encyclopedias", color: "bg-purple-100 text-purple-800 border-purple-300", x: 550, y: 220, w: 210, h: 110, cupboards: "C-9, C-10" },
];

interface Props {
  zones: LibraryZone[];
  onChange: (zones: LibraryZone[]) => void;
}

export const LibraryMapConfigEditor: React.FC<Props> = ({ zones, onChange }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(zones.length > 0 ? 0 : null);
  const [activeDrag, setActiveDrag] = useState<{
    type: "move" | "resize";
    index: number;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;

  // Sync index if zones change
  useEffect(() => {
    if (selectedIdx !== null && selectedIdx >= zones.length) {
      setSelectedIdx(zones.length > 0 ? 0 : null);
    }
  }, [zones.length, selectedIdx]);

  // Convert client mouse/touch to 800x500 SVG coordinates
  const getCanvasCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleStartMove = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.stopPropagation();
    setSelectedIdx(idx);
    const coords = getCanvasCoords(e);
    const z = zones[idx];
    setActiveDrag({
      type: "move",
      index: idx,
      startX: coords.x,
      startY: coords.y,
      initX: z.x || 40,
      initY: z.y || 40,
      initW: z.w || 200,
      initH: z.h || 100,
    });
  };

  const handleStartResize = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.stopPropagation();
    setSelectedIdx(idx);
    const coords = getCanvasCoords(e);
    const z = zones[idx];
    setActiveDrag({
      type: "resize",
      index: idx,
      startX: coords.x,
      startY: coords.y,
      initX: z.x || 40,
      initY: z.y || 40,
      initW: z.w || 200,
      initH: z.h || 100,
    });
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!activeDrag) return;
      const coords = getCanvasCoords(e);
      const dx = coords.x - activeDrag.startX;
      const dy = coords.y - activeDrag.startY;

      const updated = [...zones];
      const z = { ...updated[activeDrag.index] };

      if (activeDrag.type === "move") {
        // Clamp to canvas edges
        const newX = Math.max(10, Math.min(CANVAS_WIDTH - z.w - 10, activeDrag.initX + dx));
        const newY = Math.max(10, Math.min(CANVAS_HEIGHT - z.h - 10, activeDrag.initY + dy));
        z.x = Math.round(newX);
        z.y = Math.round(newY);
      } else if (activeDrag.type === "resize") {
        const newW = Math.max(100, Math.min(CANVAS_WIDTH - z.x - 10, activeDrag.initW + dx));
        const newH = Math.max(60, Math.min(CANVAS_HEIGHT - z.y - 10, activeDrag.initH + dy));
        z.w = Math.round(newW);
        z.h = Math.round(newH);
      }

      updated[activeDrag.index] = z;
      onChange(updated);
    };

    const handleEnd = () => {
      setActiveDrag(null);
    };

    if (activeDrag) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [activeDrag, zones, onChange]);

  const handleAddZone = () => {
    const count = zones.length + 1;
    const newZone: LibraryZone = {
      label: `Zone ${count}`,
      color: COLOR_OPTIONS[(count - 1) % COLOR_OPTIONS.length].value,
      cupboards: `C-${count * 2 - 1}, C-${count * 2}`,
      x: 100 + (count % 3) * 60,
      y: 100 + (count % 3) * 50,
      w: 200,
      h: 110,
    };
    const next = [...zones, newZone];
    onChange(next);
    setSelectedIdx(next.length - 1);
  };

  const handleDeleteSelected = () => {
    if (selectedIdx === null) return;
    const next = zones.filter((_, i) => i !== selectedIdx);
    onChange(next);
    setSelectedIdx(next.length > 0 ? Math.max(0, selectedIdx - 1) : null);
  };

  const handleApplyPreset = () => {
    if (confirm("Reset layout to standard KV Sulur layout preset?")) {
      onChange(DEFAULT_PRESET);
      setSelectedIdx(0);
    }
  };

  const currentZone = selectedIdx !== null && selectedIdx < zones.length ? zones[selectedIdx] : null;

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Compass className="h-5 w-5 text-indigo-600" /> Interactive Floor Plan Canvas Editor
            </CardTitle>
            <CardDescription className="text-xs">
              Drag zones across the canvas to position them. Grab the bottom-right corner to resize shelves.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleApplyPreset} className="h-8 text-xs gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Reset Preset
            </Button>
            <Button size="sm" onClick={handleAddZone} className="h-8 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-3.5 w-3.5" /> Add Shelf Zone
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* The Drag & Drop Visual Floor Plan Canvas */}
        <div
          ref={containerRef}
          className="relative w-full aspect-[8/5] max-h-[460px] bg-slate-950/5 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 overflow-hidden select-none cursor-crosshair shadow-inner"
        >
          {/* Architectural Background Grid & Landmarks */}
          <svg viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern id="editor-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="currentColor" className="text-slate-300/40 dark:text-slate-700/40" strokeWidth="0.75" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#editor-grid)" />

            {/* Entrance Door */}
            <rect x="340" y="475" width="120" height="20" fill="#475569" rx="4" />
            <text x="400" y="490" fontSize="11" fontWeight="bold" fill="#ffffff" textAnchor="middle">MAIN ENTRANCE</text>

            {/* Librarian Circulation Desk */}
            <rect x="290" y="380" width="220" height="55" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" rx="8" />
            <text x="400" y="412" fontSize="12" fontWeight="bold" fill="#334155" textAnchor="middle">Circulation &amp; Kiosk Desk</text>

            {/* OPAC / Computer Search Station */}
            <rect x="50" y="410" width="130" height="45" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="6" />
            <text x="115" y="437" fontSize="10" fontWeight="semibold" fill="#64748b" textAnchor="middle">OPAC Terminals</text>

            {/* Reading Pods */}
            <circle cx="680" cy="430" r="30" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <text x="680" y="434" fontSize="10" fill="#94a3b8" textAnchor="middle">Reading Pod</text>
          </svg>

          {/* Draggable Zone Rectangles */}
          {zones.map((zone, idx) => {
            const isSelected = selectedIdx === idx;
            const x = zone.x || 40;
            const y = zone.y || 40;
            const w = zone.w || 200;
            const h = zone.h || 100;

            // Compute percentage styles
            const leftPct = (x / CANVAS_WIDTH) * 100;
            const topPct = (y / CANVAS_HEIGHT) * 100;
            const widthPct = (w / CANVAS_WIDTH) * 100;
            const heightPct = (h / CANVAS_HEIGHT) * 100;

            return (
              <div
                key={idx}
                onMouseDown={(e) => handleStartMove(e, idx)}
                onTouchStart={(e) => handleStartMove(e, idx)}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
                className={`absolute rounded-xl p-2 flex flex-col justify-between border-2 transition-shadow cursor-grab active:cursor-grabbing backdrop-blur-xs ${
                  isSelected
                    ? "ring-2 ring-indigo-500 shadow-xl border-indigo-600 z-20 scale-[1.01]"
                    : "shadow-sm border-slate-300 dark:border-slate-700 hover:shadow-md z-10"
                } ${zone.color || "bg-indigo-100 text-indigo-900 border-indigo-300"}`}
              >
                <div className="flex items-start justify-between gap-1 pointer-events-none">
                  <span className="font-bold text-xs truncate leading-tight">{zone.label || "Untitled Zone"}</span>
                  <Move className="h-3 w-3 opacity-50 shrink-0" />
                </div>

                <div className="flex items-center justify-between text-[10px] pointer-events-none">
                  <span className="truncate opacity-80">{zone.cupboards || "No cupboards"}</span>
                  <span className="font-mono text-[9px] opacity-60 shrink-0">
                    {w}x{h}
                  </span>
                </div>

                {/* Corner Resize Handle */}
                <div
                  onMouseDown={(e) => handleStartResize(e, idx)}
                  onTouchStart={(e) => handleStartResize(e, idx)}
                  className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-110 transition-transform"
                  title="Drag to resize"
                >
                  <Maximize2 className="h-2.5 w-2.5 rotate-90 pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Zone Controls Bar */}
        {currentZone && selectedIdx !== null ? (
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/60 pb-2">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                Editing Zone #{selectedIdx + 1}: <span className="underline">{currentZone.label}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSelected}
                className="h-7 text-xs text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Zone
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Zone Title</Label>
                <Input
                  value={currentZone.label}
                  onChange={(e) => {
                    const u = [...zones];
                    u[selectedIdx].label = e.target.value;
                    onChange(u);
                  }}
                  className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg"
                  placeholder="e.g. Science & Math"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assigned Cupboards</Label>
                <Input
                  value={currentZone.cupboards || ""}
                  onChange={(e) => {
                    const u = [...zones];
                    u[selectedIdx].cupboards = e.target.value;
                    onChange(u);
                  }}
                  className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg"
                  placeholder="e.g. C-1, C-2, C-3"
                />
              </div>

              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label className="text-xs font-semibold">Color Theme</Label>
                <Select
                  value={currentZone.color}
                  onValueChange={(val) => {
                    const u = [...zones];
                    u[selectedIdx].color = val;
                    onChange(u);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder="Select Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t border-indigo-100/60 dark:border-indigo-900/40">
              <span>Position: <strong className="font-mono text-foreground">X: {currentZone.x}px, Y: {currentZone.y}px</strong></span>
              <span>Dimensions: <strong className="font-mono text-foreground">{currentZone.w}px × {currentZone.h}px</strong></span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
            No zone selected. Click any zone on the canvas above to edit its cupboards and colors, or click <strong>Add Shelf Zone</strong>.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LibraryMapConfigEditor;
