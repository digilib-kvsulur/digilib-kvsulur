import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { fetchBookByQuery } from "@/lib/bookApi";

const SAMPLE_CSV = `book_name,author_name,acession_number,total_copies
The Alchemist,Paulo Coelho,KV-ACC-1001,3
Wings of Fire,A.P.J. Abdul Kalam,KV-ACC-1002,5
Physics Class 11,NCERT,KV-ACC-1003,10`;

export interface ParsedBookRow {
  title: string;
  author: string;
  accession_number?: string;
  total_copies?: string;
  language?: string;
  category?: string;
  subject?: string;
  class_level?: string;
  description?: string;
  status: "valid" | "warning" | "error";
  validationNotes: string[];
}

const BulkImportBooks = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedBookRow[]>([]);
  const [results, setResults] = useState<{ title: string; success: boolean; error?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [autofetch, setAutofetch] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "valid" | "warning" | "error">("all");
  const [completedRows, setCompletedRows] = useState(0);
  const [totalImportRows, setTotalImportRows] = useState(0);
  const [importPhase, setImportPhase] = useState("");
  const { toast } = useToast();

  const reset = () => {
    setRows([]);
    setResults([]);
    setFileName("");
    setAutofetch(false);
    setFilterStatus("all");
    setCompletedRows(0);
    setTotalImportRows(0);
    setImportPhase("");
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResults([]);
    setCompletedRows(0);
    setTotalImportRows(0);
    setImportPhase("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => {
        const clean = h.trim().toLowerCase().replace(/\s+/g, "_");
        if (clean === "book_name" || clean === "book_title" || clean === "name" || clean === "title") return "title";
        if (clean === "author_name" || clean === "author") return "author";
        if (clean === "acession_number" || clean === "accession_number" || clean === "accession") return "accession_number";
        return clean;
      },
      complete: (res) => {
        const rawData = res.data as any[];
        const accessionCounts: Record<string, number> = {};

        // Track accession duplicates
        rawData.forEach((r) => {
          const acc = (r.accession_number || r.accession || "")?.trim();
          if (acc) accessionCounts[acc.toLowerCase()] = (accessionCounts[acc.toLowerCase()] || 0) + 1;
        });

        const validatedRows: ParsedBookRow[] = rawData.map((r) => {
          const title = String(r.title || "").trim();
          const author = String(r.author || "").trim();
          const acc = (r.accession_number || r.accession || "").trim();
          const notes: string[] = [];

          let status: "valid" | "warning" | "error" = "valid";

          if (!title) {
            status = "error";
            notes.push("Missing Book Title");
          }
          if (!author) {
            status = "error";
            notes.push("Missing Author Name");
          }
          if (acc && accessionCounts[acc.toLowerCase()] > 1) {
            status = "error";
            notes.push(`Duplicate accession "${acc}" in CSV; each accession must be unique`);
          }
          if (r.total_copies && isNaN(Number(r.total_copies))) {
            if (status !== "error") status = "warning";
            notes.push("Non-numeric copies; defaults to 1");
          }

          if (notes.length === 0) {
            notes.push("Ready to import");
          }

          return {
            title,
            author,
            accession_number: acc || undefined,
            total_copies: r.total_copies,
            language: r.language,
            category: r.category,
            subject: r.subject,
            class_level: r.class_level,
            description: r.description,
            status,
            validationNotes: notes,
          };
        });

        setRows(validatedRows);

        const validCount = validatedRows.filter((r) => r.status === "valid").length;
        const errCount = validatedRows.filter((r) => r.status === "error").length;

        if (validatedRows.length === 0) {
          toast({
            title: "No data found",
            description: "CSV must contain columns for Title and Author.",
            variant: "destructive",
          });
        } else if (errCount > 0) {
          toast({
            title: "CSV Validation Complete",
            description: `Found ${validCount} valid rows and ${errCount} error rows needing review.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "CSV Pre-validation Passed",
            description: `${validCount} books validated and ready for import.`,
          });
        }
      },
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "books-sample.csv";
    a.click();
  };

  const submit = async () => {
    const importableRows = rows.filter((r) => r.status !== "error");
    if (importableRows.length === 0) return;
    setLoading(true);
    setResults([]);
    setCompletedRows(0);
    setTotalImportRows(importableRows.length);
    setImportPhase("Checking catalog for existing accessions…");
    const out: ({ title: string; success: boolean; error?: string } | undefined)[] = Array(importableRows.length).fill(undefined);
    let completed = 0;
    const recordResult = (index: number, result: { title: string; success: boolean; error?: string }) => {
      out[index] = result;
      completed++;
      setCompletedRows(completed);
    };

    try {
      // Fetch the catalog once instead of doing a title lookup for every imported row.
      type ExistingBook = {
        id: string; title: string; author: string; accession_number: string | null; accession_numbers: string[] | null;
        total_copies: number; available_copies: number; language: string | null; category: string | null;
        subject: string | null; class_level: string | null; description: string | null; cover_url: string | null;
      };
      const catalog: ExistingBook[] = [];
      const batchSize = 1000;
      for (let from = 0; ; from += batchSize) {
        const { data, error } = await supabase.from("books")
          .select("id, title, author, accession_number, accession_numbers, total_copies, available_copies, language, category, subject, class_level, description, cover_url")
          .range(from, from + batchSize - 1);
        if (error) throw error;
        catalog.push(...((data || []) as ExistingBook[]));
        if (!data || data.length < batchSize) break;
      }

      const titleBooks = new Map<string, ExistingBook>();
      const existingAccessions = new Set<string>();
      for (const book of catalog) {
        const key = book.title.trim().toLowerCase();
        if (!titleBooks.has(key)) titleBooks.set(key, book);
        if (book.accession_number?.trim()) existingAccessions.add(book.accession_number.trim().toLowerCase());
        for (const accession of book.accession_numbers || []) if (accession?.trim()) existingAccessions.add(accession.trim().toLowerCase());
      }
      const duplicateInCatalog = new Set(importableRows
        .map(row => row.accession_number?.trim())
        .filter((accession): accession is string => Boolean(accession && existingAccessions.has(accession.toLowerCase())))
        .map(accession => accession.toLowerCase()));
      const rowGroups = new Map<string, number[]>();
      importableRows.forEach((row, index) => {
        const key = row.title.trim().toLowerCase();
        rowGroups.set(key, [...(rowGroups.get(key) || []), index]);
      });
      const groups = Array.from(rowGroups.values());
      setImportPhase(`Importing ${importableRows.length} rows…`);

      // Rows with the same title stay sequential to avoid competing updates; distinct titles import concurrently.
      let nextGroup = 0;
      const worker = async () => {
        while (nextGroup < groups.length) {
          const groupIndex = nextGroup++;
          for (const rowIndex of groups[groupIndex]) {
            const row = importableRows[rowIndex];
            const accession = row.accession_number?.trim() || null;
            if (accession && duplicateInCatalog.has(accession.toLowerCase())) {
              recordResult(rowIndex, { title: row.title, success: false, error: `Accession ${accession} already exists in the catalog` });
              continue;
            }
            try {
              const copies = Math.max(1, parseInt(row.total_copies || "1", 10) || 1);
              let fetchedDetails: Record<string, string | null> = {};
              if (autofetch) {
                try {
                  const details = await fetchBookByQuery(row.title, row.author);
                  if (details) fetchedDetails = {
                    description: details.description || null,
                    cover_url: details.cover_url || null,
                    category: details.category || null,
                    subject: details.subject || null,
                    language: details.language || null,
                  };
                } catch (err) {
                  console.error("Autofetch error for book:", row.title, err);
                }
              }

              const existing = titleBooks.get(row.title.trim().toLowerCase());
              if (existing) {
                const currentAccs = Array.from(new Set([...(existing.accession_numbers || []), existing.accession_number || ""].filter(Boolean)));
                if (accession && currentAccs.some(value => value.trim().toLowerCase() === accession.toLowerCase())) {
                  recordResult(rowIndex, { title: row.title, success: false, error: `Accession ${accession} already exists for this title` });
                  continue;
                }
                const newAccs = accession ? [...currentAccs, accession] : currentAccs;
                const { error } = await supabase.from("books").update({
                  accession_numbers: newAccs,
                  accession_number: existing.accession_number || accession,
                  total_copies: existing.total_copies + copies,
                  available_copies: existing.available_copies + copies,
                }).eq("id", existing.id);
                if (error) throw error;
                existing.accession_numbers = newAccs;
                existing.accession_number = existing.accession_number || accession;
                existing.total_copies += copies;
                existing.available_copies += copies;
              } else {
                const accs = accession ? [accession] : [];
                const { data, error } = await supabase.from("books").insert({
                  title: row.title,
                  author: row.author,
                  accession_number: accession,
                  accession_numbers: accs,
                  language: row.language?.trim() || fetchedDetails.language || null,
                  category: row.category?.trim() || fetchedDetails.category || null,
                  subject: row.subject?.trim() || fetchedDetails.subject || null,
                  class_level: row.class_level?.trim() || null,
                  description: row.description?.trim() || fetchedDetails.description || null,
                  cover_url: fetchedDetails.cover_url || null,
                  total_copies: copies,
                  available_copies: copies,
                }).select("id, title, author, accession_number, accession_numbers, total_copies, available_copies, language, category, subject, class_level, description, cover_url").single();
                if (error) throw error;
                titleBooks.set(row.title.trim().toLowerCase(), data as ExistingBook);
              }
              if (accession) existingAccessions.add(accession.toLowerCase());
              recordResult(rowIndex, { title: row.title, success: true });
            } catch (error: any) {
              recordResult(rowIndex, { title: row.title, success: false, error: error.message || "Import failed" });
            }
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, groups.length) }, () => worker()));

      const finishedResults = out.filter((result): result is { title: string; success: boolean; error?: string } => Boolean(result));
      setResults(finishedResults);
      const succeeded = finishedResults.filter(result => result.success).length;
      toast({ title: "Import complete", description: `${succeeded}/${finishedResults.length} books added successfully.` });
      onImported?.();
    } catch (error: any) {
      toast({ title: "Import stopped", description: error.message || "Could not load catalog data for import.", variant: "destructive" });
    } finally {
      setLoading(false);
      setImportPhase("");
    }
  };

  const validRows = rows.filter((r) => r.status === "valid");
  const warningRows = rows.filter((r) => r.status === "warning");
  const errorRows = rows.filter((r) => r.status === "error");

  const filteredRows = rows.filter((r) => {
    if (filterStatus === "valid") return r.status === "valid";
    if (filterStatus === "warning") return r.status === "warning";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Bulk Import Books
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file containing book records. Required columns: <code>title</code> and <code>author</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="outline" size="sm" onClick={downloadSample}>
              <FileDown className="h-4 w-4 mr-2" /> Sample CSV
            </Button>
            <label className="inline-flex">
                <input
                type="file"
                accept=".csv"
                className="hidden"
                  disabled={loading}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent cursor-pointer font-medium">
                <Upload className="h-4 w-4 mr-2" /> Choose CSV File
              </span>
            </label>
            {fileName && (
              <Badge variant="secondary" className="self-center">
                {fileName} · {rows.length} Total Rows
              </Badge>
            )}
          </div>

          {loading && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium">{importPhase}</span>
                <span className="tabular-nums text-muted-foreground">{completedRows} / {totalImportRows} rows</span>
              </div>
              <Progress value={importPhase.startsWith("Checking") ? 5 : totalImportRows ? (completedRows / totalImportRows) * 100 : 0} className="h-2" />
            </div>
          )}

          <div className="flex items-center space-x-2 border rounded-lg p-3 bg-indigo-500/5 border-indigo-400/20">
            <input
              type="checkbox"
              id="bulk-autofetch"
              checked={autofetch}
              disabled={loading}
              onChange={(e) => setAutofetch(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="bulk-autofetch" className="text-xs font-semibold text-foreground cursor-pointer select-none">
              Auto-fetch missing covers and descriptions from internet (Google Books / Open Library)
            </label>
          </div>

          {/* Validation Summary Bar */}
          {rows.length > 0 && results.length === 0 && (
            <div className="border rounded-xl p-3 bg-muted/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 items-center text-xs">
                <span className="font-semibold text-muted-foreground">Validation Results:</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {validRows.length} Valid
                </Badge>
                {warningRows.length > 0 && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <AlertTriangle className="h-3 w-3 mr-1" /> {warningRows.length} Warnings
                  </Badge>
                )}
                {errorRows.length > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <XCircle className="h-3 w-3 mr-1" /> {errorRows.length} Errors
                  </Badge>
                )}
              </div>

              {/* Filter Toggles */}
              <div className="flex gap-1">
                {(["all", "valid", "warning", "error"] as const).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={filterStatus === st ? "default" : "ghost"}
                    className="h-7 text-[11px] capitalize px-2.5"
                    onClick={() => setFilterStatus(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Pre-validation Preview Table */}
          {rows.length > 0 && results.length === 0 && (
            <ScrollArea className="max-h-[35vh] border rounded-lg overflow-hidden">
              <div className="divide-y text-xs">
                {filteredRows.map((r, i) => (
                  <div
                    key={i}
                    className={`p-2.5 flex items-center justify-between gap-3 ${
                      r.status === "error"
                        ? "bg-destructive/5"
                        : r.status === "warning"
                        ? "bg-amber-500/5"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {r.status === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : r.status === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold text-foreground mr-2">
                          {r.title || "(Missing Title)"}
                        </span>
                        <span className="text-muted-foreground">by {r.author || "(Missing Author)"}</span>
                        {r.accession_number && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0">
                            Acc: {r.accession_number}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{r.validationNotes.join("; ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Import Results Output */}
          {results.length > 0 && (
            <ScrollArea className="max-h-[35vh] border rounded-lg">
              <div className="bg-muted px-3 py-2 text-xs font-semibold border-b">
                Import Status: {results.filter((r) => r.success).length} succeeded /{" "}
                {results.filter((r) => !r.success).length} failed
              </div>
              <div className="divide-y text-xs">
                {results.map((r, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="font-medium truncate max-w-md">{r.title}</span>
                    {r.error && <span className="text-destructive text-[11px] ml-auto">{r.error}</span>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={submit}
            disabled={loading || rows.length === 0 || rows.every((r) => r.status === "error") || results.length > 0}
            className="gradient-primary border-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...
              </>
            ) : (
              `Import ${rows.filter((r) => r.status !== "error").length} Books`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportBooks;
