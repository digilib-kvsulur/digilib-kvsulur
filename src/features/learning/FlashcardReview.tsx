import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain, CheckCircle2, Layers, Loader2, Plus, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addFlashcards, claimFlashcardReward, fetchDueFlashcards, fetchLearningResources, reviewFlashcard, seedFlashcardsFromResource } from "./api";
import MarkdownBlock from "./MarkdownBlock";
import { useSpeech } from "./useSpeech";
import type { DueFlashcards, FlashcardReward, StudyResource } from "./types";

type Mode = "browse" | "review" | "done";
type SessionCounts = { again: number; hard: number; good: number; easy: number };

const EMPTY_SESSION: SessionCounts = { again: 0, hard: 0, good: 0, easy: 0 };
const RATING_LABELS: Array<{ rating: 1 | 2 | 3 | 4; label: string; className: string; key: keyof SessionCounts }> = [
  { rating: 1, label: "Again", className: "border-rose-300 text-rose-700 hover:bg-rose-50 dark:text-rose-300", key: "again" },
  { rating: 2, label: "Hard", className: "border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-300", key: "hard" },
  { rating: 3, label: "Good", className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300", key: "good" },
  { rating: 4, label: "Easy", className: "border-sky-300 text-sky-700 hover:bg-sky-50 dark:text-sky-300", key: "easy" },
];

function Markdown({ children }: { children: string }) {
  return <MarkdownBlock>{children}</MarkdownBlock>;
}

export default function FlashcardReview({ studentClass }: { studentClass: string }) {
  const [due, setDue] = useState<DueFlashcards | null>(null);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("browse");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState("");
  const [session, setSession] = useState<SessionCounts>(EMPTY_SESSION);
  const [reward, setReward] = useState<FlashcardReward | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const { speak, stop, speaking, supported } = useSpeech();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dueData, resourceData] = await Promise.all([
        fetchDueFlashcards(30),
        fetchLearningResources(studentClass, ["flashcards", "quick_revision", "formula_sheet", "short_notes", "chapter_lesson"]),
      ]);
      setDue(dueData);
      setResources(resourceData.filter((resource) => Boolean(resource.markdown_content?.trim())));
    } catch (e: any) {
      setError(e?.message || "Flashcards could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [studentClass]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = due?.cards || [];
  const current = cards[index];
  const totalReviewed = session.again + session.hard + session.good + session.easy;

  const groupedResources = useMemo(() => {
    const map = new Map<string, StudyResource[]>();
    resources.forEach((resource) => {
      const key = resource.subject || "General";
      map.set(key, [...(map.get(key) || []), resource]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [resources]);

  const startReview = () => {
    if (!cards.length) return;
    setMode("review");
    setIndex(0);
    setFlipped(false);
    setSession(EMPTY_SESSION);
    setReward(null);
    stop();
  };

  const rate = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (!current || busy) return;
      setBusy(true);
      try {
        await reviewFlashcard(current.id, rating);
        const key = RATING_LABELS.find((item) => item.rating === rating)?.key || "good";
        setSession((counts) => ({ ...counts, [key]: counts[key] + 1 }));
        stop();
        if (index + 1 >= cards.length) {
          setMode("done");
          setFlipped(false);
          const refreshed = await fetchDueFlashcards(30);
          setDue(refreshed);
        } else {
          setIndex((value) => value + 1);
          setFlipped(false);
        }
      } catch (e: any) {
        toast.error(e?.message || "The review could not be saved.");
      } finally {
        setBusy(false);
      }
    },
    [busy, cards.length, current, index, stop],
  );

  useEffect(() => {
    if (mode !== "review") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }
      if (flipped && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        void rate(Number(event.key) as 1 | 2 | 3 | 4);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, flipped, rate]);

  const seed = async (resource: StudyResource) => {
    setSeeding(resource.id);
    try {
      const result = await seedFlashcardsFromResource(resource.id);
      if (result.added > 0) {
        toast.success(`${result.added} card${result.added === 1 ? "" : "s"} added to your deck`);
        await load();
      } else {
        toast.info("Those cards are already in your deck.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not add cards from this resource.");
    } finally {
      setSeeding("");
    }
  };

  const addManual = async () => {
    if (!front.trim() || !back.trim()) {
      toast.error("Add both a question and an answer.");
      return;
    }
    setBusy(true);
    try {
      const result = await addFlashcards([{ front: front.trim(), back: back.trim(), subject: subject.trim() || "General", chapter_title: chapter.trim(), source_kind: "manual" }]);
      if (result.added > 0) {
        toast.success("Card added");
        setFront("");
        setBack("");
        setShowAdd(false);
        await load();
      } else {
        toast.info("That card is already in your deck.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not add the card.");
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setBusy(true);
    try {
      const result = await claimFlashcardReward();
      setReward(result);
      if (result.awarded) toast.success(`+${result.points} points for today's review`);
      else if (result.reason === "already_claimed") toast.info("You already claimed today's review reward.");
      else toast.info(`Review ${Math.max(0, 10 - result.reviews)} more cards to claim the reward.`);
    } catch (e: any) {
      toast.error(e?.message || "Could not claim the reward.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your flashcards…</CardContent></Card>;
  }

  if (error) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3 min-h-10 rounded-xl" onClick={() => void load()}>Try again</Button></CardContent></Card>;
  }

  if (mode === "review" && current) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" className="min-h-10 rounded-lg" onClick={() => { setMode("browse"); stop(); }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> End session
          </Button>
          <span className="text-xs text-muted-foreground">{index + 1} of {cards.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Review progress" aria-valuemin={0} aria-valuemax={cards.length} aria-valuenow={index}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((index + (flipped ? 0.5 : 0)) / cards.length) * 100}%` }} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="min-h-[280px] space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="rounded-full">{flipped ? "Answer" : "Question"}</Badge>
              <div className="flex items-center gap-1">
                {current.chapter_title && <span className="max-w-[180px] truncate text-xs text-muted-foreground">{current.chapter_title}</span>}
                {supported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    aria-label={speaking ? "Stop reading" : "Read aloud"}
                    onClick={() => (speaking ? stop() : speak(flipped ? current.back : current.front))}
                  >
                    {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
            <button type="button" className="w-full text-left" onClick={() => setFlipped((value) => !value)} aria-label={flipped ? "Show question" : "Show answer"}>
              <Markdown>{flipped ? current.back : current.front}</Markdown>
              <p className="mt-4 text-xs text-muted-foreground">{flipped ? "Tap to see the question again" : "Tap the card to reveal the answer"}</p>
            </button>
          </CardContent>
        </Card>

        {flipped ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATING_LABELS.map((item) => (
              <Button key={item.rating} type="button" variant="outline" className={`min-h-12 rounded-xl ${item.className}`} disabled={busy} onClick={() => void rate(item.rating)}>
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="ml-1 text-[10px] opacity-70">{item.rating}</span>
              </Button>
            ))}
          </div>
        ) : (
          <Button type="button" className="min-h-12 w-full rounded-xl" onClick={() => setFlipped(true)}>Show answer <span className="ml-1.5 text-[10px] opacity-70">Space</span></Button>
        )}
        <p className="text-center text-[11px] text-muted-foreground">Press 1–4 after revealing the answer. Your first attempt shapes the next review date.</p>
      </div>
    );
  }

  if (mode === "done") {
    const nextDue = due?.due_count || 0;
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <Card className="rounded-2xl border-emerald-300/60 shadow-none">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
            <div>
              <h3 className="text-lg font-bold">Session complete</h3>
              <p className="mt-1 text-sm text-muted-foreground">{totalReviewed} card{totalReviewed === 1 ? "" : "s"} reviewed. The scheduler will bring them back at the right time.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold">{session.again}</p><p className="text-muted-foreground">Again</p></div>
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold">{session.hard}</p><p className="text-muted-foreground">Hard</p></div>
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold">{session.good}</p><p className="text-muted-foreground">Good</p></div>
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold">{session.easy}</p><p className="text-muted-foreground">Easy</p></div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {totalReviewed >= 10 && !reward?.awarded && (
                <Button type="button" className="min-h-11 rounded-xl" disabled={busy} onClick={() => void claim()}>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Claim review reward
                </Button>
              )}
              {nextDue > 0 && <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={startReview}><RotateCcw className="mr-1.5 h-4 w-4" /> {nextDue} more due</Button>}
              <Button type="button" variant="ghost" className="min-h-11 rounded-xl" onClick={() => setMode("browse")}>Back to decks</Button>
            </div>
            {reward?.awarded && <p className="text-sm font-medium text-emerald-600">+{reward.points} points added to your account.</p>}
            {reward && !reward.awarded && reward.reason === "need_more_reviews" && <p className="text-xs text-muted-foreground">Review {Math.max(0, 10 - reward.reviews)} more cards today to claim 15 points.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Layers className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold">{due?.due_count ? `${due.due_count} card${due.due_count === 1 ? "" : "s"} due now` : "No cards due right now"}</p>
              <p className="text-xs text-muted-foreground">{due?.total || 0} cards in your deck · {due?.learned || 0} learned</p>
            </div>
          </div>
          <Button type="button" className="min-h-11 rounded-xl" onClick={startReview} disabled={!cards.length}>
            <Brain className="mr-1.5 h-4 w-4" /> {cards.length ? "Start review" : "Nothing due"}
          </Button>
        </CardContent>
      </Card>

      {!due?.total && (
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Your deck is empty. Add cards from a revision note or formula sheet below, or create your own.
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Build your deck</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Turn approved notes into review cards. Duplicates are skipped.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="min-h-10 rounded-xl" onClick={() => setShowAdd((value) => !value)}>
            <Plus className="mr-1.5 h-4 w-4" /> Custom card
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAdd && (
            <div className="space-y-2 rounded-xl border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="card-subject" className="text-xs">Subject</Label>
                  <Input id="card-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Science" className="mt-1 min-h-10 rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="card-chapter" className="text-xs">Chapter (optional)</Label>
                  <Input id="card-chapter" value={chapter} onChange={(event) => setChapter(event.target.value)} placeholder="e.g. Light" className="mt-1 min-h-10 rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="card-front" className="text-xs">Question</Label>
                <textarea id="card-front" value={front} onChange={(event) => setFront(event.target.value)} className="mt-1 min-h-[70px] w-full rounded-xl border bg-background p-3 text-sm" placeholder="What is the SI unit of force?" />
              </div>
              <div>
                <Label htmlFor="card-back" className="text-xs">Answer</Label>
                <textarea id="card-back" value={back} onChange={(event) => setBack(event.target.value)} className="mt-1 min-h-[90px] w-full rounded-xl border bg-background p-3 text-sm" placeholder="Newton (N)" />
              </div>
              <Button type="button" size="sm" className="min-h-10 rounded-xl" disabled={busy} onClick={() => void addManual()}>Add card</Button>
            </div>
          )}

          {groupedResources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved notes are available yet. Ask a teacher to publish revision notes for your class.</p>
          ) : (
            groupedResources.map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                {items.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{resource.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{resource.chapter_title || resource.description || "Revision resource"}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="min-h-9 shrink-0 rounded-lg" disabled={seeding === resource.id} onClick={() => void seed(resource)}>
                      {seeding === resource.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      <span className="ml-1 hidden sm:inline">Add cards</span>
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
