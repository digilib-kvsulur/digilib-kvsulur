import { useRef, useState } from "react";
import Papa from "papaparse";
import { Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export interface ChallengeEvaluationRow {
  submission_id: string;
  status: string;
  award_xp: number;
  feedback: string;
}

interface Props {
  label: string;
  fileName: string;
  records: Record<string, unknown>[];
  allowedStatuses: string[];
  onApply: (rows: ChallengeEvaluationRow[]) => Promise<{ updated: number; skipped: number }>;
}

const normalizeHeader = (header: string) => {
  const key = header.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["id", "submission_id", "report_id"].includes(key)) return "submission_id";
  if (["award_xp", "xp", "points_awarded", "reward_xp"].includes(key)) return "award_xp";
  if (["feedback", "admin_feedback", "review_note"].includes(key)) return "feedback";
  return key;
};

export default function ChallengeEvaluationCsvTools({ label, fileName, records, allowedStatuses, onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ChallengeEvaluationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadCsv = () => {
    if (!records.length) return;
    const csv = Papa.unparse(records, { header: true });
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const chooseFile = (file: File) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete: ({ data, meta, errors }) => {
        if (errors.length || !meta.fields?.includes("submission_id") || !meta.fields.includes("status")) {
          toast({ title: "Evaluation CSV is invalid", description: "Include submission_id and status columns, and check the file formatting.", variant: "destructive" });
          return;
        }
        const seen = new Set<string>();
        const parsed = data.map((item) => {
          const submissionId = String(item.submission_id ?? "").trim();
          const status = String(item.status ?? "").trim().toLowerCase();
          const rawXp = String(item.award_xp ?? "0").trim();
          const awardXp = rawXp === "" ? 0 : Number(rawXp);
          const feedback = String(item.feedback ?? "").trim();
          if (!submissionId || seen.has(submissionId) || !allowedStatuses.includes(status) || !Number.isInteger(awardXp) || awardXp < 0) return null;
          seen.add(submissionId);
          return { submission_id: submissionId, status, award_xp: awardXp, feedback };
        }).filter((row): row is ChallengeEvaluationRow => row !== null);
        if (!parsed.length) {
          toast({ title: "No valid evaluation rows", description: `Check submission IDs, statuses (${allowedStatuses.join(", ")}), and XP amounts.`, variant: "destructive" });
          return;
        }
        setRows(parsed);
        setOpen(true);
      },
    });
  };

  const applyEvaluations = async () => {
    setLoading(true);
    try {
      const result = await onApply(rows);
      toast({ title: `${label} import complete`, description: `${result.updated} updated, ${result.skipped} skipped.` });
      setOpen(false);
      setRows([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error: any) {
      toast({ title: `${label} import failed`, description: error.message || "Unable to import evaluations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!records.length}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Download Evaluation CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Evaluations
        </Button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => event.target.files?.[0] && chooseFile(event.target.files[0])} />
      </div>
      <Dialog open={open} onOpenChange={(value) => { if (!loading) setOpen(value); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import {label} Evaluations</DialogTitle>
            <DialogDescription>Review the parsed decisions before applying them. Only still-pending submissions will be changed.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[55vh] rounded-md border">
            <div className="divide-y text-sm">
              {rows.map((row) => (
                <div key={row.submission_id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 px-3 py-2.5">
                  <div className="min-w-0"><p className="font-medium truncate">{row.submission_id}</p>{row.feedback && <p className="text-xs text-muted-foreground truncate">{row.feedback}</p>}</div>
                  <span className="capitalize">{row.status}</span>
                  <span>{row.award_xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={applyEvaluations} disabled={loading || rows.length === 0}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying…</> : `Apply ${rows.length} Evaluation${rows.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
