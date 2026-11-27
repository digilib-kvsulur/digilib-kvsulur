import { useEffect, useState } from "react";
import {
  Accessibility, BarChart3, BookOpen, Download, FileText, Layers, PenLine, Target,
} from "lucide-react";
import StudyResources from "@/components/student/StudyResources";
import type { StudyChapterTarget } from "@/components/student/StudyResumeCard";
import { Badge } from "@/components/ui/badge";
import AnswerCoach from "./AnswerCoach";
import FlashcardReview from "./FlashcardReview";
import LearningReport from "./LearningReport";
import MasteryPanel from "./MasteryPanel";
import MockTestRunner from "./MockTestRunner";
import OfflinePacks from "./OfflinePacks";
import ReadingSettings from "./ReadingSettings";
import { useReadingPrefs } from "./useReadingPrefs";
import type { LearningTool } from "./types";

type Tool = "study" | "flashcards" | "mocks" | "mastery" | "coach" | "report" | "offline" | "reading";

const TOOLS: Array<{ value: Tool; label: string; icon: typeof BookOpen }> = [
  { value: "study", label: "Study", icon: BookOpen },
  { value: "flashcards", label: "Flashcards", icon: Layers },
  { value: "mocks", label: "Mock tests", icon: FileText },
  { value: "mastery", label: "Mastery", icon: Target },
  { value: "coach", label: "Answer coach", icon: PenLine },
  { value: "report", label: "Report", icon: BarChart3 },
  { value: "offline", label: "Offline", icon: Download },
  { value: "reading", label: "Reading", icon: Accessibility },
];

const TOOL_VALUES = new Set<string>(TOOLS.map((item) => item.value));

function isTool(value: string | null | undefined): value is Tool {
  return Boolean(value && TOOL_VALUES.has(value));
}

function toolFromUrl() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("study");
  return isTool(value) ? value : null;
}

function syncUrl(tool: Tool) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("tab", "study-resources");
  if (tool === "study") params.delete("study");
  else params.set("study", tool);
  const search = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

export default function StudyHub({
  studentClass,
  userId,
  studentName,
  onOpenDoubt,
  initialChapter,
  onInitialChapterOpened,
  initialTool,
}: {
  studentClass?: string | number | null;
  userId?: string;
  studentName?: string;
  onOpenDoubt?: () => void;
  initialChapter?: StudyChapterTarget | null;
  onInitialChapterOpened?: () => void;
  initialTool?: LearningTool | null;
}) {
  const parsedClass = Number(String(studentClass ?? "").match(/\d+/)?.[0] || 10);
  const ownClass = String(Math.min(12, Math.max(6, parsedClass)));
  const [tool, setTool] = useState<Tool>(() => {
    const fromUrl = toolFromUrl();
    if (fromUrl) return fromUrl;
    return isTool(initialTool) ? initialTool : "study";
  });
  const [chapterTarget, setChapterTarget] = useState<StudyChapterTarget | null>(initialChapter || null);
  const { dataSaver } = useReadingPrefs(userId);

  useEffect(() => {
    setChapterTarget(initialChapter || null);
  }, [initialChapter?.classNumber, initialChapter?.subject, initialChapter?.chapterTitle]);

  useEffect(() => {
    if (!isTool(initialTool)) return;
    setTool(initialTool);
  }, [initialTool]);

  const chooseTool = (next: Tool) => {
    setTool(next);
    syncUrl(next);
  };

  const openChapter = (target: StudyChapterTarget) => {
    setChapterTarget(target);
    chooseTool("study");
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-2 flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/60 p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 px-1">
          <span className="text-sm font-bold">Study Hub</span>
          <Badge variant="outline" className="rounded-full">Class {ownClass}</Badge>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:pb-0" role="toolbar" aria-label="Study tools">
          {TOOLS.map((item) => {
            const Icon = item.icon;
            const active = tool === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => chooseTool(item.value)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors sm:text-sm ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tool === "study" && (
        <StudyResources
          studentClass={studentClass}
          userId={userId}
          initialChapter={chapterTarget}
          onInitialChapterOpened={() => {
            setChapterTarget(null);
            onInitialChapterOpened?.();
          }}
          onOpenDoubt={onOpenDoubt}
          dataSaver={dataSaver}
        />
      )}
      {tool === "flashcards" && <FlashcardReview studentClass={ownClass} />}
      {tool === "mocks" && <MockTestRunner studentClass={ownClass} />}
      {tool === "mastery" && (
        <MasteryPanel
          studentClass={ownClass}
          onOpenChapter={(target) => openChapter({ classNumber: ownClass, subject: target.subject, chapterTitle: target.chapterTitle })}
        />
      )}
      {tool === "coach" && <AnswerCoach studentClass={ownClass} userId={userId} />}
      {tool === "report" && <LearningReport studentName={studentName} studentClass={ownClass} />}
      {tool === "offline" && <OfflinePacks studentClass={ownClass} userId={userId} />}
      {tool === "reading" && <ReadingSettings userId={userId} />}
    </div>
  );
}
