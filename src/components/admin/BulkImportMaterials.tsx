import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const SAMPLE_CSV = `title,description,subject,student_class,chapter_title,resource_type,academic_session,exam_year,marks,file_url,source_label,source_url,markdown_content
"Class 6 Mathematics · Chapter 1 · Short Notes","Original explanation for teacher review","Mathematics","6","Chapter 1 – Patterns in Mathematics","short_notes","2026-27","","","","NCERT textbook for reference","https://ncert.nic.in/textbook.php","## Main idea\nAdd an original, age-appropriate explanation here. Do not copy textbook passages.\n\n## Worked example\nAdd a checked example and explain each step."`;

interface ResultRow { title: string; success: boolean; error?: string }

const BulkImportMaterials = ({ onImported }: { onImported?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const { toast } = useToast();

  const reset = () => {
    setRows([]);
    setResults([]);
    setFileName("");
    setServerError(null);
    setProgressPercent(0);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setServerError(null);
    setResults([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => {
        const clean = h.trim().toLowerCase().replace(/\s+/g, "_");
        if (clean === "material_title" || clean === "name") return "title";
        if (clean === "url" || clean === "link") return "file_url";
        if (clean === "class" || clean === "class_level") return "student_class";
        return clean;
      },
      complete: (res) => {
        try {
          const raw = (res.data as any[]).filter((r) => r.title && (r.file_url || r.markdown_content));
          const allowedTypes = new Set(["chapter_lesson", "short_notes", "formula_sheet", "pyq", "quick_revision", "textbook", "other"]);
          const cleaned = raw.map((r) => {
          const fileUrl = String(r.file_url || "").trim();
          const markdown = String(r.markdown_content || "").trim();
          const parsedClass = String(r.student_class || "All").trim().replace(/^class\s*/i, "");
          const resourceType = String(r.resource_type || "short_notes").trim().toLowerCase();
          const sourceUrl = String(r.source_url || "").trim();
          if (parsedClass !== "All" && !/^(6|7|8|9|10|11|12)$/.test(parsedClass)) throw new Error(`Invalid class '${parsedClass}' for ${r.title}`);
          if (!allowedTypes.has(resourceType)) throw new Error(`Invalid resource_type '${resourceType}' for ${r.title}`);
          if (markdown && (!String(r.subject || "").trim() || !String(r.student_class || "").trim() || !String(r.chapter_title || "").trim() || !String(r.academic_session || "").trim() || !String(r.source_label || "").trim() || !sourceUrl)) {
            throw new Error(`Markdown resource '${r.title}' needs class, subject, chapter, session, and source details.`);
          }
          for (const candidate of [fileUrl, sourceUrl]) {
            if (!candidate) continue;
            let parsed: URL;
            try { parsed = new URL(candidate); } catch { throw new Error(`Invalid URL for ${r.title}`); }
            if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`Only HTTP(S) URLs are allowed for ${r.title}`);
          }
          const examYear = r.exam_year ? Number(r.exam_year) : null;
          const marks = r.marks ? Number(r.marks) : null;
          if (examYear !== null && (!Number.isInteger(examYear) || examYear < 1900 || examYear > 2100)) throw new Error(`Invalid exam_year for ${r.title}`);
          if (marks !== null && (!Number.isInteger(marks) || marks < 1 || marks > 100)) throw new Error(`Invalid marks for ${r.title}`);
          if (resourceType === "pyq" && (examYear === null || marks === null || !sourceUrl)) throw new Error(`PYQ '${r.title}' needs its year, marks, and source URL.`);
          return {
            title: String(r.title).trim(),
            description: String(r.description || "").trim() || null,
            subject: String(r.subject || "General").trim(),
            student_class: parsedClass,
            chapter_title: String(r.chapter_title || "").trim() || null,
            resource_type: resourceType,
            academic_session: String(r.academic_session || "2026-27").trim(),
            exam_year: examYear,
            marks,
            file_url: fileUrl,
            file_name: fileUrl ? (fileUrl.split("/").pop() || "Document") : null,
            file_type: fileUrl ? "application/pdf" : "text/markdown",
            source_label: String(r.source_label || "").trim() || null,
            source_url: sourceUrl || null,
            markdown_content: markdown || null,
          };
          });
          setRows(cleaned);
          if (cleaned.length === 0) {
            toast({ title: "No valid rows", description: "Each row needs a title and either a file_url or markdown_content.", variant: "destructive" });
          } else {
            toast({ title: `${cleaned.length} materials ready`, description: "Review preview below then click Import." });
          }
        } catch (error: any) {
          setRows([]);
          setServerError(error.message || "The CSV contains invalid material metadata.");
        }
      },
      error: (err) => toast({ title: "Parse error", description: err.message, variant: "destructive" }),
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study-materials-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setServerError(null);
    setResults([]);
    setProgressPercent(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const records = rows.map(r => ({
        title: r.title,
        description: r.description,
        subject: r.subject,
        student_class: r.student_class,
        chapter_title: r.chapter_title,
        resource_type: r.resource_type,
        academic_session: r.academic_session,
        exam_year: r.exam_year,
        marks: r.marks,
        source_label: r.source_label,
        source_url: r.source_url,
        markdown_content: r.markdown_content,
        file_url: r.file_url,
        file_name: r.file_name,
        file_type: r.file_type,
        review_status: "pending",
        uploaded_by: user.id
      }));

      // Insert in chunks of 50
      const CHUNK_SIZE = 50;
      const importResults: ResultRow[] = [];

      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from("study_materials").insert(chunk);
        
        chunk.forEach(item => {
          importResults.push({
            title: item.title,
            success: !error,
            error: error ? error.message : undefined
          });
        });

        setProgressPercent(Math.round(((i + chunk.length) / records.length) * 100));
      }

      setResults(importResults);
      const successCount = importResults.filter(r => r.success).length;
      toast({ title: "Import completed", description: `Successfully imported ${successCount} of ${records.length} materials.` });
      if (onImported) onImported();
    } catch (e: any) {
      setServerError(e.message || "Failed to import materials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-indigo-200 hover:bg-slate-50 font-bold text-slate-700 shadow-sm">
          <Upload className="h-4 w-4 mr-2" /> Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="h-6 w-6 text-primary" /> Bulk Import Study Materials
          </DialogTitle>
          <DialogDescription>
            Upload PDF links or Markdown resources in a CSV. Every imported item enters teacher review before students can see it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
          {/* Instructions */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-3">
            <h4 className="font-bold text-sm text-slate-800">CSV Template Instructions:</h4>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              <li>Required: <code className="bg-slate-200 px-1 rounded font-mono font-bold">title</code> and either <code className="bg-slate-200 px-1 rounded font-mono font-bold">file_url</code> or <code className="bg-slate-200 px-1 rounded font-mono font-bold">markdown_content</code>.</li>
              <li>Curriculum fields: <code className="font-mono">student_class</code>, <code className="font-mono">subject</code>, <code className="font-mono">chapter_title</code>, <code className="font-mono">resource_type</code>, and <code className="font-mono">academic_session</code>.</li>
              <li>Use <code className="font-mono">source_label</code> and <code className="font-mono">source_url</code> for provenance. Imported rows are always pending review.</li>
              <li>Class values: 6–12 or <code className="font-mono">All</code>. Resource types: chapter_lesson, short_notes, formula_sheet, pyq, quick_revision, textbook, other.</li>
            </ul>
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={downloadSample}>
              <FileDown className="h-3.5 w-3.5 mr-1" /> Download Sample CSV
            </Button>
          </div>

          {/* File Picker */}
          {!fileName && (
            <div className="border-2 border-dashed border-slate-200 hover:border-primary/40 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700">Click to upload or drag & drop CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts only standard .csv files</p>
            </div>
          )}

          {fileName && !loading && results.length === 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-bold text-xs bg-white">CSV</Badge>
                <span className="font-medium text-slate-800 truncate max-w-xs">{fileName}</span>
                <span className="text-xs text-muted-foreground">({rows.length} rows)</span>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive h-8 px-2" onClick={reset}>Change</Button>
            </div>
          )}

          {/* Progress bar */}
          {loading && (
            <div className="space-y-2 py-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing study materials...</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {/* Server Error Alert */}
          {serverError && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Grid Preview */}
          {rows.length > 0 && results.length === 0 && (
            <div className="border rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-50 border-b p-2 px-3 text-xs font-bold text-slate-700">Preview (First 10 records)</div>
              <ScrollArea className="h-40">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2 pl-3">Title</th>
                      <th className="p-2">Subject</th>
                      <th className="p-2">Class</th>
                      <th className="p-2">Chapter / type</th>
                      <th className="p-2">Content</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2 pl-3 font-semibold text-slate-800 truncate max-w-[120px]">{r.title}</td>
                        <td className="p-2 text-slate-600">{r.subject}</td>
                        <td className="p-2 text-slate-600">{r.student_class}</td>
                        <td className="p-2 text-slate-600">{r.chapter_title || "—"} · {r.resource_type}</td>
                        <td className="p-2 text-slate-600">{r.markdown_content ? "Markdown" : "File link"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          {/* Result view */}
          {results.length > 0 && (
            <div className="border rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-50 border-b p-2 px-3 text-xs font-bold text-slate-700 flex justify-between">
                <span>Import Results</span>
                <span className="text-success">{results.filter(r => r.success).length} Successful</span>
              </div>
              <ScrollArea className="h-48">
                <div className="divide-y divide-slate-100">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 px-3 justify-between hover:bg-slate-50">
                      <span className="text-xs font-semibold truncate flex-1 text-slate-800 max-w-xs">{r.title}</span>
                      {r.success ? (
                        <Badge className="bg-success/15 hover:bg-success/20 text-success border-0 text-[10px] flex items-center gap-1 py-0.5"><CheckCircle2 className="h-3 w-3" /> Imported</Badge>
                      ) : (
                        <Badge className="bg-destructive/15 hover:bg-destructive/20 text-destructive border-0 text-[10px] flex items-center gap-1 py-0.5 max-w-[180px] truncate" title={r.error}><XCircle className="h-3 w-3 shrink-0" /> {r.error || "Failed"}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" className="rounded-xl h-10" onClick={() => setOpen(false)} disabled={loading}>
            {results.length > 0 ? "Close" : "Cancel"}
          </Button>
          {rows.length > 0 && results.length === 0 && (
            <Button className="gradient-primary border-0 rounded-xl h-10 font-bold" onClick={submit} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : `Import ${rows.length} Materials`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportMaterials;
