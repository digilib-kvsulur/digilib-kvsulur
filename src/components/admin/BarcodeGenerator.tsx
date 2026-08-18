import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Barcode, Printer, Search, Plus, Trash2, LayoutGrid } from "lucide-react";
import BarcodeSVG from "@/components/shared/BarcodeSVG";

interface PrintItem {
  id: string;
  title: string;
  author: string;
  accession: string;
}

const BarcodeGenerator = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
  const [stickerColumns, setStickerColumns] = useState("3");
  const [stickerPadding, setStickerPadding] = useState("6");
  // Series generator state
  const [seriesPrefix, setSeriesPrefix] = useState("");
  const [seriesStart, setSeriesStart] = useState("");
  const [seriesEnd, setSeriesEnd] = useState("");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesAuthor, setSeriesAuthor] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
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

  const handleAddSeries = () => {
    const start = parseInt(seriesStart);
    const end = parseInt(seriesEnd);
    if (!seriesPrefix.trim()) {
      toast({ title: "Prefix required", description: "Enter a prefix like KV-ACC-", variant: "destructive" });
      return;
    }
    if (isNaN(start) || isNaN(end) || start > end) {
      toast({ title: "Invalid range", description: "Start must be <= End and both must be numbers.", variant: "destructive" });
      return;
    }
    if (end - start > 999) {
      toast({ title: "Too many", description: "Maximum 1000 at a time.", variant: "destructive" });
      return;
    }
    const next = [...printQueue];
    let added = 0;
    for (let n = start; n <= end; n++) {
      const acc = `${seriesPrefix.trim()}${n}`;
      if (!next.some(x => x.accession === acc)) {
        next.push({
          id: `series-${acc}`,
          title: seriesTitle.trim() || seriesPrefix.trim(),
          author: seriesAuthor.trim() || "",
          accession: acc,
        });
        added++;
      }
    }
    setPrintQueue(next);
    toast({ title: `${added} barcodes added`, description: `Range ${seriesPrefix}${start} → ${seriesPrefix}${end}` });
  };

  const handleAddToQueue = (book: any, accession: string) => {
    if (printQueue.some(x => x.accession === accession)) {
      toast({ title: "Already added", description: `Accession ${accession} is already in the print layout.` });
      return;
    }
    setPrintQueue(p => [...p, {
      id: `${book.id}-${accession}`,
      title: book.title,
      author: book.author,
      accession: accession
    }]);
  };

  const handleAddAllCopies = (book: any) => {
    const accs = Array.isArray(book.accession_numbers) && book.accession_numbers.length > 0
      ? book.accession_numbers
      : book.accession_number ? [book.accession_number] : [];
    
    let added = 0;
    const next = [...printQueue];
    accs.forEach((acc: string) => {
      if (!next.some(x => x.accession === acc)) {
        next.push({
          id: `${book.id}-${acc}`,
          title: book.title,
          author: book.author,
          accession: acc
        });
        added++;
      }
    });
    if (added > 0) {
      setPrintQueue(next);
      toast({ title: "Added copies", description: `Added ${added} copy barcode(s) to layout.` });
    }
  };

  const handleRemoveFromQueue = (id: string) => {
    setPrintQueue(p => p.filter(x => x.id !== id));
  };

  const handleClearQueue = () => {
    setPrintQueue([]);
  };

  const handlePrint = () => {
    if (printQueue.length === 0) {
      toast({ title: "Print Layout Empty", description: "Please add barcodes to print.", variant: "destructive" });
      return;
    }
    window.print();
  };

  const filteredBooks = books.filter(b => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const accs = Array.isArray(b.accession_numbers) ? b.accession_numbers.join(" ") : b.accession_number || "";
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || accs.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Print styles inserted directly inside the DOM to override screen components */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-layout-area, #print-layout-area * {
            visibility: visible;
          }
          #print-layout-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Barcode className="h-6 w-6 text-primary" /> Barcode Sticker Generator
          </h2>
          <p className="text-sm text-muted-foreground">Select physical book copy accession numbers and print them onto label sheets</p>
        </div>
        {printQueue.length > 0 && (
          <div className="flex gap-2">
            <Button onClick={handleClearQueue} variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" /> Clear Layout ({printQueue.length})
            </Button>
            <Button onClick={handlePrint} size="sm" className="gradient-primary border-0 shadow-md">
              <Printer className="h-4 w-4 mr-2" /> Print Labels
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left column: Series Generator + Book selector stacked */}
        <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Series Generator Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Barcode className="h-5 w-5 text-indigo-500" /> Generate Accession Series</CardTitle>
            <CardDescription>Bulk-add a range of 5-digit accession barcodes (e.g. 01001 to 01050)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-5">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs font-semibold">Prefix</Label>
                <Input value={seriesPrefix} onChange={e => setSeriesPrefix(e.target.value)} placeholder="Optional prefix, e.g. KVS-" className="font-mono text-sm h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start #</Label>
                <Input type="number" value={seriesStart} onChange={e => setSeriesStart(e.target.value)} placeholder="01001" className="font-mono text-sm h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">End #</Label>
                <Input type="number" value={seriesEnd} onChange={e => setSeriesEnd(e.target.value)} placeholder="01050" className="font-mono text-sm h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Count</Label>
                <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-sm font-mono text-muted-foreground">
                  {seriesStart && seriesEnd && !isNaN(parseInt(seriesStart)) && !isNaN(parseInt(seriesEnd)) ? Math.max(0, parseInt(seriesEnd) - parseInt(seriesStart) + 1) : "—"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Label / Title (optional)</Label>
                <Input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)} placeholder="e.g. KV Library" className="text-sm h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sub-label (optional)</Label>
                <Input value={seriesAuthor} onChange={e => setSeriesAuthor(e.target.value)} placeholder="e.g. General Reference" className="text-sm h-9" />
              </div>
            </div>
            <Button onClick={handleAddSeries} className="w-full gradient-primary border-0 shadow-sm text-sm h-9">
              <Plus className="h-4 w-4 mr-2" /> Add Series to Print Layout
            </Button>
          </CardContent>
        </Card>

        {/* Book List Selection Card */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-indigo-500" /> Choose Books</CardTitle>
            <CardDescription>Search titles, authors, or barcodes and add copies to print queue</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search catalog..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto border-t">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading books...</div>
              ) : filteredBooks.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No matching books found</div>
              ) : (
                <div className="divide-y">
                  {filteredBooks.map(book => {
                    const accs = Array.isArray(book.accession_numbers) && book.accession_numbers.length > 0
                      ? book.accession_numbers
                      : book.accession_number ? [book.accession_number] : [];
                    return (
                      <div key={book.id} className="p-3 space-y-2 hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-semibold text-xs text-foreground leading-snug">{book.title}</p>
                          <p className="text-[10px] text-muted-foreground">{book.author}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 items-center">
                          {accs.map((acc: string) => (
                            <Button
                              key={acc}
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] font-mono border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              onClick={() => handleAddToQueue(book, acc)}
                            >
                              + Acc: {acc}
                            </Button>
                          ))}
                          {accs.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                              onClick={() => handleAddAllCopies(book)}
                            >
                              + Add All ({accs.length})
                            </Button>
                          )}
                          {accs.length === 0 && (
                            <span className="text-[10px] text-red-500 italic">No accession codes found</span>
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
        </div>{/* end left column */}

        {/* Right Side: Print Config & Preview Grid */}
        <Card className="lg:col-span-7 border-border/50">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2"><Printer className="h-5 w-5 text-indigo-500" /> Print Sheet Settings</CardTitle>
            <CardDescription>Configure sticker columns and spacing parameters below</CardDescription>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sticker Columns</Label>
                <Select value={stickerColumns} onValueChange={setStickerColumns}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Columns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Columns</SelectItem>
                    <SelectItem value="3">3 Columns</SelectItem>
                    <SelectItem value="4">4 Columns</SelectItem>
                    <SelectItem value="5">5 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sticker Cell Spacing (Padding)</Label>
                <Select value={stickerPadding} onValueChange={setStickerPadding}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Spacing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Compact (2mm)</SelectItem>
                    <SelectItem value="4">Normal (4mm)</SelectItem>
                    <SelectItem value="6">Spaced (6mm)</SelectItem>
                    <SelectItem value="8">Wide (8mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 bg-muted/20 min-h-[40vh] max-h-[60vh] overflow-y-auto">
            {printQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Barcode className="h-10 w-10 text-muted-foreground/60" />
                <p className="text-sm font-semibold text-muted-foreground">Print layout is empty</p>
                <p className="text-xs text-muted-foreground/80 max-w-[280px]">Add physical copy accession barcodes from the book panel to build your custom sticker sheet.</p>
              </div>
            ) : (
              <div
                className="grid gap-2 p-1"
                style={{
                  gridTemplateColumns: `repeat(${stickerColumns}, minmax(0, 1fr))`,
                }}
              >
                {printQueue.map((item) => (
                  <div
                    key={item.id}
                    className="relative group border rounded-lg overflow-hidden bg-white shadow-sm transition-all hover:border-red-400"
                    style={{ padding: `${stickerPadding}px` }}
                  >
                    <button
                      onClick={() => handleRemoveFromQueue(item.id)}
                      className="absolute top-1.5 right-1.5 h-5 w-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-opacity"
                    >
                      ×
                    </button>
                    <div className="text-center mb-1">
                      <p className="text-[9px] font-black text-slate-800 leading-tight truncate">{item.title}</p>
                      <p className="text-[8px] text-muted-foreground truncate">{item.author}</p>
                    </div>
                    <BarcodeSVG value={item.accession} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid rendering specifically for the print stylesheet */}
      <div id="print-layout-area" className="hidden print:block p-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${stickerColumns}, minmax(0, 1fr))`,
          }}
        >
          {printQueue.map((item) => (
            <div
              key={item.id}
              className="text-center bg-white border border-gray-300 rounded flex flex-col justify-between"
              style={{
                padding: `${stickerPadding}px`,
                pageBreakInside: "avoid"
              }}
            >
              <div className="mb-1 leading-none">
                <p className="text-[10px] font-black text-black leading-tight uppercase truncate">{item.title}</p>
                <p className="text-[8px] text-gray-600 truncate">{item.author}</p>
              </div>
              <BarcodeSVG value={item.accession} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;
