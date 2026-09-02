import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2, AlertTriangle, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const { toast } = useToast();

  const reset = () => {
    setRows([]);
    setResults([]);
    setFileName("");
    setAutofetch(false);
    setFilterStatus("all");
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResults([]);
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
          if (acc) accessionCounts[acc] = (accessionCounts[acc] || 0) + 1;
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
          if (acc && accessionCounts[acc] > 1) {
            if (status !== "error") status = "warning";
            notes.push(`Duplicate accession "${acc}" in CSV`);
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
    const out: { title: string; success: boolean; error?: string }[] = [];

    for (const r of importableRows) {
      const copies = Math.max(1, parseInt(r.total_copies || "1") || 1);
      const accession = r.accession_number || null;

      let fetchedDetails = {};
      if (autofetch) {
        try {
          const details = await fetchBookByQuery(r.title, r.author);
          if (details) {
            fetchedDetails = {
              description: details.description || null,
              cover_url: details.cover_url || null,
              category: details.category || null,
              subject: details.subject || null,
              language: details.language || null,
            };
          }
        } catch (err) {
          console.error("Autofetch error for book:", r.title, err);
        }
      }

      const { data: existing } = await supabase
        .from("books")
        .select("id, accession_numbers, total_copies, available_copies")
        .ilike("title", r.title)
        .maybeSingle();

      if (existing) {
        const currentAccs = Array.isArray(existing.accession_numbers) ? existing.accession_numbers : [];
        const newAccs = accession && !currentAccs.includes(accession) ? [...currentAccs, accession] : currentAccs;
        const copiesToAdd = Math.max(1, copies);
        const { error } = await supabase
          .from("books")
          .update({
            accession_numbers: newAccs,
            total_copies: existing.total_copies + copiesToAdd,
            available_copies: existing.available_copies + copiesToAdd,
          })
          .eq("id", existing.id);
        out.push({ title: r.title, success: !error, error: error?.message });
      } else {
        const accs = accession ? [accession] : [];
        const { error } = await supabase.from("books").insert({
          title: r.title,
          author: r.author,
          accession_number: accession,
          accession_numbers: accs,
          language: r.language?.trim() || (fetchedDetails as any).language || null,
          category: r.category?.trim() || (fetchedDetails as any).category || null,
          subject: r.subject?.trim() || (fetchedDetails as any).subject || null,
          class_level: r.class_level?.trim() || null,
          description: r.description?.trim() || (fetchedDetails as any).description || null,
          cover_url: (fetchedDetails as any).cover_url || null,
          total_copies: copies,
          available_copies: copies,
        });
        out.push({ title: r.title, success: !error, error: error?.message });
      }
    }

    setResults(out);
    const ok = out.filter((x) => x.success).length;
    toast({ title: "Import complete", description: `${ok}/${out.length} books added successfully.` });
    onImported?.();
    setLoading(false);
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

          <div className="flex items-center space-x-2 border rounded-lg p-3 bg-indigo-500/5 border-indigo-400/20">
            <input
              type="checkbox"
              id="bulk-autofetch"
              checked={autofetch}
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
