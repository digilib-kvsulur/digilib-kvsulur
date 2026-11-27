import { useEffect, useState } from "react";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import MathText from "@/components/student/MathText";

const SUBJECTS = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "Social Science", "English", "Hindi"];

type DoubtAnswer = {
  extracted_question?: string;
  answer?: string;
  final_answer?: string;
  formulas?: string[];
  confidence_note?: string;
};

export interface QuickAskAiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText?: string;
  studentClass?: string | number | null;
  subject?: string;
  chapterTitle?: string;
}

export default function QuickAskAiDialog({
  open,
  onOpenChange,
  selectedText = "",
  studentClass,
  subject: initialSubject = "",
  chapterTitle = "",
}: QuickAskAiDialogProps) {
  const parsedClass = Number(String(studentClass || "10").match(/\d+/)?.[0] || 10);
  const defaultClass = String(Math.min(12, Math.max(6, parsedClass)));

  const [classValue, setClassValue] = useState(defaultClass);
  const [subject, setSubject] = useState(initialSubject || "Science");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<DoubtAnswer | null>(null);

  useEffect(() => {
    if (!open) return;
    setClassValue(defaultClass);
    if (initialSubject && SUBJECTS.includes(initialSubject)) {
      setSubject(initialSubject);
    } else if (initialSubject) {
      setSubject(initialSubject);
    }
    const clean = selectedText.trim();
    const prefix = chapterTitle ? `From "${chapterTitle}":\n\n` : "";
    setQuestion(clean ? `${prefix}"${clean}"\n\nExplain this clearly.` : prefix);
    setAnswer(null);
    setError("");
  }, [open, selectedText, defaultClass, initialSubject, chapterTitle]);

  const ask = async (action: "solve" | "simpler" | "formula" = "solve") => {
    if (!subject.trim()) {
      setError("Choose a subject first.");
      return;
    }
    if (!question.trim()) {
      setError("Enter or select some text to ask about.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("solve-study-doubt", {
        body: {
          studentClass: classValue,
          subject,
          question: action === "solve" ? question : answer?.extracted_question || question,
          previousAnswer: action === "solve" ? undefined : answer?.answer,
          action,
        },
      });
      if (invokeError) {
        const response = (invokeError as { context?: Response })?.context;
        let message = invokeError.message || "Could not answer this doubt.";
        if (response && typeof response.clone === "function") {
          try {
            const body = await response.clone().json();
            if (body?.error) message = String(body.error);
          } catch {
            // keep default message
          }
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(String(data.error));
      setAnswer(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not process your doubt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-3 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            ASK DLMS AI
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Class</Label>
              <Select value={classValue} onValueChange={setClassValue}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 7 }, (_, i) => String(i + 6)).map((c) => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                  {initialSubject && !SUBJECTS.includes(initialSubject) && (
                    <SelectItem value={initialSubject}>{initialSubject}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="quick-ask-question" className="text-xs">Selected text / your doubt</Label>
            <textarea
              id="quick-ask-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="Paste or type the line you want explained…"
              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" onClick={() => ask("solve")} disabled={loading || !question.trim()} className="min-h-10 gap-2 rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Explain with AI
            </Button>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {answer && (
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <MathText text={answer.answer || ""} className="block break-words text-sm leading-7" />
              {answer.formulas?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formulas</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {answer.formulas.map((f, i) => (
                      <li key={i}><MathText text={f} /></li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {answer.final_answer && (
                <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Key takeaway</p>
                  <p className="mt-1 text-sm font-semibold"><MathText text={answer.final_answer} /></p>
                </div>
              )}
              {answer.confidence_note && (
                <p className="text-xs text-muted-foreground">{answer.confidence_note}</p>
              )}
              <div className="flex flex-wrap gap-2 border-t pt-2.5">
                <Button type="button" variant="outline" size="sm" onClick={() => ask("simpler")} disabled={loading}>
                  <Lightbulb className="mr-1.5 h-3.5 w-3.5" /> Explain simpler
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => ask("formula")} disabled={loading}>
                  Show formula
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
