import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchExamCountdown } from "./api";
import type { ExamCountdown } from "./types";

export default function ExamCountdownCard({ onOpenChapter }: { onOpenChapter?: (target: { subject: string; chapterTitle?: string }) => void }) {
  const [data, setData] = useState<ExamCountdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchExamCountdown()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e: any) => {
        if (alive) setError(e?.message || "Exam schedule could not be loaded.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking the exam calendar…
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.exam) return null;
  const exam = data.exam;
  const percent = exam.chapters_total > 0 ? Math.round((exam.chapters_done / exam.chapters_total) * 100) : 0;
  const urgent = exam.days_left <= 7;

  return (
    <Card className={`overflow-hidden rounded-2xl shadow-none ${urgent ? "border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20" : "border-border/70"}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="rounded-full"><CalendarDays className="mr-1 h-3 w-3" /> Next exam</Badge>
              <Badge variant="outline" className="rounded-full">{exam.subject}</Badge>
            </div>
            <h3 className="mt-2 truncate text-base font-bold sm:text-lg">{exam.exam_name}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {new Date(`${exam.exam_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className={`shrink-0 rounded-xl px-3 py-2 text-center ${urgent ? "bg-amber-500 text-white" : "bg-primary/10 text-primary"}`}>
            <p className="text-2xl font-black leading-none">{Math.max(0, exam.days_left)}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide">{exam.days_left === 1 ? "day left" : "days left"}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Syllabus progress</span>
            <span className="text-muted-foreground">{exam.chapters_done} of {exam.chapters_total} chapters</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Exam syllabus progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {exam.next_chapter ? <>Next: <span className="font-medium text-foreground">{exam.next_chapter}</span></> : "All syllabus chapters marked complete."}
          </p>
          <Button
            type="button"
            size="sm"
            className="min-h-10 rounded-xl"
            onClick={() => onOpenChapter?.({ subject: exam.subject, chapterTitle: exam.next_chapter || undefined })}
          >
            {exam.next_chapter ? "Continue" : "Revise"} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        {exam.instructions && (
          <details className="mt-3 rounded-lg border bg-background/60 p-2.5 text-xs">
            <summary className="cursor-pointer font-medium">Exam instructions</summary>
            <p className="mt-1.5 whitespace-pre-wrap text-muted-foreground">{exam.instructions}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
