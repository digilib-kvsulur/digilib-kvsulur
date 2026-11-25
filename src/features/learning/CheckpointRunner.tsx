import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseChapterPracticeSet } from "@/lib/chapterPractice";
import { toast } from "sonner";
import { submitCheckpoint } from "./api";
import MarkdownBlock from "./MarkdownBlock";
import type { CheckpointResult, StudyResource } from "./types";

export default function CheckpointRunner({
  resource,
  onClose,
  onResult,
}: {
  resource: StudyResource;
  onClose: () => void;
  onResult?: (result: CheckpointResult) => void;
}) {
  const parsed = useMemo(() => parseChapterPracticeSet(resource.markdown_content), [resource.markdown_content]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<CheckpointResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (parsed.error) {
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent className="p-5">
          <p role="alert" className="text-sm text-destructive">This checkpoint is not available: {parsed.error}</p>
          <Button type="button" variant="outline" className="mt-3 min-h-10 rounded-xl" onClick={onClose}>Go back</Button>
        </CardContent>
      </Card>
    );
  }

  const questions = parsed.data.questions;
  const answered = Object.keys(answers).length;

  const submit = async () => {
    if (answered < questions.length) {
      toast.error(`Answer all ${questions.length} questions first.`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = questions.map((_, index) => answers[index] ?? -1);
      const response = await submitCheckpoint(resource.id, payload);
      setResult(response);
      onResult?.(response);
      if (response.passed) toast.success(`Checkpoint passed with ${response.score}%${response.awarded ? ` · +${response.awarded} points` : ""}`);
      else toast.info(`You scored ${response.score}%. Review the explanations and try again.`);
    } catch (e: any) {
      setError(e?.message || "The checkpoint could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" className="min-h-10 rounded-lg" onClick={onClose}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to mastery
        </Button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="rounded-full">{resource.subject || "General"}</Badge>
          {resource.chapter_title && <Badge variant="outline" className="rounded-full">{resource.chapter_title}</Badge>}
          <Badge variant="outline" className="rounded-full">{questions.length} questions</Badge>
        </div>
      </div>

      <Card className="rounded-2xl shadow-none">
        <CardContent className="p-5">
          <h2 className="text-lg font-bold">{resource.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Score 80% or higher to pass. You can retake a checkpoint; your best score is kept.</p>
          {parsed.data.instructions && <p className="mt-2 rounded-lg bg-muted/40 p-3 text-sm">{parsed.data.instructions}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card className={`rounded-2xl shadow-none ${result.passed ? "border-emerald-300/70 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-amber-300/70 bg-amber-50/50 dark:bg-amber-950/20"}`}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className={`grid h-12 w-12 place-items-center rounded-full ${result.passed ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                {result.passed ? <CheckCircle2 className="h-6 w-6" /> : <RotateCcw className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-lg font-bold">{result.score}%</p>
                <p className="text-xs text-muted-foreground">{result.correct} of {result.total} correct · {result.passed ? "Passed" : "Not passed yet"}</p>
              </div>
            </div>
            {result.awarded > 0 && <Badge className="rounded-full"><Sparkles className="mr-1 h-3 w-3" /> +{result.awarded} points</Badge>}
            {!result.passed && (
              <Button type="button" size="sm" variant="outline" className="min-h-10 rounded-xl" onClick={() => { setResult(null); setAnswers({}); }}>
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {questions.map((question, index) => {
          const selected = answers[index];
          const correct = question.correct_index;
          return (
            <Card key={index} className="rounded-2xl shadow-none">
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
                  <MarkdownBlock className="min-w-0 flex-1">{question.prompt}</MarkdownBlock>
                </div>
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isCorrect = result && correct === optionIndex;
                    const isWrongSelection = result && isSelected && correct !== optionIndex;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={Boolean(result)}
                        aria-pressed={isSelected}
                        onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                        className={`flex min-h-11 w-full items-start gap-2.5 rounded-xl border p-3 text-left text-sm transition-colors ${
                          isCorrect
                            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                            : isWrongSelection
                              ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30"
                              : isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/40"
                        }`}
                      >
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span className="min-w-0 flex-1">{option}</span>
                        {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                        {isWrongSelection && <XCircle className="h-4 w-4 shrink-0 text-rose-600" />}
                      </button>
                    );
                  })}
                </div>
                {result && (
                  <div className="rounded-xl bg-muted/40 p-3 text-sm">
                    <p className="font-medium">Explanation</p>
                    <MarkdownBlock className="mt-1 text-muted-foreground">{question.explanation}</MarkdownBlock>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {!result && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur">
          <p className="text-xs text-muted-foreground">{answered} of {questions.length} answered</p>
          <Button type="button" className="min-h-11 rounded-xl" disabled={submitting || answered < questions.length} onClick={() => void submit()}>
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            Submit checkpoint
          </Button>
        </div>
      )}
    </div>
  );
}
