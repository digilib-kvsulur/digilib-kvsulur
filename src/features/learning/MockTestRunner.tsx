import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Clock3, FileText, Loader2, Play, Send, Trophy, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchLearningResources, fetchMockAttempts, fetchMockResult, startMock, submitMock } from "./api";
import MarkdownBlock from "./MarkdownBlock";
import type { MockAttemptRow, MockResultResponse, MockStartResponse, MockSubmitResult, StudyResource } from "./types";

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function answerKey(sectionIndex: number, questionIndex: number) {
  return `${sectionIndex}-${questionIndex}`;
}

export default function MockTestRunner({ studentClass }: { studentClass: string }) {
  const [papers, setPapers] = useState<StudyResource[]>([]);
  const [attempts, setAttempts] = useState<MockAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [starting, setStarting] = useState("");
  const [active, setActive] = useState<MockStartResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MockSubmitResult | null>(null);
  const [review, setReview] = useState<MockResultResponse | null>(null);
  const [reviewOpen, setReviewOpen] = useState(true);
  const answersRef = useRef<Record<string, string | number>>({});
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [paperRows, attemptRows] = await Promise.all([
        fetchLearningResources(studentClass, ["mock_paper"]),
        fetchMockAttempts(),
      ]);
      setPapers(paperRows);
      setAttempts(attemptRows);
    } catch (e: any) {
      setError(e?.message || "Mock papers could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [studentClass]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submit = useCallback(async () => {
    if (!active || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await submitMock(active.attempt_id, answersRef.current);
      setResult(response);
      try {
        setReview(await fetchMockResult(active.attempt_id));
      } catch {
        setReview(null);
      }
      setAttempts(await fetchMockAttempts());
      toast.success(`Submitted: ${response.score}/${response.max_score} (${response.percent}%)`);
    } catch (e: any) {
      toast.error(e?.message || "The test could not be submitted.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active || result) return;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(active.expires_at).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [active, result]);

  useEffect(() => {
    if (active && !result && remaining === 0 && !submittingRef.current) {
      void submit();
    }
  }, [active, remaining, result, submit]);

  const start = async (paper: StudyResource) => {
    setStarting(paper.id);
    try {
      const data = await startMock(paper.id);
      setActive(data);
      setAnswers({});
      answersRef.current = {};
      setResult(null);
      setReview(null);
      setRemaining(Math.max(0, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)));
    } catch (e: any) {
      toast.error(e?.message || "This paper could not be started.");
    } finally {
      setStarting("");
    }
  };

  const viewAttempt = async (attempt: MockAttemptRow) => {
    if (attempt.status !== "submitted") {
      toast.info("This attempt was not submitted.");
      return;
    }
    try {
      const detail = await fetchMockResult(attempt.id);
      setActive(null);
      setResult({
        attempt_id: attempt.id,
        score: attempt.score || 0,
        max_score: attempt.max_score || 0,
        percent: attempt.max_score ? Math.round(((attempt.score || 0) / attempt.max_score) * 100) : 0,
        section_scores: attempt.section_scores || [],
      });
      setReview(detail);
      setReviewOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "The result could not be loaded.");
    }
  };

  const backToPapers = () => {
    setActive(null);
    setResult(null);
    setReview(null);
    setAnswers({});
    answersRef.current = {};
    void load();
  };

  const subjects = useMemo(() => Array.from(new Set(papers.map((paper) => paper.subject || "General"))).sort(), [papers]);
  const visiblePapers = papers.filter((paper) => subjectFilter === "all" || (paper.subject || "General") === subjectFilter);
  const totalQuestions = active?.paper.sections.reduce((sum, section) => sum + section.questions.length, 0) || 0;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading mock papers…</CardContent></Card>;
  }

  if (error) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3 min-h-10 rounded-xl" onClick={() => void load()}>Try again</Button></CardContent></Card>;
  }

  if (result) {
    const sections = review?.paper.sections || [];
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <Button type="button" variant="ghost" size="sm" className="min-h-10 rounded-lg" onClick={backToPapers}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to papers
        </Button>
        <Card className={`rounded-2xl shadow-none ${result.percent >= 40 ? "border-emerald-300/60" : "border-amber-300/60"}`}>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><Trophy className="h-7 w-7" /></div>
            <div>
              <h2 className="text-xl font-black">{result.score} / {result.max_score}</h2>
              <p className="text-sm text-muted-foreground">{result.percent}% · objective questions only</p>
            </div>
            {result.section_scores.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {result.section_scores.map((section) => (
                  <div key={section.name} className="rounded-xl border p-2.5 text-left">
                    <p className="truncate text-xs font-medium">{section.name}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{section.score} / {section.max}</span>
                      <span>{section.max > 0 ? Math.round((section.score / section.max) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Written answers are saved with the attempt but are not auto-graded.</p>
          </CardContent>
        </Card>

        {review && (
          <Card className="rounded-2xl shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-base">Answer review</CardTitle>
              <Button type="button" variant="ghost" size="sm" className="h-9 rounded-lg" onClick={() => setReviewOpen((value) => !value)}>
                {reviewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardHeader>
            {reviewOpen && (
              <CardContent className="space-y-4">
                {sections.map((section, sectionIndex) => (
                  <div key={`${section.name}-${sectionIndex}`} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.name || `Section ${sectionIndex + 1}`}</p>
                    {(section.questions || []).map((question, questionIndex) => {
                      const key = answerKey(sectionIndex, questionIndex);
                      const studentAnswer = review.attempt.answers?.[key];
                      const isObjective = Array.isArray(question.options) && question.options.length > 0;
                      const selectedIndex = typeof studentAnswer === "string" && /^[0-9]+$/.test(studentAnswer) ? Number(studentAnswer) : -1;
                      const correct = typeof question.correct_index === "number" ? question.correct_index : -1;
                      const isCorrect = isObjective && selectedIndex === correct;
                      return (
                        <div key={key} className="rounded-xl border p-3">
                          <div className="flex items-start gap-2">
                            {isObjective ? (
                              isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                            ) : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                            <div className="min-w-0 flex-1">
                              <MarkdownBlock>{question.prompt || ""}</MarkdownBlock>
                              {isObjective ? (
                                <div className="mt-2 space-y-1 text-xs">
                                  {question.options?.map((option, optionIndex) => (
                                    <p key={optionIndex} className={`rounded-lg px-2 py-1 ${optionIndex === correct ? "bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : optionIndex === selectedIndex ? "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300" : "text-muted-foreground"}`}>
                                      {String.fromCharCode(65 + optionIndex)}. {option}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">{studentAnswer || "No written answer saved."}</p>
                              )}
                              {question.explanation && <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{question.explanation}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}
      </div>
    );
  }

  if (active) {
    const urgent = remaining <= 300;
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 pb-20">
        <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{active.paper.title}</p>
            <p className="text-xs text-muted-foreground">{active.paper.subject} · {answeredCount}/{totalQuestions} answered</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${urgent ? "bg-rose-600 text-white" : "bg-primary/10 text-primary"}`} role="timer" aria-live="off">
            <Clock3 className="h-4 w-4" /> {formatClock(remaining)}
          </div>
        </div>

        {active.paper.sections.map((section, sectionIndex) => (
          <Card key={`${section.name}-${sectionIndex}`} className="rounded-2xl shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{section.name || `Section ${sectionIndex + 1}`}</span>
                <Badge variant="outline" className="rounded-full">{section.marks_per_question} mark{section.marks_per_question === 1 ? "" : "s"} each</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.questions.map((question, questionIndex) => {
                const key = answerKey(sectionIndex, questionIndex);
                const selected = answers[key];
                const objective = Array.isArray(question.options) && question.options.length > 0;
                return (
                  <div key={key} className="space-y-2 rounded-xl border p-3">
                    <div className="flex items-start gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold">{questionIndex + 1}</span>
                      <MarkdownBlock className="min-w-0 flex-1">{question.prompt || ""}</MarkdownBlock>
                    </div>
                    {objective ? (
                      <div className="space-y-1.5">
                        {question.options?.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            type="button"
                            aria-pressed={selected === optionIndex}
                            onClick={() => setAnswers((current) => ({ ...current, [key]: optionIndex }))}
                            className={`flex min-h-10 w-full items-start gap-2 rounded-lg border p-2.5 text-left text-sm ${selected === optionIndex ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                          >
                            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold">{String.fromCharCode(65 + optionIndex)}</span>
                            <span className="min-w-0 flex-1">{option}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        value={typeof selected === "string" ? selected : ""}
                        onChange={(event) => setAnswers((current) => ({ ...current, [key]: event.target.value }))}
                        placeholder="Write your answer. It will be saved with the attempt."
                        className="min-h-[90px] w-full rounded-xl border bg-background p-3 text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur">
          <p className="text-xs text-muted-foreground">The test submits automatically when the timer ends.</p>
          <Button type="button" className="min-h-11 shrink-0 rounded-xl" disabled={submitting} onClick={() => void submit()}>
            {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Submit test
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Mock tests</p>
            <p className="text-xs text-muted-foreground">Timed papers with server-side scoring. Your written answers are saved too.</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">{papers.length} paper{papers.length === 1 ? "" : "s"}</Badge>
        </CardContent>
      </Card>

      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {["all", ...subjects].map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setSubjectFilter(subject)}
              aria-pressed={subjectFilter === subject}
              className={`min-h-10 rounded-full border px-3 text-sm font-medium ${subjectFilter === subject ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"}`}
            >
              {subject === "all" ? "All subjects" : subject}
            </button>
          ))}
        </div>
      )}

      {visiblePapers.length === 0 ? (
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><FileText className="h-6 w-6" /></div>
            <h3 className="mt-3 font-semibold">No mock papers yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">A teacher or admin can publish a mock paper from Study Materials using the <code>mock_paper</code> resource type.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visiblePapers.map((paper) => (
            <Card key={paper.id} className="rounded-2xl shadow-none">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="rounded-full">{paper.subject || "General"}</Badge>
                    {paper.chapter_title && <Badge variant="outline" className="rounded-full">{paper.chapter_title}</Badge>}
                    {paper.marks ? <Badge variant="outline" className="rounded-full">{paper.marks} marks</Badge> : null}
                  </div>
                  <p className="mt-1.5 truncate font-semibold">{paper.title}</p>
                  {paper.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{paper.description}</p>}
                </div>
                <Button type="button" className="min-h-11 shrink-0 rounded-xl" disabled={starting === paper.id} onClick={() => void start(paper)}>
                  {starting === paper.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />} Start mock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {attempts.length > 0 && (
        <Card className="rounded-2xl shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent attempts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {attempts.slice(0, 8).map((attempt) => {
              const percent = attempt.max_score ? Math.round(((attempt.score || 0) / attempt.max_score) * 100) : 0;
              return (
                <div key={attempt.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{attempt.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : attempt.status === "active" ? "In progress" : "Expired"}
                      {attempt.status === "submitted" ? ` · ${attempt.score}/${attempt.max_score} (${percent}%)` : ""}
                    </p>
                  </div>
                  {attempt.status === "submitted" ? (
                    <Button type="button" size="sm" variant="outline" className="min-h-9 shrink-0 rounded-lg" onClick={() => void viewAttempt(attempt)}>View result</Button>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">{attempt.status === "active" ? <AlertCircle className="mr-1 h-3 w-3" /> : null}{attempt.status}</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
