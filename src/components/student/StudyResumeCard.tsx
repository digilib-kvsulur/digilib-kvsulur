import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { displayChapterTitle, readLastStudy } from "@/lib/subjectTheme";

export interface StudyChapterTarget {
  classNumber: string;
  subject: string;
  chapterTitle: string;
}

export default function StudyResumeCard({
  userId,
  studentClass,
  onResume,
}: {
  userId: string;
  studentClass?: string | number | null;
  onResume: (target: StudyChapterTarget) => void;
}) {
  const parsedClass = Number(String(studentClass ?? "").match(/\d+/)?.[0] || 0);
  const classNumber = parsedClass >= 6 ? String(Math.min(12, parsedClass)) : "";
  const [chapter, setChapter] = useState<(StudyChapterTarget & { status: "in_progress" | "needs_revision" | "recent" }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    (async () => {
      // 1. Check database for active chapter progress
      if (userId && classNumber) {
        try {
          const { data, error } = await (supabase as any)
            .from("study_chapter_progress")
            .select("class_number,subject,chapter_title,status")
            .eq("user_id", userId)
            .eq("class_number", classNumber)
            .in("status", ["in_progress", "needs_revision"])
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (alive && !error && data) {
            setChapter({
              classNumber: String(data.class_number),
              subject: String(data.subject),
              chapterTitle: String(data.chapter_title),
              status: data.status,
            });
            setLoading(false);
            return;
          }
        } catch {
          // fall through to local fallback
        }
      }

      // 2. Fallback to locally tracked last study session
      const last = readLastStudy();
      if (alive && last && last.subject && last.chapterTitle) {
        setChapter({
          classNumber: last.classNumber || classNumber || "10",
          subject: last.subject,
          chapterTitle: last.chapterTitle,
          status: "recent",
        });
      } else if (alive) {
        setChapter(null);
      }
      if (alive) setLoading(false);
    })();

    return () => { alive = false; };
  }, [userId, classNumber]);

  if (loading || !chapter) return null;

  return (
    <Card className="border-indigo-200/80 dark:border-indigo-500/25 bg-gradient-to-r from-indigo-50/70 via-card to-violet-50/50 dark:from-indigo-950/35 dark:via-card dark:to-card shadow-xs hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-foreground text-sm sm:text-base">Continue studying</h2>
              <Badge variant={chapter.status === "needs_revision" ? "outline" : "secondary"} className="text-[10px] font-semibold">
                {chapter.status === "needs_revision" ? "Needs revision" : chapter.status === "in_progress" ? "In progress" : "Recently opened"}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs sm:text-sm text-muted-foreground">
              Class {chapter.classNumber} · {chapter.subject} · {displayChapterTitle(chapter.chapterTitle)}
            </p>
          </div>
        </div>
        <Button 
          className="min-h-11 shrink-0 gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs" 
          onClick={() => onResume(chapter)}
        >
          Resume chapter <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
