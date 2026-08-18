import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Database, Loader2, CheckCircle2, Search, Save, LibraryBig, ScanBarcode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const csvEscape = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadCsv = (name: string, rows: any[], cols: string[]) => {
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => csvEscape(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const header = (rows.shift() || []).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows
    .filter(r => r.some(c => c.trim() !== ""))
    .map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
};

export const fetchAllBooks = async () => {
  const all: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("books").select("*").order("title").range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return all;
};

const SHELF_COLS = [
  "accession_number", "title", "author", "category", "subject", "language",
  "class_level", "description", "total_copies", "available_copies",
  "shelf_number", "cupboard_number",
];

export default function BookShelfData() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);
  const shelfInput = useRef<HTMLInputElement>(null);

  // quick individual editing
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, { shelf_number: string; cupboard_number: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // rapid scan mode
  const [rapidCupboard, setRapidCupboard] = useState("");
  const [rapidShelf, setRapidShelf] = useState("");
  const [rapidBarcode, setRapidBarcode] = useState("");
  const [rapidStatus, setRapidStatus] = useState<{msg: string, type: "success"|"error"} | null>(null);

  const exportShelf = async () => {
    setBusy("shelf-export");
    try {
      const books = await fetchAllBooks();
      downloadCsv(`book-shelf-${new Date().toISOString().slice(0, 10)}.csv`, books, SHELF_COLS);
      toast({ title: "Export ready", description: `${books.length} books exported.` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const importShelf = async (file: File) => {
    setBusy("shelf-import");
    setResult(null);
    try {
      const rows = parseCsv(await file.text());
      let updated = 0, skipped = 0;
      const errors: string[] = [];
      for (const r of rows) {
        const acc = (r.accession_number || "").trim();
        if (!acc || !r.title) { skipped++; continue; }

        const { data: existing } = await supabase
          .from("books")
          .select("id, accession_numbers, total_copies, available_copies")
          .ilike("title", r.title.trim())
          .maybeSingle();

        const meta = {
          category: r.category || null,
          subject: r.subject || null,
          language: r.language || null,
          class_level: r.class_level || null,
          description: r.description || null,
          shelf_number: r.shelf_number || null,
          cupboard_number: r.cupboard_number || null,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const currentAccs = Array.isArray(existing.accession_numbers) ? existing.accession_numbers : [];
          const newAccs = acc && !currentAccs.includes(acc) ? [...currentAccs, acc] : currentAccs;
          const copiesToAdd = Number(r.total_copies) || 1;
          const { error } = await supabase.from("books").update({
            ...meta,
            accession_numbers: newAccs,
            accession_number: newAccs[0] || acc,
            total_copies: existing.total_copies + copiesToAdd,
            available_copies: existing.available_copies + (Number(r.available_copies) || copiesToAdd),
          }).eq("id", existing.id);
          if (error) errors.push(`${acc}: ${error.message}`); else updated++;
        } else {
          const { error } = await supabase.from("books").insert({
            ...meta,
            accession_number: acc,
            accession_numbers: acc ? [acc] : [],
            title: r.title,
            author: r.author || "Unknown",
            total_copies: Number(r.total_copies) || 1,
            available_copies: Number(r.available_copies) || 1,
          });
          if (error) errors.push(`${acc}: ${error.message}`); else updated++;
        }
      }
      setResult({ updated, skipped, errors });
      toast({ title: "Import complete", description: `${updated} rows saved, ${skipped} skipped.` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, accession_number, shelf_number, cupboard_number")
        .or(`title.ilike.%${q}%,author.ilike.%${q}%,accession_number.ilike.%${q}%`)
        .order("title")
        .limit(25);
      if (error) throw error;
      setMatches(data || []);
      setEdits(Object.fromEntries((data || []).map((b: any) => [b.id, {
        shelf_number: b.shelf_number || "",
        cupboard_number: b.cupboard_number || "",
      }])));
      if (!data?.length) toast({ title: "No books found", description: `Nothing matched "${q}".` });
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally { setSearching(false); }
  };

  const saveOne = async (id: string) => {
    setSavingId(id);
    try {
      const e = edits[id];
      const { error } = await supabase.from("books").update({
        shelf_number: e.shelf_number.trim() || null,
        cupboard_number: e.cupboard_number.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      setMatches(m => m.map(b => b.id === id ? { ...b, ...e } : b));
      toast({ title: "Saved", description: "Shelf location updated." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSavingId(null); }
  };

  const runRapidScan = async () => {
    const acc = rapidBarcode.trim();
    if (!acc) return;
    
    // Optimistically clear barcode for next scan
    setRapidBarcode("");
    setRapidStatus(null);
    
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title")
        .eq("accession_number", acc)
        .maybeSingle();
        
      if (error) throw error;
      if (!data) {
        setRapidStatus({ msg: `Book with accession ${acc} not found.`, type: "error" });
        return;
      }
      
      const { error: upErr } = await supabase.from("books").update({
        cupboard_number: rapidCupboard.trim() || null,
        shelf_number: rapidShelf.trim() || null,
        updated_at: new Date().toISOString()
      }).eq("id", data.id);
      
      if (upErr) throw upErr;
      
      setRapidStatus({ msg: `Updated: ${data.title} (${acc})`, type: "success" });
    } catch (err: any) {
      setRapidStatus({ msg: err.message, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Book Shelf Data</h2>
          <p className="text-sm text-muted-foreground">Manage shelf and cupboard locations — in bulk or one book at a time.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><LibraryBig className="h-4 w-4" /> Quick Shelf Entry</CardTitle>
          <CardDescription>Search a book by title, author or accession number and set its shelf / cupboard instantly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search book title, author or accession number…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
              />
            </div>
            <Button onClick={runSearch} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>

          <div className="space-y-2">
            {matches.map(b => (
              <div key={b.id} className="flex flex-col md:flex-row md:items-center gap-2 p-3 rounded-xl border border-border/50 bg-card">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.author} {b.accession_number ? `· Acc: ${b.accession_number}` : ""}
                  </p>
                </div>
                <Input
                  className="md:w-32"
                  placeholder="Shelf no."
                  value={edits[b.id]?.shelf_number ?? ""}
                  onChange={e => setEdits(s => ({ ...s, [b.id]: { ...s[b.id], shelf_number: e.target.value } }))}
                />
                <Input
                  className="md:w-36"
                  placeholder="Cupboard no."
                  value={edits[b.id]?.cupboard_number ?? ""}
                  onChange={e => setEdits(s => ({ ...s, [b.id]: { ...s[b.id], cupboard_number: e.target.value } }))}
                />
                <Button size="sm" onClick={() => saveOne(b.id)} disabled={savingId === b.id}>
                  {savingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="ml-2 md:hidden">Save</span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 border-indigo-200 shadow-sm">
        <CardHeader className="bg-indigo-50/50 pb-4 border-b border-indigo-100 rounded-t-xl">
          <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
            <ScanBarcode className="h-5 w-5" /> Rapid Barcode Scanner
          </CardTitle>
          <CardDescription>Lock a cupboard and shelf, then scan book barcodes sequentially to auto-assign them.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Target Cupboard</Label>
              <Input 
                placeholder="e.g. C-12" 
                value={rapidCupboard} 
                onChange={e => setRapidCupboard(e.target.value)} 
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Shelf</Label>
              <Input 
                placeholder="e.g. S-3" 
                value={rapidShelf} 
                onChange={e => setRapidShelf(e.target.value)} 
                className="font-mono"
              />
            </div>
          </div>
          
          <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-inner">
            <Label className="text-sm font-semibold">Scan Barcode (Accession Number)</Label>
            <Input 
              placeholder="Scan or type and press Enter..." 
              value={rapidBarcode}
              onChange={e => setRapidBarcode(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") runRapidScan(); }}
              className="font-mono text-lg h-12 bg-white focus:border-indigo-500 focus:ring-indigo-500"
              autoFocus
            />
            {rapidStatus && (
              <p className={`text-sm mt-2 font-medium flex items-center gap-1 ${rapidStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {rapidStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
                {rapidStatus.msg}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Download className="h-4 w-4" /> Export Shelf Data</CardTitle>
            <CardDescription>Download every book with accession number, copies, shelf and cupboard numbers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={exportShelf} disabled={busy !== null}>
              {busy === "shelf-export" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export All Books
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-4 w-4" /> Import Shelf Data</CardTitle>
            <CardDescription>Upload the same CSV back — includes shelf_number and cupboard_number columns.</CardDescription>
          </CardHeader>
          <CardContent>
            <input ref={shelfInput} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importShelf(f); e.target.value = ""; }} />
            <Button variant="outline" className="w-full" onClick={() => shelfInput.current?.click()} disabled={busy !== null}>
              {busy === "shelf-import" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Shelf CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-sm">
            <strong>{result.updated}</strong> rows saved · <strong>{result.skipped}</strong> skipped
            {result.errors.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto text-xs text-destructive space-y-0.5">
                {result.errors.slice(0, 25).map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
