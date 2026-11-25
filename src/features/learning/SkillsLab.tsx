import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BarChart3, BookOpenCheck, Briefcase, CheckCircle2, Code2, Globe2, Layers,
  Loader2, ShieldCheck, Sparkles, Volume2, VolumeX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { completeSkillLesson, fetchSkillContent, submitSkillChallenge } from "./api";
import CodePlayground from "./CodePlayground";
import MarkdownBlock from "./MarkdownBlock";
import { useSpeech } from "./useSpeech";
import type { SkillChallenge, SkillContent, SkillLesson, SkillTrack } from "./types";

const TRACK_ICONS: Record<string, typeof ShieldCheck> = {
  "digital-literacy": ShieldCheck,
  "coding-foundations": Code2,
  "web-studio": Globe2,
  "data-and-ai": BarChart3,
  "career-readiness": Briefcase,
};

function trackRange(track: SkillTrack) {
  return track.min_class === track.max_class ? `Class ${track.min_class}` : `Classes ${track.min_class}–${track.max_class}`;
}

function inClassRange(track: SkillTrack, classNumber: string) {
  const value = Number(classNumber);
  return value >= Number(track.min_class) && value <= Number(track.max_class);
}

export default function SkillsLab({ studentClass, userId }: { studentClass: string; userId?: string }) {
  const classNumber = String(Math.min(12, Math.max(6, Number(String(studentClass || "").match(/\d+/)?.[0] || 6))));
  const [content, setContent] = useState<SkillContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackId, setTrackId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);
  const [savingChallenge, setSavingChallenge] = useState(false);
  const { speak, stop, speaking, supported } = useSpeech();

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError("Sign in to open the Skills Lab.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setContent(await fetchSkillContent(userId));
    } catch (e: any) {
      setError(e?.message || "Skills Lab content could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleTracks = useMemo(() => {
    const tracks = content?.tracks || [];
    const matching = tracks.filter((track) => inClassRange(track, classNumber));
    return matching.length ? matching : tracks;
  }, [content, classNumber]);

  useEffect(() => {
    if (!visibleTracks.length) return;
    if (trackId && visibleTracks.some((track) => track.id === trackId)) return;
    setTrackId(visibleTracks[0].id);
  }, [visibleTracks, trackId]);

  const track = visibleTracks.find((item) => item.id === trackId) || null;
  const lessons = useMemo(
    () => (content?.lessons || []).filter((lesson) => lesson.track_id === trackId).sort((a, b) => a.sort_order - b.sort_order),
    [content, trackId],
  );

  useEffect(() => {
    if (!lessons.length) {
      setLessonId("");
      return;
    }
    if (lessonId && lessons.some((lesson) => lesson.id === lessonId)) return;
    setLessonId(lessons[0].id);
  }, [lessons, lessonId]);

  const completed = useMemo(() => new Set((content?.progress || []).map((row) => row.lesson_id)), [content]);
  const passedChallenges = useMemo(
    () => new Set((content?.submissions || []).filter((row) => row.passed).map((row) => row.challenge_id)),
    [content],
  );
  const lesson = lessons.find((item) => item.id === lessonId) || null;
  const challenge: SkillChallenge | null = lesson
    ? (content?.challenges || []).find((item) => item.lesson_id === lesson.id) || null
    : null;

  const complete = async (item: SkillLesson) => {
    setSavingLesson(true);
    try {
      const result = await completeSkillLesson(item.id);
      if (result.completed || result.already_completed) {
        setContent((current) => current && ({
          ...current,
          progress: current.progress.some((row) => row.lesson_id === item.id)
            ? current.progress
            : [...current.progress, { lesson_id: item.id, completed_at: new Date().toISOString() }],
        }));
        if (result.awarded > 0) toast.success(`+${result.awarded} points · lesson complete`);
        else toast.success(result.already_completed ? "This lesson is already complete." : "Lesson marked complete");
      }
    } catch (e: any) {
      toast.error(e?.message || "The lesson could not be marked complete.");
    } finally {
      setSavingLesson(false);
    }
  };

  const submitChallenge = async (code: string, passed: boolean, output: string) => {
    if (!challenge) return;
    setSavingChallenge(true);
    try {
      const result = await submitSkillChallenge(challenge.id, code, passed, output);
      setContent((current) => current && ({
        ...current,
        submissions: current.submissions.some((row) => row.challenge_id === challenge.id)
          ? current.submissions
          : [{ challenge_id: challenge.id, passed, created_at: new Date().toISOString() }, ...current.submissions],
      }));
      if (result.awarded > 0) toast.success(`+${result.awarded} points for submitting your work`);
      else toast.success("Attempt saved");
    } catch (e: any) {
      toast.error(e?.message || "The attempt could not be saved.");
    } finally {
      setSavingChallenge(false);
    }
  };

  if (loading) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Opening the Skills Lab…</CardContent></Card>;
  }

  if (error) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3 min-h-10 rounded-xl" onClick={() => void load()}>Try again</Button></CardContent></Card>;
  }

  if (!visibleTracks.length) {
    return (
      <Card className="rounded-2xl shadow-none">
        <CardContent className="p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></div>
          <h2 className="mt-3 font-semibold">Skills Lab is being prepared</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Digital literacy, coding, and career lessons will appear here after your school publishes them.</p>
        </CardContent>
      </Card>
    );
  }

  if (!track || !lesson) {
    return (
      <div className="space-y-3">
        <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold">Skills Lab</p>
              <p className="text-xs text-muted-foreground">Short, practical lessons for the skills school does not always cover. Lessons and challenges are self-paced.</p>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {visibleTracks.map((item) => {
            const Icon = TRACK_ICONS[item.slug] || Layers;
            const trackLessons = (content?.lessons || []).filter((lessonRow) => lessonRow.track_id === item.id);
            const done = trackLessons.filter((lessonRow) => completed.has(lessonRow.id)).length;
            const percent = trackLessons.length ? Math.round((done / trackLessons.length) * 100) : 0;
            return (
              <Card key={item.id} className="rounded-2xl shadow-none">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${item.accent}18`, color: item.accent }}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-5">{item.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{trackRange(item)} · {trackLessons.length} lessons</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${item.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.accent }} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{done} of {trackLessons.length} complete</span>
                    <Button type="button" size="sm" className="min-h-10 rounded-xl" onClick={() => { setTrackId(item.id); setLessonId(""); }}>Open track</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const trackLessons = lessons;
  const trackDone = trackLessons.filter((item) => completed.has(item.id)).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" className="min-h-10 rounded-lg" onClick={() => { setTrackId(""); setLessonId(""); stop(); }}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All tracks
        </Button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="rounded-full">{track.title}</Badge>
          <Badge variant="outline" className="rounded-full">{trackDone}/{trackLessons.length} complete</Badge>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit rounded-2xl shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-base">Lessons</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {trackLessons.map((item, index) => {
              const done = completed.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === lesson.id}
                  onClick={() => { setLessonId(item.id); stop(); }}
                  className={`flex min-h-11 w-full items-start gap-2 rounded-xl border p-2.5 text-left ${item.id === lesson.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                >
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-5">{item.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{item.est_minutes} min</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-3">
          <Card className="rounded-2xl shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
              <div className="min-w-0">
                <CardTitle className="text-lg">{lesson.title}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{lesson.summary} · {lesson.est_minutes} min read</p>
              </div>
              {supported && (
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label={speaking ? "Stop reading" : "Read lesson aloud"} onClick={() => (speaking ? stop() : speak(lesson.content_md))}>
                  {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <MarkdownBlock className="reading-content">{lesson.content_md}</MarkdownBlock>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">{completed.has(lesson.id) ? "You have completed this lesson." : "Mark complete when you understand the ideas, not just when you finish reading."}</p>
                <Button type="button" className="min-h-10 rounded-xl" disabled={savingLesson || completed.has(lesson.id)} onClick={() => void complete(lesson)}>
                  {savingLesson ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BookOpenCheck className="mr-1.5 h-4 w-4" />}
                  {completed.has(lesson.id) ? "Completed" : "Mark complete"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {challenge && (
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  Practice challenge
                  {passedChallenges.has(challenge.id) && <Badge className="rounded-full bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Your code runs in a sandbox on this device. Points are awarded for effort, not for a claim of correctness.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <MarkdownBlock>{challenge.prompt_md}</MarkdownBlock>
                <CodePlayground
                  key={challenge.id}
                  challengeId={challenge.id}
                  language={challenge.language}
                  starterCode={challenge.starter_code}
                  tests={challenge.tests}
                  saving={savingChallenge}
                  onSubmit={submitChallenge}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
