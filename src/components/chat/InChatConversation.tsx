import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, MessageCircle, Send, X } from "lucide-react";

export interface ConversationStep {
  key: string;
  question: string;
  type: "text" | "textarea" | "choice";
  placeholder?: string;
  maxLength?: number;
  optional?: boolean;
  options?: { label: string; value: string }[];
}

interface InChatConversationProps {
  title: string;
  subtitle: string;
  steps: ConversationStep[];
  initialAnswers?: Record<string, string>;
  summary: (answers: Record<string, string>) => string[];
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => Promise<void | string>;
  submitLabel: string;
  showHeader?: boolean;
}

export const InChatConversation = ({
  title,
  subtitle,
  steps,
  initialAnswers = {},
  summary,
  onClose,
  onSubmit,
  submitLabel,
  showHeader = true,
}: InChatConversationProps) => {
  const [answers, setAnswers] = useState(initialAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<{ role: "assistant" | "user"; text: string }[]>([
    { role: "assistant", text: steps[0]?.question || "Let's get started." },
  ]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript, reviewing, error]);

  const step = steps[stepIndex];

  const answerStep = (answer: string) => {
    if (!step || saving) return;
    const value = answer.trim();
    if (!value && !step.optional) {
      setError("Please enter an answer to continue.");
      return;
    }
    const nextAnswers = { ...answers };
    if (value) nextAnswers[step.key] = value;
    else if (!step.optional) nextAnswers[step.key] = value;
    const nextIndex = stepIndex + 1;
    setAnswers(nextAnswers);
    setDraft("");
    setError("");
    setTranscript((items) => [
      ...items,
      { role: "user", text: value || "Skip" },
      ...(nextIndex < steps.length
        ? [{ role: "assistant" as const, text: steps[nextIndex].question }]
        : [{ role: "assistant" as const, text: "Thanks. Here’s a summary—check it before I submit." }]),
    ]);
    setStepIndex(nextIndex);
    if (nextIndex >= steps.length) setReviewing(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const reply = await onSubmit(answers);
      setSubmitted(true);
      if (reply) setTranscript((items) => [...items, { role: "assistant", text: reply }]);
    } catch (submitError: any) {
      setError(submitError?.message || "Could not save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 text-xs">
      {showHeader && <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15"><MessageCircle className="h-3.5 w-3.5 text-primary" /></div>
          <div><p className="font-bold text-[11px] text-foreground">{title}</p><p className="text-[9px] text-muted-foreground">{subtitle}</p></div>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={onClose} aria-label="Close">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>}

      <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
        {transcript.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[90%] rounded-2xl px-3 py-2 leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted/70 text-foreground rounded-bl-sm"}`}>
              {message.text}
            </p>
          </div>
        ))}

        {reviewing && !submitted && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 space-y-1.5">
            {summary(answers).map((line, index) => <p key={index} className="text-[10px] text-foreground">{line}</p>)}
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {!reviewing && !submitted && step?.type === "choice" && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {step.options?.map((option) => (
            <Button key={option.value} type="button" size="sm" variant="outline" className="h-auto min-h-8 whitespace-normal rounded-xl px-2.5 py-1.5 text-[10px]" onClick={() => answerStep(option.value)}>
              {option.label}
            </Button>
          ))}
        </div>
      )}

      {!reviewing && !submitted && step?.type !== "choice" && (
        <form className="px-3 pb-3 flex items-end gap-1.5" onSubmit={(event) => { event.preventDefault(); answerStep(draft); }}>
          {step?.type === "textarea" ? (
            <Textarea autoFocus value={draft} maxLength={step.maxLength || 2000} onChange={(event) => setDraft(event.target.value)} placeholder={step.placeholder} className="min-h-16 max-h-28 text-xs rounded-xl" />
          ) : (
            <Input autoFocus value={draft} maxLength={step?.maxLength || (step?.key === "subject" ? 150 : 200)} onChange={(event) => setDraft(event.target.value)} placeholder={step?.placeholder || "Type your reply…"} className="h-9 text-xs rounded-xl" />
          )}
          <Button type="submit" size="icon" aria-label="Send reply" disabled={saving || (!draft.trim() && !step?.optional)} className="h-9 w-9 shrink-0 rounded-full">
            <Send className="h-4 w-4" />
          </Button>
          {step?.optional && <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-[10px]" onClick={() => answerStep("")}>Skip</Button>}
        </form>
      )}

      {reviewing && !submitted && (
        <div className="px-3 pb-3 flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" disabled={saving} onClick={() => { setReviewing(false); setStepIndex(steps.length - 1); setTranscript((items) => [...items, { role: "assistant", text: steps[steps.length - 1].question }]); }}>
            Edit last answer
          </Button>
          <Button type="button" size="sm" className="h-9 flex-1 rounded-xl" disabled={saving} onClick={handleSubmit}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</> : <><Check className="h-3.5 w-3.5 mr-1.5" /> {submitLabel}</>}
          </Button>
        </div>
      )}

      {submitted && (
        <div className="px-3 pb-3 flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9 flex-1 rounded-xl" onClick={() => {
            setAnswers(initialAnswers);
            setStepIndex(0);
            setDraft("");
            setReviewing(false);
            setSubmitted(false);
            setError("");
            setTranscript([{ role: "assistant", text: steps[0]?.question || "Let's get started." }]);
          }}>Start another</Button>
          <Button type="button" size="sm" className="h-9 flex-1 rounded-xl" onClick={onClose}>Done</Button>
        </div>
      )}

      {error && <p role="alert" className="px-3 pb-3 text-[10px] text-destructive">{error}</p>}
    </div>
  );
};
