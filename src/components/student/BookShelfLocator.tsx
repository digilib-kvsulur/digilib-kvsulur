import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Book, MapPin } from "lucide-react";

interface ShelfLocatorProps {
  shelfNumber?: string;
  cupboardNumber?: string;
  bookTitle: string;
  category?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookShelfLocator({ shelfNumber, cupboardNumber, bookTitle, category, isOpen, onClose }: ShelfLocatorProps) {
  const [areas, setAreas] = useState<any[]>([]);
  
  useEffect(() => {
    if (!isOpen) return;
    const loadZones = async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "library_map_zones").maybeSingle();
      if (data?.value) {
        try {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAreas(parsed);
            return;
          }
        } catch (e) {}
      }
      // Fallback
      setAreas([
        { id: "fiction", label: "Fiction & Novels", x: 50, y: 50, w: 200, h: 200, color: "fill-blue-100 stroke-blue-300", cupboards: "" }
      ]);
    };
    loadZones();
  }, [isOpen]);

  const gridWidth = 800;
  const gridHeight = 600;

  const getTargetCoordinates = () => {
    let targetArea = areas.find(a => {
      if (!cupboardNumber || !a.cupboards) return false;
      const cups = a.cupboards.split(",").map((c:string) => c.trim().toLowerCase());
      return cups.includes(cupboardNumber.trim().toLowerCase());
    });
    
    // Fallback: match by category string as before if cupboard didn't match
    if (!targetArea && category) {
       const lowerCat = category.toLowerCase();
       targetArea = areas.find(a => a.label.toLowerCase().includes(lowerCat));
    }
    
    // Final Fallback
    if (!targetArea) targetArea = areas[0] || { x: 50, y: 50, w: 200, h: 200, label: "Unknown Area" };

    return {
      x: (targetArea.x || 50) + (targetArea.w || 200) / 2,
      y: (targetArea.y || 50) + (targetArea.h || 200) / 2,
      areaName: targetArea.label,
      targetArea // save full area config for rendering
    };
  };

  const target = getTargetCoordinates();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 border-0 rounded-3xl">
        <div className="bg-indigo-600 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Compass className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black">Library Locator Map</DialogTitle>
            </div>
            <p className="text-indigo-100 font-medium line-clamp-1">{bookTitle}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
             {shelfNumber && (
               <Badge className="bg-white/20 hover:bg-white/30 border-0 text-white font-bold py-1.5 px-3 rounded-lg text-sm flex items-center gap-2">
                 <Book className="h-4 w-4 opacity-70" /> Shelf: {shelfNumber}
               </Badge>
             )}
             {cupboardNumber && (
               <Badge className="bg-white/20 hover:bg-white/30 border-0 text-white font-bold py-1.5 px-3 rounded-lg text-sm flex items-center gap-2">
                 <MapPin className="h-4 w-4 opacity-70" /> Cupboard: {cupboardNumber}
               </Badge>
             )}
          </div>
        </div>

        <div className="relative w-full aspect-[4/3] max-h-[60vh] overflow-hidden bg-slate-50 p-4">
           {/* SVG Interactive Map */}
           <svg viewBox={`0 0 ${gridWidth} ${gridHeight}`} className="w-full h-full drop-shadow-sm rounded-xl bg-white border border-slate-200">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                </pattern>
                {/* Desk pattern */}
                <pattern id="desk" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="#e2e8f0" />
                  <path d="M 0 0 L 20 20 M 20 0 L 0 20" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Entrance Door */}
              <rect x="350" y="580" width="100" height="20" fill="#94a3b8" rx="4" />
              <text x="400" y="570" fontSize="14" fontWeight="bold" fill="#64748b" textAnchor="middle">ENTRANCE</text>

              {/* Librarian Desk */}
              <rect x="300" y="450" width="200" height="60" fill="url(#desk)" rx="8" stroke="#cbd5e1" strokeWidth="2" />
              <text x="400" y="485" fontSize="16" fontWeight="bold" fill="#64748b" textAnchor="middle">Librarian Desk</text>

              {/* Render Shelf Areas */}
              {areas.map(area => {
                const fillClass = (area.color || "").replace("bg-", "fill-").replace("text-", "stroke-") || "fill-indigo-100 stroke-indigo-300";
                const ax = area.x || 50;
                const ay = area.y || 50;
                const aw = area.w || 200;
                const ah = area.h || 200;
                
                return (
                <g key={area.label || Math.random()}>
                  <rect 
                    x={ax} 
                    y={ay} 
                    width={aw} 
                    height={ah} 
                    className={`${fillClass} stroke-2 transition-all duration-300`} 
                    rx="8"
                    opacity={target.areaName === area.label ? 1 : 0.4}
                  />
                  {/* Faux book stacks inside area */}
                  {ah > 60 && <rect x={ax + 20} y={ay + 20} width={aw - 40} height="20" fill="#cbd5e1" rx="2" opacity="0.5" />}
                  {ah > 100 && <rect x={ax + 20} y={ay + 60} width={aw - 40} height="20" fill="#cbd5e1" rx="2" opacity="0.5" />}
                  {ah > 140 && <rect x={ax + 20} y={ay + 100} width={aw - 40} height="20" fill="#cbd5e1" rx="2" opacity="0.5" />}
                  
                  <text 
                    x={ax + aw / 2} 
                    y={ay + ah - 20} 
                    fontSize="16" 
                    fontWeight="bold" 
                    fill="#334155" 
                    textAnchor="middle"
                  >
                    {area.label}
                  </text>
                </g>
              )})}

              {/* Target Marker */}
              <g className="animate-bounce" style={{ transformOrigin: `${target.x}px ${target.y}px`, transform: 'translateY(-10px)' }}>
                <circle cx={target.x} cy={target.y - 15} r="25" fill="#ef4444" opacity="0.2" className="animate-ping" />
                <path 
                  d={`M ${target.x} ${target.y} C ${target.x - 20} ${target.y - 30}, ${target.x - 20} ${target.y - 50}, ${target.x} ${target.y - 50} C ${target.x + 20} ${target.y - 50}, ${target.x + 20} ${target.y - 30}, ${target.x} ${target.y}`} 
                  fill="#ef4444" 
                />
                <circle cx={target.x} cy={target.y - 35} r="8" fill="white" />
              </g>

           </svg>
        </div>

        <div className="p-4 bg-white border-t flex justify-between items-center">
           <p className="text-sm font-medium text-slate-600">
             Proceed to the <strong className="text-indigo-600">{target.areaName}</strong> section highlighted in red.
           </p>
           <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">Close Map</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
