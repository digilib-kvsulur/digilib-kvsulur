import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Copy, Loader2, PenLine, Sparkles, Target, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MarkdownBlock from "./MarkdownBlock";
import { useSpeech } from "./useSpeech";

const SUBJECTS = [
  "English", "Hindi", "Mathematics", "Science", "Physics", "Chemistry", "Biology",
  "Social Science", "History", "Geography", "Political Science", "Economics",
  "Computer Science", "Accountancy", "Business Studies",
];

type RubricRow = { criterion: string; score: number; max: number; comment: string };
type CoachResult = {
  overall?: string;
  scores?: RubricRow[];
  strengths?: string[];
  improvements?: string[];
  model_answer?: string;
  next_step?: string;
  sources?: Array<{ id: string; title: string; source_label?: string | null; source_url?: string | null }>;
};

const DRAFT_KEY = "dlms-answer-coach-draft";

function clampScore(row: RubricRow) {
  const max = Number(row.max) || 0;
  const score = Number(row.score) || 0;
  return { ...row, max, score: Math.max(0, Math.min(max, score)) };
}

export default function AnswerCoach({ studentClass, userId }: { studentClass: string; userId?: string }) {
  const classNumber = String(Math.min(12, Math.max(6, Number(String(studentClass || "").match(/\d+/)?.[0] || 10))));
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [marks, setMarks] = useState("5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CoachResult | null>(null);
  const { speak, stop, speaking, supported } = useSpeech();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${DRAFT_KEY}:${userId || "anon"}`);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (typeof draft?.subject === "string") setSubject(draft.subject);
      if (typeof draft?.question === "string") setQuestion(draft.question);
      if (typeof draft?.answer === "string") setAnswer(draft.answer);
      if (typeof draft?.marks === "string") setMarks(draft.marks);
    } catch {
      // A broken draft must not block the coach.
    }
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(`${DRAFT_KEY}:${userId || "anon"}`, JSON.stringify({ subject, question, answer, marks }));
      } catch {
        // Storage may be full or disabled.
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [subject, question, answer, marks, userId]);

  const wordCount = useMemo(() => answer.trim().split(/\s+/).filter(Boolean).length, [answer]);

  const submit = async () => {
    if (!subject) {
      setError("Choose the subject first.");
      return;
    }
    if (question.trim().length < 10) {
      setError("Paste the full question so the feedback can match it.");
      return;
    }
    if (answer.trim().length < 25) {
      setError("Write at least a few sentences before asking for feedback.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("study-answer-coach", {
        body: {
          studentClass: classNumber,
          subject,
          question: question.trim(),
          answer: answer.trim(),
          marks: Number(marks) || 5,
        },
      });
      if (invokeError) {
        const response = (invokeError as any)?.context as Response | undefined;
        let message = invokeError.message || "The answer coach is unavailable.";
        if (response && typeof response.clone === "function") {
          try {
            const body = await response.clone().json();
            if (body?.error) message = String(body.error);
          } catch {
            // Keep the invoke message.
          }
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(String(data.error));
      setResult(data as CoachResult);
      toast.success("Feedback ready");
    } catch (e: any) {
      setError(e?.message || "The answer could not be reviewed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyModel = async () => {
    if (!result?.model_answer) return;
    try {
      await navigator.clipboard.writeText(result.model_answer);
      toast.success("Model answer copied");
    } catch {
      toast.error("Could not copy on this device.");
    }
  };

  const scores = (result?.scores || []).map(clampScore);
  const total = scores.reduce((sum, row) => sum + row.score, 0);
  const maxTotal = scores.reduce((sum, row) => sum + row.max, 0);

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><PenLine className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">Answer-writing coach</p>
            <p className="text-xs text-muted-foreground">Write a full answer, then get criterion-based feedback on content, structure, evidence, and language. The model answer is a sample, not the only correct answer.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-none">
        <CardHeader className="pb-2"><CardTitle className="text-base">Your answer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label htmlFor="coach-subject" className="text-xs">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="coach-subject" className="mt-1 min-h-10 rounded-xl"><SelectValue placeholder="Choose subject" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="coach-marks" className="text-xs">Question marks</Label>
              <Input id="coach-marks" type="number" min={1} max={20} value={marks} onChange={(event) => setMarks(event.target.value)} className="mt-1 min-h-10 rounded-xl" />
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="min-h-10 w-full justify-center rounded-xl">Class {classNumber}</Badge>
            </div>
          </div>

          <div>
            <Label htmlFor="coach-question" className="text-xs">Question</Label>
            <textarea
              id="coach-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. Explain how the Indian Constitution balances the powers of the three organs of government."
              className="mt-1 min-h-[80px] w-full rounded-xl border bg-background p-3 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="coach-answer" className="text-xs">Your answer</Label>
              <span className="text-[11px] text-muted-foreground">{wordCount} words</span>
            </div>
            <textarea
              id="coach-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write the answer as you would in an exam. Include a clear opening, organised points, and a short conclusion."
              className="mt-1 min-h-[220px] w-full rounded-xl border bg-background p-3 text-sm leading-6"
            />
          </div>

          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Your draft stays on this device until you request feedback.</p>
            <Button type="button" className="min-h-11 rounded-xl" disabled={loading} onClick={() => void submit()}>
              {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {loading ? "Reviewing" : "Get feedback"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className="rounded-2xl shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-primary" /> Examiner view</CardTitle>
                {total > 0 && maxTotal > 0 && <p className="mt-1 text-xs text-muted-foreground">{total} of {maxTotal} marks on the rubric</p>}
              </div>
              {supported && result.overall && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-lg" aria-label={speaking ? "Stop reading" : "Read feedback"} onClick={() => (speaking ? stop() : speak(`${result.overall || ""} ${(result.improvements || []).join(". ")}`))}>
                  {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {result.overall && <p className="rounded-xl bg-muted/40 p-3 text-sm leading-6">{result.overall}</p>}
              {scores.length > 0 && (
                <div className="space-y-2">
                  {scores.map((row) => {
                    const percent = row.max > 0 ? Math.round((row.score / row.max) * 100) : 0;
                    return (
                      <div key={row.criterion} className="rounded-xl border p-2.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{row.criterion}</span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums">{row.score}/{row.max}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${row.criterion} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                          <div className={`h-full rounded-full ${percent >= 75 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${percent}%` }} />
                        </div>
                        {row.comment && <p className="mt-1.5 text-xs text-muted-foreground">{row.comment}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-2xl border-emerald-300/50 shadow-none">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> What works</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {(result.strengths || []).length ? (result.strengths || []).map((item, index) => <li key={index} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{item}</li>) : <li>No strengths were identified. That usually means the answer needs more specific content.</li>}
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-amber-300/50 shadow-none">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400"><Target className="h-4 w-4" /> Fix next</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {(result.improvements || []).length ? (result.improvements || []).map((item, index) => <li key={index} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{item}</li>) : <li>No major gaps were found. Try a harder question with the same structure.</li>}
                </ul>
              </CardContent>
            </Card>
          </div>

          {result.model_answer && (
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base">One strong model answer</CardTitle>
                <Button type="button" variant="ghost" size="sm" className="h-9 rounded-lg" onClick={() => void copyModel()}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button>
              </CardHeader>
              <CardContent>
                <MarkdownBlock className="reading-content">{result.model_answer}</MarkdownBlock>
                {result.next_step && <p className="mt-3 rounded-xl bg-primary/5 p-3 text-sm"><span className="font-semibold">Next step: </span>{result.next_step}</p>}
              </CardContent>
            </Card>
          )}

          {(result.sources || []).length > 0 && (
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-base">Sources used</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {(result.sources || []).map((source) => (
                  <div key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                    <span className="min-w-0 truncate">{source.title}</span>
                    {source.source_url ? <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">Open source</a> : <span className="text-xs text-muted-foreground">{source.source_label || "DLMS resource"}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
