import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

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
  const [chapter, setChapter] = useState<(StudyChapterTarget & { status: "in_progress" | "needs_revision" }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!userId || !classNumber) {
      setChapter(null);
      setLoading(false);
      return () => { alive = false; };
    }
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("study_chapter_progress")
        .select("class_number,subject,chapter_title,status")
        .eq("user_id", userId)
        .eq("class_number", classNumber)
        .in("status", ["in_progress", "needs_revision"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      setChapter(error || !data ? null : {
        classNumber: String(data.class_number),
        subject: String(data.subject),
        chapterTitle: String(data.chapter_title),
        status: data.status,
      });
      setLoading(false);
    })().catch(() => { if (alive) { setChapter(null); setLoading(false); } });
    return () => { alive = false; };
  }, [userId, classNumber]);

  if (loading || !chapter) return null;

  return <Card className="border-primary/25 bg-gradient-to-r from-primary/5 via-card to-violet-500/5">
    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Pick up your study</h2><Badge variant={chapter.status === "needs_revision" ? "outline" : "secondary"}>{chapter.status === "needs_revision" ? "Needs revision" : "In progress"}</Badge></div>
          <p className="mt-1 truncate text-sm text-muted-foreground">Class {chapter.classNumber} · {chapter.subject} · {chapter.chapterTitle}</p>
        </div>
      </div>
      <Button className="min-h-11 shrink-0 gap-2" onClick={() => onResume(chapter)}>Resume chapter <ArrowRight className="h-4 w-4" /></Button>
    </CardContent>
  </Card>;
}
