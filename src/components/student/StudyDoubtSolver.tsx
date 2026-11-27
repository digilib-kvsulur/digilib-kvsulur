import { useEffect, useState } from "react";
import { Camera, ImagePlus, Lightbulb, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import MathText from "@/components/student/MathText";
import { openStudyMaterial } from "@/lib/studyMaterialAccess";

type Answer = { extracted_question?: string; answer?: string; final_answer?: string; formulas?: string[]; confidence_note?: string; sources?: { id: string; title: string; source_label?: string; source_url?: string }[]; related_resources?: { id: string; title: string; chapter?: string; year?: number; marks?: number; source_label?: string; file_url: string }[] };
const SUBJECTS = [
  "Mathematics", "Science", "Physics", "Chemistry", "Biology",
  "Computer Science", "Social Science", "History", "Geography",
  "Political Science", "Economics", "Accountancy", "Business Studies",
  "English", "Hindi",
];
const QUICK_PROMPTS = ["Explain step by step", "Give a simple example", "Show the key formula"];

function restoreHistoryAnswer(text: string) {
  const match = text.match(/\n\nFinal answer:\s*([\s\S]*?)(?:\n\n|$)/i);
  return {
    answer: match ? text.slice(0, match.index).trim() : text,
    final_answer: match?.[1]?.trim() || "Review the explanation above.",
  };
}

export default function StudyDoubtSolver({ userId, studentClass, onOpenResources }: { userId: string; studentClass?: string | number | null; onOpenResources: () => void }) {
  const parsedClass = Number(String(studentClass || "10").match(/\d+/)?.[0] || 10);
  const defaultClass = String(Math.min(12, Math.max(6, parsedClass)));
  const [classValue, setClassValue] = useState(defaultClass);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => { setClassValue(defaultClass); }, [defaultClass]);
  useEffect(() => {
    const prefill = window.sessionStorage.getItem("dlms-doubt-prefill");
    if (prefill) {
      setQuestion(prefill);
      window.sessionStorage.removeItem("dlms-doubt-prefill");
    }
  }, []);
  useEffect(() => {
    let alive = true;
    (supabase as any).from("study_doubt_history").select("id,student_class,subject,question_text,answer_text,formulas,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20).then(({ data }: any) => { if (alive) setHistory(data || []); });
    return () => { alive = false; };
  }, [userId, answer]);

  const ask = async (action = "solve") => {
    if (!subject) { setError("Choose the subject before asking."); return; }
    if (action === "solve" && !question.trim() && !image) { setError("Type your question or add a photo."); return; }
    setLoading(true); setError("");
    try {
      let imageBase64: string | undefined;
      if (image) imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("Could not read that image.")); reader.readAsDataURL(image);
      });
      const { data, error: invokeError } = await supabase.functions.invoke("solve-study-doubt", { body: { studentClass: classValue, subject, question: action === "solve" ? question : answer?.extracted_question || question, previousAnswer: action === "solve" ? undefined : answer?.answer, action, imageBase64: action === "solve" ? imageBase64 : undefined, mimeType: action === "solve" ? image?.type : undefined } });
      if (invokeError) {
        const response = (invokeError as any)?.context as Response | undefined;
        let message = invokeError.message || "Could not answer this question.";
        if (response && typeof response.clone === "function") {
          try {
            const body = await response.clone().json();
            if (body?.error) message = String(body.error);
          } catch {
            try {
              const text = await response.clone().text();
              if (text) message = text.slice(0, 300);
            } catch { /* keep fallback */ }
          }
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(String(data.error));
      setAnswer(data); setQuestion(data.extracted_question || question); setImage(null);
    } catch (e: any) { setError(e.message || "Could not solve this doubt."); }
    finally { setLoading(false); }
  };

  const attachImage = (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a JPG, PNG, or WebP image under 5 MB."); return; }
    setImage(file); setError("");
  };

  const openRelatedResource = async (url: string) => {
    try { await openStudyMaterial(url); } catch (e: any) { setError(e?.message || "This resource is unavailable right now."); }
  };

  return <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.7fr)] animate-in fade-in duration-200">
    <section className="space-y-4">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-600 p-5 text-white shadow-lg sm:p-7">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> AI DOUBT SOLVER
          </div>
          <h1 className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl">Let’s work through it together</h1>
          <p className="mt-1.5 text-xs sm:text-sm text-indigo-50 max-w-xl">Ask any question or attach a photo. Confirm your class and subject so the explanation matches your NCERT level.</p>
        </div>
      </header>
      <Card className="rounded-2xl border-border/70 shadow-sm"><CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class</Label><Select value={classValue} onValueChange={setClassValue}><SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 7 }, (_, i) => String(i + 6)).map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</Label><Select value={subject} onValueChange={setSubject}><SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Choose subject" /></SelectTrigger><SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="doubt-question" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your question</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuestion((q) => (q.trim() ? `${q.trim()}\n\n${chip}.` : `${chip}: `))}
                  className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>
          <textarea id="doubt-question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Type or paste a question here…" rows={5} maxLength={8000} className="flex w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition-colors hover:bg-muted"><Camera className="h-4 w-4" /> Take photo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => attachImage(e.target.files?.[0])} /></label>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition-colors hover:bg-muted"><ImagePlus className="h-4 w-4" /> Choose image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => attachImage(e.target.files?.[0])} /></label>
          {image && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary max-w-full truncate">{image.name}<button type="button" onClick={() => setImage(null)} className="ml-1 font-bold hover:text-destructive" aria-label="Remove image">×</button></span>}
          <Button className="ml-auto min-h-10 gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:opacity-95" disabled={loading || (!question.trim() && !image)} onClick={() => ask()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Solve question</Button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}<p className="text-xs text-muted-foreground">Up to 10 requests per hour. Photos are processed for the answer and are not retained in your history.</p>
      </CardContent></Card>
      {answer && <Card className="rounded-2xl border-primary/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-250"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-4 w-4 text-primary" /> Step-by-step explanation</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-xl bg-muted/50 p-3 text-sm"><span className="font-semibold">Question read:</span> {answer.extracted_question}</div><MathText text={answer.answer || ""} className="block break-words text-sm leading-7" />{answer.formulas?.length ? <div><h3 className="font-semibold">Formulas used</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{answer.formulas.map((f, i) => <li key={i}><MathText text={f} /></li>)}</ul></div> : null}<div className="rounded-xl border-l-4 border-primary bg-primary/5 p-3"><p className="text-xs font-bold uppercase tracking-wide text-primary">Final answer</p><p className="mt-1 font-bold"><MathText text={answer.final_answer || ""} /></p></div>{answer.confidence_note && <p className="text-xs text-muted-foreground">{answer.confidence_note}</p>}{answer.sources?.length ? <div className="space-y-1 border-t pt-3"><h3 className="text-sm font-semibold">DLMS sources used</h3>{answer.sources.map((source) => source.source_url ? <a key={source.id} href={source.source_url} target="_blank" rel="noreferrer" className="block text-sm text-primary hover:underline">{source.title}{source.source_label ? ` · ${source.source_label}` : ""}</a> : <p key={source.id} className="text-sm text-muted-foreground">{source.title}{source.source_label ? ` · ${source.source_label}` : " · DLMS reviewed resource"}</p>)}</div> : null}<div className="flex flex-wrap gap-2 border-t pt-3"><Button variant="outline" size="sm" className="rounded-xl" onClick={() => ask("simpler")} disabled={loading}><Lightbulb className="mr-1 h-4 w-4" /> Explain simpler</Button><Button variant="outline" size="sm" className="rounded-xl" onClick={() => ask("formula")} disabled={loading}>Show formula used</Button><Button variant="outline" size="sm" className="rounded-xl" onClick={() => ask("similar")} disabled={loading}><Search className="mr-1 h-4 w-4" /> Similar PYQs</Button><Button variant="outline" size="sm" className="rounded-xl" onClick={onOpenResources}>Open Study Resources</Button></div>{answer.related_resources && <div className="space-y-2 border-t pt-3"><h3 className="font-semibold">Matching resources</h3>{answer.related_resources.length ? answer.related_resources.map((resource) => <button key={resource.id} type="button" onClick={() => openRelatedResource(resource.file_url)} className="block w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/50"><p className="text-sm font-medium">{resource.title}</p><p className="mt-1 text-xs text-muted-foreground">{[resource.chapter, resource.year && `Year ${resource.year}`, resource.marks && `${resource.marks} marks`, resource.source_label].filter(Boolean).join(" · ")}</p></button>) : <p className="text-sm text-muted-foreground">No tagged matching PYQs are available yet. Browse all study resources for this class and subject.</p>}</div>}</CardContent></Card>}
    </section>
    <aside><Card className="rounded-2xl border-border/70 shadow-sm"><CardHeader><CardTitle className="text-base">Recent doubts</CardTitle></CardHeader><CardContent className="space-y-2.5">{history.length === 0 ? <p className="text-sm text-muted-foreground">Your solved questions will appear here.</p> : history.map((item) => <button key={item.id} type="button" onClick={() => { setQuestion(item.question_text); setSubject(item.subject); setClassValue(item.student_class); setAnswer({ extracted_question: item.question_text, ...restoreHistoryAnswer(item.answer_text), formulas: item.formulas }); }} className="block w-full rounded-xl border p-3 text-left transition-all duration-150 hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99]"><p className="line-clamp-2 text-sm font-medium">{item.question_text}</p><p className="mt-1 text-xs text-muted-foreground">Class {item.student_class} · {item.subject} · {new Date(item.created_at).toLocaleDateString()}</p></button>)}</CardContent></Card></aside>
  </div>;
}
