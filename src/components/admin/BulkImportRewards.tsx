import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type Mode = "levels" | "badges";

interface Props {
  mode: Mode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported?: () => void;
}

interface ParsedRow {
  index: number;
  data: Record<string, any>;
  errors: string[];
}

const TEMPLATES: Record<Mode, { headers: string[]; sample: string[][]; filename: string }> = {
  levels: {
    headers: ["level_number", "name", "min_points", "max_points", "icon_name", "color", "description"],
    sample: [
      ["1", "Beginner Reader", "0", "99", "book-open", "#6b7280", "Just getting started"],
      ["2", "Page Turner", "100", "299", "star", "#3b82f6", "Building a reading habit"],
      ["3", "Book Master", "300", "", "crown", "#f59e0b", "Top of the library"],
    ],
    filename: "levels-template.csv",
  },
  badges: {
    headers: ["name", "description", "icon_name", "color", "points", "criteria_type", "criteria_value", "is_active"],
    sample: [
      ["First Book", "Borrow your first book", "Award", "text-primary", "10", "books_issued", "1", "true"],
      ["Quiz Whiz", "Complete 10 quizzes", "Trophy", "text-amber-500", "50", "quizzes_completed", "10", "true"],
      ["Librarian's Pick", "Awarded by the librarian", "Crown", "text-purple-500", "100", "manual", "0", "true"],
    ],
    filename: "badges-template.csv",
  },
};

const CRIT_TYPES = [
  "manual", "points", "books_read", "quizzes_completed", "login_streak",
  "posts_count", "comments_count", "friends_count", "books_issued", "reviews_count",
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ""));
}

const num = (v: string) => (v?.trim() === "" || v == null ? null : Number(v));

export default function BulkImportRewards({ mode, open, onOpenChange, onImported }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const tpl = TEMPLATES[mode];

  const reset = () => { setRows([]); setFileName(""); };

  const downloadTemplate = () => {
    const csv = [tpl.headers.join(","), ...tpl.sample.map(r => r.map(v => (v.includes(",") ? `"${v}"` : v)).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = tpl.filename; a.click();
    URL.revokeObjectURL(url);
  };

  const validate = (rec: Record<string, string>, index: number): ParsedRow => {
    const errors: string[] = [];
    let data: Record<string, any> = {};

    if (mode === "levels") {
      const lvl = num(rec.level_number ?? "");
      const min = num(rec.min_points ?? "");
      const max = num(rec.max_points ?? "");
      if (lvl == null || !Number.isInteger(lvl) || lvl < 1) errors.push("level_number must be a whole number ≥ 1");
      if (!rec.name?.trim()) errors.push("name is required");
      if (min == null || isNaN(min) || min < 0) errors.push("min_points must be 0 or more");
      if (max != null && (isNaN(max) || (min != null && max <= min))) errors.push("max_points must be greater than min_points (or blank)");
      data = {
        level_number: lvl,
        name: rec.name?.trim(),
        min_points: min,
        max_points: max,
        icon_name: rec.icon_name?.trim() || "star",
        color: rec.color?.trim() || "#3b82f6",
        description: rec.description?.trim() || "",
      };
    } else {
      const pts = num(rec.points ?? "");
      const critType = (rec.criteria_type?.trim() || "manual").toLowerCase();
      const critVal = num(rec.criteria_value ?? "");
      if (!rec.name?.trim()) errors.push("name is required");
      if (pts == null || isNaN(pts) || pts < 0) errors.push("points must be 0 or more");
      if (!CRIT_TYPES.includes(critType)) errors.push(`criteria_type must be one of: ${CRIT_TYPES.join(", ")}`);
      if (critType !== "manual" && (critVal == null || critVal < 1)) errors.push("criteria_value must be 1 or more for automatic badges");
      const active = (rec.is_active?.trim() || "true").toLowerCase();
      data = {
        name: rec.name?.trim(),
        description: rec.description?.trim() || "",
        icon_name: rec.icon_name?.trim() || "Award",
        color: rec.color?.trim() || "text-primary",
        points: pts,
        criteria_type: critType,
        criteria_value: critVal ?? 0,
        is_active: !["false", "0", "no"].includes(active),
      };
    }
    return { index, data, errors };
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast({ title: "Unsupported file", description: "Please upload a .csv file.", variant: "destructive" });
      setRows([]);
      return;
    }
    const text = await file.text();
    const grid = parseCsv(text);
    if (grid.length < 2) {
      toast({ title: "Empty file", description: "No data rows found below the header.", variant: "destructive" });
      setRows([]);
      return;
    }
    const headers = grid[0].map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const missing = tpl.headers.filter(h => !["max_points", "description", "icon_name", "color", "is_active", "criteria_value"].includes(h) && !headers.includes(h));
    if (missing.length) {
      toast({ title: "Missing columns", description: `Add these columns: ${missing.join(", ")}`, variant: "destructive" });
      setRows([]);
      return;
    }
    const parsed = grid.slice(1).map((r, i) => {
      const rec: Record<string, string> = {};
      headers.forEach((h, hi) => { rec[h] = (r[hi] ?? "").trim(); });
      return validate(rec, i + 2);
    });
    setRows(parsed);
  };

  const valid = rows.filter(r => r.errors.length === 0);
  const invalid = rows.filter(r => r.errors.length > 0);

  const runImport = async () => {
    if (!valid.length) return;
    setImporting(true);
    let created = 0, updated = 0, failed = 0;
    try {
      const key = mode === "levels" ? "level_number" : "name";
      const { data: existing } = await supabase.from(mode as any).select(`id, ${key}`);
      const map = new Map<string, string>();
      (existing || []).forEach((e: any) => map.set(String(e[key]).toLowerCase(), e.id));

      for (const row of valid) {
        const id = map.get(String(row.data[key]).toLowerCase());
        const payload = { ...row.data, updated_at: new Date().toISOString() };
        const res = id
          ? await supabase.from(mode as any).update(payload).eq("id", id)
          : await supabase.from(mode as any).insert([payload]);
        if (res.error) { failed++; console.error(res.error); }
        else if (id) updated++; else created++;
      }
      toast({
        title: "Import finished",
        description: `${created} added, ${updated} updated${failed ? `, ${failed} failed` : ""}.`,
      });
      onImported?.();
      if (!failed) { reset(); onOpenChange(false); }
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk import {mode === "levels" ? "levels" : "badges"}
          </DialogTitle>
          <DialogDescription>
            Upload a spreadsheet saved as CSV. Existing {mode === "levels" ? "level numbers" : "badge names"} are updated, new ones are added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download template
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }}
              />
              <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground cursor-pointer hover:opacity-90">
                <Upload className="h-4 w-4 mr-2" /> Choose CSV file
              </span>
            </label>
            {fileName && <span className="text-sm text-muted-foreground self-center">{fileName}</span>}
          </div>

          <p className="text-xs text-muted-foreground">
            Columns: {tpl.headers.join(", ")}
          </p>

          {rows.length > 0 && (
            <>
              <div className="flex gap-2">
                <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {valid.length} ready</Badge>
                {invalid.length > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {invalid.length} with problems</Badge>}
              </div>

              <div className="border rounded-md max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Row</th>
                      <th className="text-left p-2">{mode === "levels" ? "Level" : "Badge"}</th>
                      <th className="text-left p-2">Details</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.index} className="border-t align-top">
                        <td className="p-2">{r.index}</td>
                        <td className="p-2 font-medium">
                          {mode === "levels" ? `${r.data.level_number ?? "?"} · ${r.data.name || "—"}` : r.data.name || "—"}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {mode === "levels"
                            ? `${r.data.min_points ?? "?"} – ${r.data.max_points ?? "∞"} XP`
                            : `${r.data.points ?? 0} XP · ${r.data.criteria_type}${r.data.criteria_value ? ` (${r.data.criteria_value})` : ""}`}
                        </td>
                        <td className="p-2">
                          {r.errors.length === 0
                            ? <span className="text-success">Ready</span>
                            : <span className="text-destructive">{r.errors.join("; ")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset} disabled={importing}>Clear</Button>
                <Button onClick={runImport} disabled={!valid.length || importing}>
                  {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</> : `Import ${valid.length} row(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
