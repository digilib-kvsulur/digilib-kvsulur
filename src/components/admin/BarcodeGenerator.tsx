import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Barcode, Printer, Search, Plus, Trash2, LayoutGrid, RefreshCw,
  X, FileText, Settings2
} from "lucide-react";
import BarcodeSVG from "@/components/shared/BarcodeSVG";

interface PrintItem {
  id: string;
  title: string;
  author: string;
  accession: string;
}

// --- A4 5x13 layout constants ---
const COLS_PER_PAGE = 5;
const ROWS_PER_PAGE = 13;
const LABELS_PER_PAGE = COLS_PER_PAGE * ROWS_PER_PAGE; // 65

const BarcodeGenerator = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState("all"); // all | with | missing
  const [loading, setLoading] = useState(true);
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);

  // Print settings
  const [stickerColumns, setStickerColumns] = useState(String(COLS_PER_PAGE));
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [barcodeHeight, setBarcodeHeight] = useState(38);
  const [barcodeFontSize, setBarcodeFontSize] = useState(9);
  const [showTitle, setShowTitle] = useState(true);
  const [showAuthor, setShowAuthor] = useState(true);

  // Series generator
  const [seriesPrefix, setSeriesPrefix] = useState("");
  const [seriesStart, setSeriesStart] = useState("");
  const [seriesEnd, setSeriesEnd] = useState("");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesAuthor, setSeriesAuthor] = useState("");
  const [zeroPad, setZeroPad] = useState(5); // how many digits to pad to

  const { toast } = useToast();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, accession_number, accession_numbers")
        .order("title");
      if (error) throw error;
      setBooks(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to load books", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const getAccessions = (book: any): string[] => {
    if (Array.isArray(book.accession_numbers) && book.accession_numbers.length > 0)
      return book.accession_numbers;
    if (book.accession_number) return [book.accession_number];
    return [];
  };

  const hasBarcode = (book: any) => getAccessions(book).length > 0;

  const filteredBooks = books.filter(b => {
    const q = searchQuery.trim().toLowerCase();
    const accs = getAccessions(b).join(" ");
    const matchSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      (b.author || "").toLowerCase().includes(q) ||
      accs.toLowerCase().includes(q);
    const matchFilter =
      barcodeFilter === "all" ||
      (barcodeFilter === "with" && hasBarcode(b)) ||
      (barcodeFilter === "missing" && !hasBarcode(b));
    return matchSearch && matchFilter;
  });

  // Queue management
  const addToQueue = (book: any, accession: string) => {
    if (printQueue.some(x => x.accession === accession)) {
      toast({ title: "Already added", description: `Acc ${accession} is already in the layout.` });
      return;
    }
    setPrintQueue(p => [...p, {
      id: `${book.id}-${accession}`,
      title: book.title,
      author: book.author || "",
      accession,
    }]);
  };

  const addAllCopies = (book: any) => {
    const accs = getAccessions(book);
    let added = 0;
    const next = [...printQueue];
    accs.forEach((acc: string) => {
      if (!next.some(x => x.accession === acc)) {
        next.push({ id: `${book.id}-${acc}`, title: book.title, author: book.author || "", accession: acc });
        added++;
      }
    });
    if (added > 0) {
      setPrintQueue(next);
      toast({ title: `${added} copy/copies added to layout` });
    }
  };

  const removeFromQueue = (id: string) => setPrintQueue(p => p.filter(x => x.id !== id));
  const clearQueue = () => setPrintQueue([]);

  // Series generator
  const handleAddSeries = () => {
    const start = parseInt(seriesStart);
    const end = parseInt(seriesEnd);
    if (isNaN(start) || isNaN(end) || start > end) {
      toast({ title: "Invalid range", description: "Start must be ≤ End and both must be numbers.", variant: "destructive" });
      return;
    }
    if (end - start > 999) {
      toast({ title: "Too many", description: "Maximum 1000 at a time.", variant: "destructive" });
      return;
    }
    const next = [...printQueue];
    let added = 0;
    for (let n = start; n <= end; n++) {
      const num = zeroPad > 0 ? String(n).padStart(zeroPad, "0") : String(n);
      const acc = `${seriesPrefix.trim()}${num}`;
      if (!next.some(x => x.accession === acc)) {
        next.push({
          id: `series-${acc}`,
          title: seriesTitle.trim() || (seriesPrefix.trim() || "Book"),
          author: seriesAuthor.trim(),
          accession: acc,
        });
        added++;
      }
    }
    setPrintQueue(next);
    toast({ title: `${added} barcodes added`, description: `Range: ${seriesPrefix}${String(start).padStart(zeroPad || 1, "0")} → ${seriesPrefix}${String(end).padStart(zeroPad || 1, "0")}` });
  };

  const handlePrint = () => {
    if (printQueue.length === 0) {
      toast({ title: "Print Layout Empty", description: "Add barcodes to print.", variant: "destructive" });
      return;
    }
    window.print();
  };

  const cols = parseInt(stickerColumns);
  const totalPages = Math.ceil(printQueue.length / LABELS_PER_PAGE);
  const seriesCount =
    seriesStart && seriesEnd && !isNaN(parseInt(seriesStart)) && !isNaN(parseInt(seriesEnd))
      ? Math.max(0, parseInt(seriesEnd) - parseInt(seriesStart) + 1)
      : 0;

  return (
    <div className="space-y-5">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-layout-area, #print-layout-area * { visibility: visible; }
          #print-layout-area {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0; padding: 0; background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Barcode className="h-6 w-6 text-primary" /> Book Barcode Sticker Generator
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build a custom A4 sticker sheet (default: 5 × 13 = 65 labels per page)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={loadBooks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {printQueue.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={clearQueue} className="border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-1" /> Clear ({printQueue.length})
              </Button>
              <Button size="sm" onClick={handlePrint} className="gradient-primary border-0 shadow-md">
                <Printer className="h-4 w-4 mr-2" /> Print Labels
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      {printQueue.length > 0 && (
        <div className="flex flex-wrap gap-2 no-print">
          <Badge variant="secondary" className="text-xs gap-1">
            <FileText className="h-3 w-3" /> {printQueue.length} labels
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <LayoutGrid className="h-3 w-3" /> {totalPages} page{totalPages !== 1 ? "s" : ""} (@ {LABELS_PER_PAGE}/page)
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 no-print">
        {/* Left column */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Series Generator Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Barcode className="h-5 w-5 text-indigo-500" /> Generate Accession Series
              </CardTitle>
              <CardDescription>Bulk-add a numbered range of barcodes to the print layout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-semibold">Prefix (optional)</Label>
                  <Input
                    value={seriesPrefix}
                    onChange={e => setSeriesPrefix(e.target.value)}
                    placeholder="e.g. KVS-"
                    className="font-mono text-sm h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Zero-pad to</Label>
                  <Select value={String(zeroPad)} onValueChange={v => setZeroPad(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="3">3 digits</SelectItem>
                      <SelectItem value="4">4 digits</SelectItem>
                      <SelectItem value="5">5 digits</SelectItem>
                      <SelectItem value="6">6 digits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Start #</Label>
                  <Input type="number" value={seriesStart} onChange={e => setSeriesStart(e.target.value)} placeholder="1" className="font-mono text-sm h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">End #</Label>
                  <Input type="number" value={seriesEnd} onChange={e => setSeriesEnd(e.target.value)} placeholder="65" className="font-mono text-sm h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Count</Label>
                  <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-sm font-mono text-muted-foreground">
                    {seriesCount > 0 ? seriesCount : "—"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Label / Title (opt.)</Label>
                  <Input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)} placeholder="e.g. KV Library" className="text-sm h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Sub-label (opt.)</Label>
                  <Input value={seriesAuthor} onChange={e => setSeriesAuthor(e.target.value)} placeholder="e.g. General Ref." className="text-sm h-9" />
                </div>
              </div>
              {/* Live preview of first barcode */}
              {seriesStart && !isNaN(parseInt(seriesStart)) && (
                <div className="border rounded p-2 bg-muted/20 flex flex-col items-center gap-1">
                  <p className="text-[10px] text-muted-foreground">Preview (first label)</p>
                  <BarcodeSVG
                    value={`${seriesPrefix.trim()}${String(parseInt(seriesStart)).padStart(zeroPad || 1, "0")}`}
                    width={barcodeWidth}
                    height={barcodeHeight}
                    fontSize={barcodeFontSize}
                    className="w-full"
                  />
                </div>
              )}
              <Button onClick={handleAddSeries} disabled={!seriesStart || !seriesEnd || seriesCount <= 0} className="w-full gradient-primary border-0 shadow-sm text-sm h-9">
                <Plus className="h-4 w-4 mr-2" /> Add {seriesCount > 0 ? seriesCount : ""} to Print Layout
              </Button>
            </CardContent>
          </Card>

          {/* Book selector */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-indigo-500" /> Choose Books
              </CardTitle>
              <CardDescription>Search and add individual copy barcodes</CardDescription>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search title, author, accession..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={barcodeFilter} onValueChange={setBarcodeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Books</SelectItem>
                    <SelectItem value="with">Has Barcode</SelectItem>
                    <SelectItem value="missing">Missing Barcode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Showing {filteredBooks.length} of {books.length} books
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[55vh] overflow-y-auto border-t">
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Loading books...</div>
                ) : filteredBooks.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No matching books found</div>
                ) : (
                  <div className="divide-y">
                    {filteredBooks.map(book => {
                      const accs = getAccessions(book);
                      return (
                        <div key={book.id} className="p-3 space-y-2 hover:bg-muted/30 transition-colors">
                          <div>
                            <p className="font-semibold text-xs text-foreground leading-snug">{book.title}</p>
                            <p className="text-[10px] text-muted-foreground">{book.author}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 items-center">
                            {accs.map((acc: string) => {
                              const inQueue = printQueue.some(x => x.accession === acc);
                              return (
                                <Button
                                  key={acc}
                                  variant="outline"
                                  size="sm"
                                  disabled={inQueue}
                                  className={`h-6 px-2 text-[10px] font-mono ${inQueue ? "opacity-40" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}`}
                                  onClick={() => addToQueue(book, acc)}
                                >
                                  {inQueue ? "✓" : "+"} {acc}
                                </Button>
                              );
                            })}
                            {accs.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                                onClick={() => addAllCopies(book)}
                              >
                                + All ({accs.length})
                              </Button>
                            )}
                            {accs.length === 0 && (
                              <span className="text-[10px] text-red-500 italic">No accession number</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Print Config & Preview */}
        <Card className="lg:col-span-7 border-border/50">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-indigo-500" /> Print Layout ({printQueue.length})
                </CardTitle>
                <CardDescription>
                  A4 sticker sheet · 5 × 13 = 65 labels/page · Code 39
                </CardDescription>
              </div>
              {printQueue.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearQueue} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handlePrint} className="gradient-primary border-0">
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </div>
              )}
            </div>

            {/* Settings panel */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Columns</Label>
                <Select value={stickerColumns} onValueChange={setStickerColumns}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 (A4 default)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2 grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs">Bar Width</Label>
                    <span className="text-[10px] text-muted-foreground">{barcodeWidth}×</span>
                  </div>
                  <input type="range" min="1" max="4" step="0.5" value={barcodeWidth} onChange={e => setBarcodeWidth(Number(e.target.value))} className="w-full" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs">Height</Label>
                    <span className="text-[10px] text-muted-foreground">{barcodeHeight}px</span>
                  </div>
                  <input type="range" min="20" max="80" step="2" value={barcodeHeight} onChange={e => setBarcodeHeight(Number(e.target.value))} className="w-full" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label className="text-xs">Font</Label>
                    <span className="text-[10px] text-muted-foreground">{barcodeFontSize}px</span>
                  </div>
                  <input type="range" min="6" max="20" step="1" value={barcodeFontSize} onChange={e => setBarcodeFontSize(Number(e.target.value))} className="w-full" />
                </div>
              </div>
            </div>

            {/* Toggle show title/author */}
            <div className="flex flex-wrap gap-3 mt-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input type="checkbox" checked={showTitle} onChange={e => setShowTitle(e.target.checked)} className="rounded" />
                Show Title
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input type="checkbox" checked={showAuthor} onChange={e => setShowAuthor(e.target.checked)} className="rounded" />
                Show Author
              </label>
            </div>
          </CardHeader>

          <CardContent className="p-3 bg-muted/20 min-h-[40vh] max-h-[60vh] overflow-y-auto">
            {printQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Barcode className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-muted-foreground">Print layout is empty</p>
                <p className="text-xs text-muted-foreground/70 max-w-[260px]">
                  Add barcodes from the series generator or book catalog on the left.
                </p>
              </div>
            ) : (
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {printQueue.map(item => (
                  <div
                    key={item.id}
                    className="relative group bg-white border rounded overflow-hidden shadow-sm hover:border-red-300 transition-all"
                  >
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="absolute top-1 right-1 h-5 w-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-opacity z-10"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="p-1.5 text-center">
                      {showTitle && (
                        <p className="text-[8px] font-black text-slate-800 leading-tight truncate">{item.title}</p>
                      )}
                      {showAuthor && (
                        <p className="text-[7px] text-muted-foreground truncate">{item.author}</p>
                      )}
                      <div className="mt-0.5">
                        <BarcodeSVG
                          value={item.accession}
                          width={barcodeWidth}
                          height={barcodeHeight}
                          fontSize={barcodeFontSize}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden print area */}
      <div id="print-layout-area" className="hidden print:block" style={{ padding: "4mm 2mm" }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${stickerColumns}, minmax(0, 1fr))`,
            gap: "1mm",
          }}
        >
          {printQueue.map(item => (
            <div
              key={item.id}
              className="text-center bg-white border border-gray-300 flex flex-col justify-between"
              style={{ pageBreakInside: "avoid", padding: "1.5mm 1mm", overflow: "hidden" }}
            >
              {showTitle && (
                <p className="text-[8px] font-black text-black leading-tight truncate uppercase">{item.title}</p>
              )}
              {showAuthor && (
                <p className="text-[7px] text-gray-600 truncate leading-tight">{item.author}</p>
              )}
              <BarcodeSVG
                value={item.accession}
                width={barcodeWidth}
                height={barcodeHeight}
                fontSize={barcodeFontSize}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;
