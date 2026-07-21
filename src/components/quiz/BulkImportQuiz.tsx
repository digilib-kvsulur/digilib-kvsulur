import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download,
  ChevronRight, Loader2, RefreshCw, BookOpen, HelpCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Question } from "@/types/quiz";

// ─── CSV Format Documentation ────────────────────────────────────────────────
// Required columns (case-insensitive, any order):
//   question        – The question text
//   option_a        – Option A text
//   option_b        – Option B text
//   option_c        – Option C text
//   option_d        – Option D text
//   correct_answer  – "A", "B", "C", or "D" (case-insensitive)
// Optional columns:
//   explanation     – Explanation shown after the student answers
//   points          – Points for this question (defaults to 5)
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedQuestion {
  rowIndex: number;
  question: Question | null;
  errors: string[];
}

interface QuizMeta {
  title: string;
  description: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  pointsReward: number;
}

interface ImportResult {
  quizId: string;
  title: string;
  questionsImported: number;
}

interface Props {
  onDone?: () => void;
}

const SAMPLE_CSV = `question,option_a,option_b,option_c,option_d,correct_answer,explanation,points
What is the capital of India?,Mumbai,New Delhi,Chennai,Kolkata,B,New Delhi has been India's capital since 1911.,5
Which planet is closest to the Sun?,Venus,Earth,Mercury,Mars,C,Mercury is the innermost planet in the Solar System.,5
Who wrote the national anthem of India?,Rabindranath Tagore,Mahatma Gandhi,Jawaharlal Nehru,Subhas Chandra Bose,A,Jana Gana Mana was composed by Rabindranath Tagore.,5
What is the formula for water?,H2SO4,NaCl,H2O,CO2,C,Water is composed of two hydrogen atoms and one oxygen atom.,5`;

const ANSWER_MAP: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function parseQuestions(csvText: string): ParsedQuestion[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const idx = (name: string) => headers.indexOf(name);

  const qIdx = idx("question");
  const aIdx = idx("option_a");
  const bIdx = idx("option_b");
  const cIdx = idx("option_c");
  const dIdx = idx("option_d");
  const corrIdx = idx("correct_answer");
  const expIdx = idx("explanation");
  const ptsIdx = idx("points");

  if ([qIdx, aIdx, bIdx, cIdx, dIdx, corrIdx].some((i) => i === -1)) {
    return [{
      rowIndex: 0,
      question: null,
      errors: ["Missing required columns. CSV must have: question, option_a, option_b, option_c, option_d, correct_answer"]
    }];
  }

  return rows.slice(1).map((row, i) => {
    const rowIndex = i + 2;
    const errors: string[] = [];

    const questionText = row[qIdx] || "";
    if (!questionText.trim()) errors.push("Question text is empty");

    const options = [row[aIdx] || "", row[bIdx] || "", row[cIdx] || "", row[dIdx] || ""];
    options.forEach((opt, oi) => {
      if (!opt.trim()) errors.push(`Option ${["A","B","C","D"][oi]} is empty`);
    });

    const answerRaw = (row[corrIdx] || "").trim().toLowerCase();
    const correctAnswer = ANSWER_MAP[answerRaw];
    if (correctAnswer === undefined) errors.push(`correct_answer "${row[corrIdx] || ""}" must be A, B, C, or D`);

    const points = ptsIdx >= 0 ? parseInt(row[ptsIdx] || "5", 10) : 5;
    if (isNaN(points) || points < 1) errors.push("points must be a positive number");

    if (errors.length > 0) {
      return { rowIndex, question: null, errors };
    }

    const q: Question = {
      id: `${Date.now()}_${rowIndex}`,
      question: questionText.trim(),
      options,
      correctAnswer,
      explanation: expIdx >= 0 ? (row[expIdx] || "").trim() || undefined : undefined,
      points: isNaN(points) ? 5 : points,
    };
    return { rowIndex, question: q, errors: [] };
  });
}

export default function BulkImportQuiz({ onDone }: Props) {
  const [meta, setMeta] = useState<QuizMeta>({
    title: "",
    description: "",
    subject: "",
    difficulty: "medium",
    timeLimit: 30,
    pointsReward: 100,
  });
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setParsed(parseQuestions(text));
    };
    reader.readAsText(file);
  };

  const handleTextPaste = (text: string) => {
    setCsvText(text);
    if (text.trim()) setParsed(parseQuestions(text));
  };

  const validQuestions = parsed.filter((p) => p.question !== null).map((p) => p.question!);
  const errorRows = parsed.filter((p) => p.errors.length > 0);
  const hasHeaderError = errorRows.length === 1 && errorRows[0].rowIndex === 0;

  const handleImport = async () => {
    if (!meta.title.trim()) {
      toast({ title: "Quiz title required", variant: "destructive" });
      return;
    }
    if (!meta.subject.trim()) {
      toast({ title: "Subject required", variant: "destructive" });
      return;
    }
    if (validQuestions.length === 0) {
      toast({ title: "No valid questions to import", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          title: meta.title.trim(),
          description: meta.description.trim() || null,
          subject: meta.subject.trim(),
          difficulty: meta.difficulty,
          time_limit: meta.timeLimit,
          points_reward: meta.pointsReward,
          questions: validQuestions as any,
          is_active: false,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      setImportResult({ quizId: data.id, title: meta.title.trim(), questionsImported: validQuestions.length });
      toast({ title: "Quiz imported!", description: `${validQuestions.length} questions saved successfully.` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setMeta({ title: "", description: "", subject: "", difficulty: "medium", timeLimit: 30, pointsReward: 100 });
    setCsvText("");
    setFileName("");
    setParsed([]);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_quiz_questions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (importResult) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-2xl font-bold text-green-800">Quiz Imported Successfully!</h3>
          <p className="text-green-700 font-medium">
            <strong>"{importResult.title}"</strong> has been saved with {importResult.questionsImported} questions.
          </p>
          <p className="text-sm text-green-600">The quiz is set to <strong>Inactive</strong> by default. Activate it from the Quiz Management tab when ready.</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button onClick={handleReset} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
              <RefreshCw className="h-4 w-4 mr-2" /> Import Another Quiz
            </Button>
            {onDone && (
              <Button onClick={onDone} className="bg-green-600 hover:bg-green-700 text-white">
                <ChevronRight className="h-4 w-4 mr-2" /> Back to Quiz Manager
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" /> Bulk Quiz Import
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Upload a CSV file of questions to create a new quiz instantly.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadSample}>
          <Download className="h-4 w-4 mr-2" /> Sample CSV
        </Button>
      </div>

      {/* CSV Format Guide */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-blue-700 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> Expected CSV Columns
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5">
            {[
              { col: "question", req: true },
              { col: "option_a", req: true },
              { col: "option_b", req: true },
              { col: "option_c", req: true },
              { col: "option_d", req: true },
              { col: "correct_answer", req: true },
              { col: "explanation", req: false },
              { col: "points", req: false },
            ].map(({ col, req }) => (
              <Badge key={col} variant={req ? "default" : "secondary"} className={`text-[10px] font-mono ${req ? "bg-blue-600" : ""}`}>
                {col}{!req && " (opt)"}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            <strong>correct_answer</strong> must be A, B, C, or D. Headers are case-insensitive.
          </p>
        </CardContent>
      </Card>

      {/* Quiz Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" /> Quiz Details
          </CardTitle>
          <CardDescription>Fill in the quiz details before uploading questions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="qi-title">Quiz Title <span className="text-red-500">*</span></Label>
              <Input
                id="qi-title"
                placeholder="e.g. Chapter 5 Science Quiz"
                value={meta.title}
                onChange={(e) => setMeta((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qi-subject">Subject <span className="text-red-500">*</span></Label>
              <Input
                id="qi-subject"
                placeholder="e.g. Science, Mathematics, English"
                value={meta.subject}
                onChange={(e) => setMeta((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qi-desc">Description</Label>
            <Textarea
              id="qi-desc"
              placeholder="Brief overview of the quiz (optional)"
              rows={2}
              value={meta.description}
              onChange={(e) => setMeta((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={meta.difficulty} onValueChange={(v) => setMeta((p) => ({ ...p, difficulty: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qi-time">Time Limit (minutes)</Label>
              <Input
                id="qi-time"
                type="number"
                min={1}
                max={180}
                value={meta.timeLimit}
                onChange={(e) => setMeta((p) => ({ ...p, timeLimit: parseInt(e.target.value) || 30 }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qi-pts">Points Reward</Label>
              <Input
                id="qi-pts"
                type="number"
                min={1}
                value={meta.pointsReward}
                onChange={(e) => setMeta((p) => ({ ...p, pointsReward: parseInt(e.target.value) || 100 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-500" /> Upload Questions CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">
              {fileName ? fileName : "Click to choose a CSV file"}
            </p>
            <p className="text-xs text-gray-400 mt-1">or drag & drop — CSV files only</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          <div className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest">— or paste CSV directly —</div>

          <Textarea
            placeholder="question,option_a,option_b,option_c,option_d,correct_answer,explanation,points&#10;What is 2+2?,1,2,3,4,D,,5"
            rows={6}
            value={csvText}
            onChange={(e) => handleTextPaste(e.target.value)}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* Preview & Validation */}
      {parsed.length > 0 && (
        <Card className={hasHeaderError ? "border-red-200 bg-red-50/40" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              {hasHeaderError ? (
                <><XCircle className="h-4 w-4 text-red-500" /> CSV Format Error</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /> Preview: {parsed.length} rows parsed</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasHeaderError ? (
              <p className="text-sm text-red-700 font-medium">{errorRows[0].errors[0]}</p>
            ) : (
              <>
                <div className="flex gap-4 text-sm font-semibold">
                  <span className="text-green-700 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> {validQuestions.length} valid questions
                  </span>
                  {errorRows.length > 0 && (
                    <span className="text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> {errorRows.length} rows with errors (will be skipped)
                    </span>
                  )}
                </div>

                {/* Progress bar showing valid ratio */}
                <div className="space-y-1">
                  <Progress value={(validQuestions.length / parsed.length) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">{Math.round((validQuestions.length / parsed.length) * 100)}% of rows are valid</p>
                </div>

                {/* Error detail list */}
                {errorRows.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 max-h-48 overflow-y-auto">
                    {errorRows.map((er) => (
                      <div key={er.rowIndex} className="text-xs">
                        <span className="font-bold text-amber-800">Row {er.rowIndex}:</span>{" "}
                        <span className="text-amber-700">{er.errors.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview first 3 valid questions */}
                {validQuestions.slice(0, 3).map((q, qi) => (
                  <div key={q.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <p className="text-sm font-semibold text-gray-800">{qi + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {q.options.map((opt, oi) => (
                        <p key={oi} className={`text-xs flex items-center gap-1.5 ${oi === q.correctAnswer ? "text-green-700 font-bold" : "text-gray-500"}`}>
                          {oi === q.correctAnswer && <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />}
                          <span>{["A","B","C","D"][oi]}. {opt}</span>
                        </p>
                      ))}
                    </div>
                    {q.explanation && <p className="text-[10px] text-gray-400 italic">💡 {q.explanation}</p>}
                  </div>
                ))}
                {validQuestions.length > 3 && (
                  <p className="text-xs text-center text-muted-foreground">…and {validQuestions.length - 3} more questions</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={handleReset} disabled={importing}>
          <RefreshCw className="h-4 w-4 mr-2" /> Reset
        </Button>
        <Button
          onClick={handleImport}
          disabled={importing || validQuestions.length === 0 || !meta.title.trim() || !meta.subject.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
        >
          {importing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Import {validQuestions.length > 0 ? `${validQuestions.length} Questions` : "Quiz"}</>
          )}
        </Button>
      </div>
    </div>
  );
}
