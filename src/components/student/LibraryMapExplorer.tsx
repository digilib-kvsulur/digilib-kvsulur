import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Search, BookOpen, MapPin, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function LibraryMapExplorer() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [hoveredZone, setHoveredZone] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadZones = async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "library_map_zones").maybeSingle();
      if (data?.value) {
        try {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAreas(parsed);
            return;
          }
        } catch (e) { console.error(e); }
      }
      // Fallbacks
      setAreas([
        { label: "Fiction & Novels", color: "bg-blue-100 text-blue-800", x: 50, y: 50, w: 200, h: 120, cupboards: "C-1, C-2" },
        { label: "Science & Math", color: "bg-emerald-100 text-emerald-800", x: 300, y: 50, w: 200, h: 120, cupboards: "C-3, C-4" },
        { label: "History & Geography", color: "bg-amber-100 text-amber-800", x: 550, y: 50, w: 200, h: 120, cupboards: "C-5, C-6" },
        { label: "NCERT & Textbooks", color: "bg-indigo-100 text-indigo-800", x: 50, y: 250, w: 200, h: 120, cupboards: "C-7, C-8" },
        { label: "Reference & Encyclopedias", color: "bg-purple-100 text-purple-800", x: 550, y: 250, w: 200, h: 120, cupboards: "C-9, C-10" },
      ]);
    };
    loadZones();
  }, []);

  const searchBooks = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("books")
      .select("id, title, author, category, shelf_number, cupboard_number")
      .or(`title.ilike.%${search.trim()}%,author.ilike.%${search.trim()}%`)
      .limit(8);
    setResults(data || []);
    setLoading(false);
  };

  const getTargetCoordinates = () => {
    if (!selectedBook) return null;
    const { cupboard_number, category } = selectedBook;
    
    let targetArea = areas.find(a => {
      if (!cupboard_number || !a.cupboards) return false;
      const cups = a.cupboards.split(",").map((c: string) => c.trim().toLowerCase());
      return cups.includes(cupboard_number.trim().toLowerCase());
    });
    
    if (!targetArea && category) {
       const lowerCat = category.toLowerCase();
       targetArea = areas.find(a => a.label.toLowerCase().includes(lowerCat));
    }
    
    if (!targetArea) targetArea = areas[0];
    if (!targetArea) return null;

    return {
      x: (targetArea.x || 50) + (targetArea.w || 200) / 2,
      y: (targetArea.y || 50) + (targetArea.h || 120) / 2,
      areaName: targetArea.label,
      targetArea
    };
  };

  const handleShowOnMap = (book: any) => {
    setSelectedBook(book);
    setTimeout(() => {
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const target = getTargetCoordinates();
  const gridWidth = 800;
  const gridHeight = 500;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary animate-spin-slow" /> Interactive Library Map
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Search for a book to view its exact shelf location, or tap library zones to inspect cupboards.
          </p>
        </div>
        {selectedBook && (
          <Button variant="outline" size="sm" onClick={() => setSelectedBook(null)} className="rounded-full text-xs">
            Clear Map Marker
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Search / Locator */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Search className="h-4 w-4 text-primary" /> Locate a Book
              </CardTitle>
              <CardDescription className="text-xs">Find cupboard and shelf location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchBooks()}
                  placeholder="Enter book title or author..."
                  className="h-9 text-xs"
                />
                <Button onClick={searchBooks} disabled={loading} size="sm" className="h-9 text-xs">
                  Search
                </Button>
              </div>

              {results.length > 0 && (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {results.map((book) => (
                    <div
                      key={book.id}
                      className={`p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2 ${
                        selectedBook?.id === book.id 
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{book.title}</p>
                        <p className="text-muted-foreground truncate">{book.author}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-1">
                          {book.cupboard_number && <Badge variant="secondary" className="text-[9px] px-1 py-0 font-semibold">Cupboard {book.cupboard_number}</Badge>}
                          {book.shelf_number && <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">Shelf {book.shelf_number}</Badge>}
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 gap-1 font-bold text-primary" onClick={() => handleShowOnMap(book)}>
                          <MapPin className="h-3 w-3" /> Locate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details / Legend Card */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" /> Zone Details
              </CardTitle>
              <CardDescription className="text-xs">Explore cupboards per zone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {areas.map((area) => {
                  const isActive = target?.areaName === area.label;
                  return (
                    <div
                      key={area.label}
                      onMouseEnter={() => setHoveredZone(area)}
                      onMouseLeave={() => setHoveredZone(null)}
                      className={`flex justify-between items-center p-2 rounded-xl text-xs transition-all border ${
                        isActive 
                          ? "border-red-300 bg-red-50/50" 
                          : "border-transparent bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${area.color.split(" ")[0]}`} />
                        <span className="font-semibold text-foreground">{area.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-background border px-2 py-0.5 rounded-full font-medium">
                        {area.cupboards ? `Cupboards: ${area.cupboards}` : "No Cupboards"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right columns: Inline Interactive Map */}
        <div ref={mapRef} className="lg:col-span-2 space-y-3">
          <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-2 bg-muted/20 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold">2D Floor Layout</CardTitle>
                  <CardDescription className="text-xs">Physical map of the school library room</CardDescription>
                </div>
                {target && (
                  <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] py-0.5 px-2 animate-pulse">
                    📍 Target: {target.areaName}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-slate-50 flex items-center justify-center">
              <div className="w-full relative aspect-[8/5] max-w-[720px] bg-white rounded-xl shadow-inner border overflow-hidden">
                <svg viewBox={`0 0 ${gridWidth} ${gridHeight}`} className="w-full h-full">
                  <defs>
                    <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                    </pattern>
                    <pattern id="librarian-desk" width="15" height="15" patternUnits="userSpaceOnUse">
                      <rect width="15" height="15" fill="#e2e8f0" />
                      <path d="M 0 0 L 15 15 M 15 0 L 0 15" stroke="#cbd5e1" strokeWidth="1" />
                    </pattern>
                  </defs>

                  {/* Grid background */}
                  <rect width="100%" height="100%" fill="url(#grid-pattern)" />

                  {/* Entrance Door */}
                  <rect x="350" y="480" width="100" height="15" fill="#64748b" rx="2" />
                  <text x="400" y="472" fontSize="11" fontWeight="bold" fill="#64748b" textAnchor="middle">ENTRANCE</text>

                  {/* Librarian Desk */}
                  <rect x="300" y="380" width="200" height="50" fill="url(#librarian-desk)" rx="6" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="400" y="410" fontSize="13" fontWeight="bold" fill="#475569" textAnchor="middle">Librarian Desk</text>

                  {/* Render Shelf Areas */}
                  {areas.map((area, idx) => {
                    const fillClass = (area.color || "").replace("bg-", "fill-").replace("text-", "stroke-") || "fill-indigo-100 stroke-indigo-300";
                    const ax = area.x || 50;
                    const ay = area.y || 50;
                    const aw = area.w || 200;
                    const ah = area.h || 120;
                    
                    // Highlight logic
                    const isTarget = target?.areaName === area.label;
                    const isHovered = hoveredZone?.label === area.label;
                    const opacity = target 
                      ? (isTarget ? 1.0 : 0.25)
                      : (isHovered ? 1.0 : 0.8);

                    return (
                      <g 
                        key={idx} 
                        className="cursor-pointer transition-all duration-300"
                        onMouseEnter={() => setHoveredZone(area)}
                        onMouseLeave={() => setHoveredZone(null)}
                      >
                        <rect 
                          x={ax} 
                          y={ay} 
                          width={aw} 
                          height={ah} 
                          className={`${fillClass} stroke-2 transition-all duration-200`} 
                          rx="6"
                          opacity={opacity}
                        />
                        {/* Shelf lines */}
                        {ah > 40 && <line x1={ax + 10} y1={ay + 20} x2={ax + aw - 10} y2={ay + 20} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="2" opacity={opacity} />}
                        {ah > 80 && <line x1={ax + 10} y1={ay + 50} x2={ax + aw - 10} y2={ay + 50} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="2" opacity={opacity} />}
                        {ah > 100 && <line x1={ax + 10} y1={ay + 80} x2={ax + aw - 10} y2={ay + 80} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="2" opacity={opacity} />}
                        
                        <text 
                          x={ax + aw / 2} 
                          y={ay + ah / 2 + 4} 
                          fontSize="13" 
                          fontWeight="extrabold" 
                          fill="#1e293b" 
                          textAnchor="middle"
                          opacity={opacity}
                        >
                          {area.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Target Bounce Marker */}
                  {target && (
                    <g className="animate-bounce" style={{ transformOrigin: `${target.x}px ${target.y}px`, transform: 'translateY(-8px)' }}>
                      <circle cx={target.x} cy={target.y - 12} r="20" fill="#ef4444" opacity="0.25" className="animate-ping" />
                      <path 
                        d={`M ${target.x} ${target.y} C ${target.x - 15} ${target.y - 22}, ${target.x - 15} ${target.y - 38}, ${target.x} ${target.y - 38} C ${target.x + 15} ${target.y - 38}, ${target.x + 15} ${target.y - 22}, ${target.x} ${target.y}`} 
                        fill="#ef4444" 
                      />
                      <circle cx={target.x} cy={target.y - 26} r="6" fill="white" />
                    </g>
                  )}
                </svg>
              </div>
            </CardContent>
            {target && (
              <div className="bg-red-50/70 p-3.5 border-t border-red-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <p className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-red-500 animate-pulse" />
                  <span>Your book is in the <strong>{target.areaName}</strong> section (Cupboard {selectedBook.cupboard_number || 'N/A'}, Shelf {selectedBook.shelf_number || 'N/A'}).</span>
                </p>
                <Button size="sm" variant="outline" onClick={() => setSelectedBook(null)} className="h-8 text-xs font-bold text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800">
                  Dismiss Indicator
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
