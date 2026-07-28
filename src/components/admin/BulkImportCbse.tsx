import { useState, useRef } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SAMPLE_CSV = `class_number,subject,category,chapter_title,chapter_number,file_url,description
10,Mathematics,Class 10 Syllabus 2025-26,Real Numbers,1,https://cbseacademic.nic.in/maths-10.pdf,Introduction to Real Numbers
10,Science,Class 10 Syllabus 2025-26,Chemical Reactions and Equations,1,https://cbseacademic.nic.in/science-10.pdf,Chemical reactions and equations
11,Physics,Class 11 Syllabus 2025-26,Physical World,1,https://cbseacademic.nic.in/physics-11.pdf,Introduction to Physics
12,Chemistry,Class 12 Syllabus 2025-26,The Solid State,1,https://cbseacademic.nic.in/chemistry-12.pdf,Solid state chemistry`;

const REQUIRED_COLUMNS = ["chapter_title", "file_url", "category"];

export default function BulkImportCbse({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ title: string; success: boolean; error?: string }[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    setResults([]);
    setParseError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data as any[];

        if (!rows.length) {
          setParseError("The CSV file is empty or could not be parsed.");
          return;
        }

        // Check that required columns exist
        const firstRow = rows[0];
        const missingCols = REQUIRED_COLUMNS.filter(col => !(col in firstRow));
        if (missingCols.length > 0) {
          setParseError(`Missing required columns: ${missingCols.join(", ")}. Please download the template and use the correct format.`);
          return;
        }

        setLoading(true);
        setProgress(0);
        const resList: { title: string; success: boolean; error?: string }[] = [];

        // Process in batches of 50
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < rows.length; i += batchSize) {
          batches.push(rows.slice(i, i + batchSize));
        }

        let processed = 0;
        for (const batch of batches) {
          const records = batch.map((r: any) => ({
            class_number: String(r.class_number || "10").trim(),
            subject: String(r.subject || "Mathematics").trim(),
            category: String(r.category || "CBSE Curriculum").trim(),
            chapter_title: String(r.chapter_title || "").trim(),
            chapter_number: parseInt(r.chapter_number) || null,
            file_url: String(r.file_url || "").trim(),
            description: r.description ? String(r.description).trim() : null,
          }));

          // Validate each record
          for (const r of records) {
            processed++;
            setProgress(Math.round((processed / rows.length) * 100));

            if (!r.chapter_title) {
              resList.push({ title: `Row ${processed}`, success: false, error: "Missing chapter_title" });
              continue;
            }
            if (!r.file_url) {
              resList.push({ title: r.chapter_title, success: false, error: "Missing file_url" });
              continue;
            }

            try {
              const { error } = await supabase
                .from("cbse_curriculum")
                .upsert(r, { onConflict: "class_number,subject,chapter_title", ignoreDuplicates: true });

              if (error) throw error;
              resList.push({ title: r.chapter_title, success: true });
            } catch (e: any) {
              // If upsert fails due to no unique constraint, fall back to plain insert
              try {
                const { error: insErr } = await supabase.from("cbse_curriculum").insert(r);
                if (insErr) throw insErr;
                resList.push({ title: r.chapter_title, success: true });
              } catch (e2: any) {
                resList.push({ title: r.chapter_title, success: false, error: e2.message });
              }
            }
          }
        }

        setResults(resList);
        setLoading(false);
        const ok = resList.filter(x => x.success).length;
        const fail = resList.filter(x => !x.success).length;
        if (ok > 0) {
          toast({ title: "Import complete", description: `${ok} entries added successfully.${fail > 0 ? ` ${fail} failed.` : ""}` });
          onImported?.();
        } else {
          toast({ title: "Import failed", description: "No entries were added. Check the error details below.", variant: "destructive" });
        }
      },
      error: (err) => {
        setParseError(`CSV parse error: ${err.message}`);
      }
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cbse-curriculum-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResults([]); setParseError(null); setProgress(0); } }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Bulk Import CBSE</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import CBSE Curriculum</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Download Template First</p>
              <p className="text-xs text-muted-foreground">Required columns: <code className="bg-slate-100 px-1 rounded">class_number, subject, category, chapter_title, chapter_number, file_url, description</code></p>
            </div>
            <Button size="sm" variant="secondary" onClick={downloadSample}><FileDown className="h-4 w-4 mr-2" /> Template</Button>
          </div>

          {/* Column guide */}
          <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-blue-700">Column Guide:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li><strong>class_number</strong>: 6–12 or "All"</li>
              <li><strong>subject</strong>: Mathematics, Science, Physics, Chemistry, Biology, etc.</li>
              <li><strong>category</strong>: Grouping label, e.g. "Class 10 Syllabus 2025-26" <span className="text-red-500">*required*</span></li>
              <li><strong>chapter_title</strong>: Name of the entry <span className="text-red-500">*required*</span></li>
              <li><strong>file_url</strong>: Direct link to PDF/portal page <span className="text-red-500">*required*</span></li>
              <li><strong>chapter_number</strong>: (optional) numeric order</li>
              <li><strong>description</strong>: (optional) short description</li>
            </ul>
          </div>

          {/* Parse error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* File upload */}
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-slate-50 cursor-pointer" onClick={() => !loading && fileInputRef.current?.click()}>
            <Upload className="h-8 w-8 text-slate-400 mb-4" />
            <p className="text-sm font-medium mb-1">Select CSV File</p>
            <p className="text-xs text-slate-500 mb-4">Upload your prepared CSV — click anywhere here</p>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing...</> : "Choose File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
              disabled={loading}
            />
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium"><span>Importing...</span><span>{progress}%</span></div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results summary */}
          {results.length > 0 && !loading && (
            <div className="space-y-2">
              <div className="flex gap-3 text-sm font-medium">
                {successCount > 0 && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {successCount} succeeded</span>}
                {failCount > 0 && <span className="text-rose-600 flex items-center gap-1"><XCircle className="h-4 w-4" /> {failCount} failed</span>}
              </div>
              {failCount > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {results.filter(r => !r.success).map((r, i) => (
                    <div key={i} className="flex items-start text-xs p-2 rounded-md bg-rose-50 gap-2">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-rose-600">{r.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
