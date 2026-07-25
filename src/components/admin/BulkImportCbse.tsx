import { useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const SAMPLE_CSV = `class_number,subject,category,chapter_title,chapter_number,file_url,description
10,Mathematics,Core,Chapter 1 - Real Numbers,1,https://example.com/math1.pdf,Introduction to Real Numbers
10,Science,Core,Chapter 1 - Chemical Reactions,1,https://example.com/sci1.pdf,Chemical reactions and equations`;

export default function BulkImportCbse({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ title: string; success: boolean; error?: string }[]>([]);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    setResults([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data as any[];
        if (!rows.length) {
          toast({ title: "Empty file", variant: "destructive" });
          return;
        }

        setLoading(true);
        setProgress(0);
        const resList = [];
        
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          try {
            if (!r.chapter_title || !r.file_url) throw new Error("Missing chapter_title or file_url");
            
            const { error } = await supabase.from("cbse_curriculum").insert({
              class_number: r.class_number || "10",
              subject: r.subject || "Mathematics",
              category: r.category || "CBSE Curriculum",
              chapter_title: r.chapter_title,
              chapter_number: parseInt(r.chapter_number) || null,
              file_url: r.file_url,
              description: r.description || null
            });

            if (error) throw error;
            resList.push({ title: r.chapter_title, success: true });
          } catch (e: any) {
            resList.push({ title: r.chapter_title || `Row ${i + 1}`, success: false, error: e.message });
          }
          setProgress(Math.round(((i + 1) / rows.length) * 100));
        }

        setResults(resList);
        setLoading(false);
        const ok = resList.filter(x => x.success).length;
        if (ok > 0) {
          toast({ title: "Import complete", description: `${ok} entries added successfully.` });
          onImported?.();
        } else {
          toast({ title: "Import failed", description: "No entries were added.", variant: "destructive" });
        }
      },
      error: (err) => {
        toast({ title: "Parse error", description: err.message, variant: "destructive" });
      }
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cbse-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Bulk Import CBSE</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import CBSE Curriculum</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Download Template</p>
              <p className="text-xs text-muted-foreground">Use this CSV format to prepare your data</p>
            </div>
            <Button size="sm" variant="secondary" onClick={downloadSample}><FileDown className="h-4 w-4 mr-2" /> Template</Button>
          </div>

          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-slate-50">
            <Upload className="h-8 w-8 text-slate-400 mb-4" />
            <p className="text-sm font-medium mb-1">Select CSV File</p>
            <p className="text-xs text-slate-500 mb-4">Upload your formatted CSV</p>
            <label>
              <Button type="button" variant="outline" disabled={loading} className="pointer-events-none">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Choose File"}
              </Button>
              <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} disabled={loading} />
            </label>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium"><span>Importing...</span><span>{progress}%</span></div>
              <Progress value={progress} />
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center text-xs p-2 rounded-md bg-slate-50">
                  {r.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 shrink-0" /> : <XCircle className="h-4 w-4 text-rose-500 mr-2 shrink-0" />}
                  <span className="truncate flex-1 font-medium">{r.title}</span>
                  {!r.success && <span className="text-rose-500 ml-2 truncate max-w-[200px]" title={r.error}>{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
