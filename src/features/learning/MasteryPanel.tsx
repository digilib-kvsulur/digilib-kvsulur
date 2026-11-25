import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, ChevronRight, Loader2, Target, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchLearningResources, fetchMastery } from "./api";
import CheckpointRunner from "./CheckpointRunner";
import type { MasterySummary, StudyResource } from "./types";

function accuracyTone(accuracy: number) {
  if (accuracy >= 80) return "bg-emerald-500";
  if (accuracy >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export default function MasteryPanel({
  studentClass,
  onOpenChapter,
}: {
  studentClass: string;
  onOpenChapter?: (target: { subject: string; chapterTitle: string }) => void;
}) {
  const [summary, setSummary] = useState<MasterySummary | null>(null);
  const [checkpoints, setCheckpoints] = useState<StudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StudyResource | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [mastery, resources] = await Promise.all([
        fetchMastery(studentClass),
        fetchLearningResources(studentClass, ["checkpoint"]),
      ]);
      setSummary(mastery);
      setCheckpoints(resources);
    } catch (e: any) {
      setError(e?.message || "Mastery data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [studentClass]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await fetchMastery(studentClass));
    } catch {
      // The checkpoint result is already visible; a stale summary is acceptable.
    }
  }, [studentClass]);

  const rows = summary?.chapters || [];
  const totals = useMemo(() => {
    const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
    const weighted = rows.reduce((sum, row) => sum + row.accuracy * row.attempts, 0);
    const accuracy = attempts > 0 ? Math.round(weighted / attempts) : 0;
    return {
      chapters: rows.length,
      attempts,
      accuracy,
      passed: rows.filter((row) => row.checkpoint_passed).length,
    };
  }, [rows]);

  const weak = rows.filter((row) => row.attempts >= 3 && row.accuracy < 60).slice(0, 3);
  const groupedCheckpoints = useMemo(() => {
    const map = new Map<string, StudyResource[]>();
    checkpoints.forEach((resource) => {
      const key = resource.subject || "General";
      map.set(key, [...(map.get(key) || []), resource]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [checkpoints]);

  if (selected) {
    return <CheckpointRunner resource={selected} onClose={() => setSelected(null)} onResult={() => void refreshSummary()} />;
  }

  if (loading) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Calculating mastery…</CardContent></Card>;
  }

  if (error) {
    return <Card className="rounded-2xl shadow-none"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3 min-h-10 rounded-xl" onClick={() => void load()}>Try again</Button></CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="rounded-2xl shadow-none"><CardContent className="p-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Chapters</p><p className="mt-1 text-2xl font-black">{totals.chapters}</p></CardContent></Card>
        <Card className="rounded-2xl shadow-none"><CardContent className="p-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Questions</p><p className="mt-1 text-2xl font-black">{totals.attempts}</p></CardContent></Card>
        <Card className="rounded-2xl shadow-none"><CardContent className="p-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Accuracy</p><p className="mt-1 text-2xl font-black">{totals.accuracy}%</p></CardContent></Card>
        <Card className="rounded-2xl shadow-none"><CardContent className="p-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Checkpoints</p><p className="mt-1 text-2xl font-black">{totals.passed}</p></CardContent></Card>
      </div>

      {rows.length === 0 ? (
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><BarChart3 className="h-6 w-6" /></div>
            <h3 className="mt-3 font-semibold">No practice data yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Answer a practice set or checkpoint and this page will show which chapters are strong and which need another pass.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {weak.length > 0 && (
            <Card className="rounded-2xl border-amber-300/60 bg-amber-50/50 shadow-none dark:bg-amber-950/20">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-amber-600" /> Focus next</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {weak.map((row) => (
                  <div key={`${row.subject}-${row.chapter_title}`} className="flex items-center gap-3 rounded-xl border bg-background/70 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.chapter_title || row.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.subject} · {row.accuracy}% accuracy over {row.attempts} questions</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="min-h-9 shrink-0 rounded-lg" onClick={() => onOpenChapter?.({ subject: row.subject, chapterTitle: row.chapter_title })}>
                      Practise <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Chapter mastery</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {rows.map((row) => (
                <div key={`${row.subject}-${row.chapter_title}`} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.chapter_title || row.subject}</p>
                      <p className="text-xs text-muted-foreground">{row.subject} · {row.attempts} question{row.attempts === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {row.checkpoint_passed && <Badge className="rounded-full bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>}
                      <span className="text-sm font-bold">{row.accuracy}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${row.chapter_title || row.subject} accuracy`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.accuracy}>
                    <div className={`h-full rounded-full ${accuracyTone(row.accuracy)}`} style={{ width: `${row.accuracy}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="rounded-2xl shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" /> Chapter checkpoints</CardTitle>
          <p className="text-xs text-muted-foreground">A checkpoint is a short graded test. Pass with 80% to earn points and mark the chapter mastered.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupedCheckpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checkpoints have been published for your class yet. Ask a teacher to add one.</p>
          ) : (
            groupedCheckpoints.map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                {items.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-3 rounded-xl border p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{resource.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{resource.chapter_title || resource.description || "Chapter checkpoint"}</p>
                    </div>
                    <Button type="button" size="sm" className="min-h-9 shrink-0 rounded-lg" onClick={() => setSelected(resource)}>Take checkpoint</Button>
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
