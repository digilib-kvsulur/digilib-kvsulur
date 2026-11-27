import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  ArrowLeft, Bookmark, BookmarkCheck, BookOpen, Calculator, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, ExternalLink, FileText, FlaskConical,
  NotebookText, Plus, Search, Sparkles, TimerReset, Volume2, VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import AskAiSelectionLayer from "@/components/student/AskAiSelectionLayer";
import InAppReaderDialog, { type InAppReaderItem } from "@/components/student/InAppReaderDialog";
import ChapterPracticeSet from "@/components/student/ChapterPracticeSet";
import FormulaCard from "@/components/student/study/FormulaCard";
import PyqCard, { type PyqItem } from "@/components/student/study/PyqCard";
import RevisionCards from "@/components/student/study/RevisionCards";
import StudyEmptyState from "@/components/student/study/StudyEmptyState";
import { displayChapterTitle, shortSubjectName, subjectTheme, writeLastStudy } from "@/lib/subjectTheme";
import { useSpeech } from "@/features/learning/useSpeech";
import { toast } from "sonner";

type Resource = { id: string; title: string; description: string | null; subject: string | null; student_class: string | null; chapter_title: string | null; resource_type: string; academic_session: string; exam_year: number | null; marks: number | null; source_label: string | null; source_url: string | null; markdown_content: string | null; file_url: string; file_type: string | null; updated_at?: string | null; created_at?: string | null; review_status?: string | null };
type NcertChapter = { id: string; subject: string; book_name: string; chapter_number: number | null; chapter_title: string; file_url: string };
type Chapter = { title: string; chapterNumber?: number | null; textbookUrl?: string; bookName?: string; resources: Resource[] };
type ChapterProgressStatus = "in_progress" | "needs_revision" | "completed";
type ChapterProgress = { user_id: string; class_number: string; subject: string; chapter_title: string; status: ChapterProgressStatus; started_at: string; completed_at: string | null; updated_at: string };

const KIND: Record<string, string> = { chapter_lesson: "Chapter Lesson", short_notes: "Short Notes", formula_sheet: "Formula Sheet", quick_revision: "Quick Revision", chapter_practice: "Practice", pyq: "PYQ", textbook: "Textbook / Syllabus", flashcards: "Flashcards", mock_paper: "Mock Paper", checkpoint: "Checkpoint", other: "Other" };
const TAB_DEFS = [
  { value: "notes", label: "Notes", icon: NotebookText, types: ["chapter_lesson", "short_notes", "other"] },
  { value: "formulas", label: "Formulas", icon: Calculator, types: ["formula_sheet"] },
  { value: "pyq", label: "PYQs", icon: CircleHelp, types: ["pyq", "chapter_practice"] },
  { value: "revision", label: "Quick Revision", icon: TimerReset, types: ["quick_revision"] },
  { value: "ncert", label: "NCERT", icon: BookOpen, types: ["textbook"] },
] as const;
type TabValue = typeof TAB_DEFS[number]["value"];

const normalizeSubject = (subject: string) => subject.replace(/(_Part\d| Part \d)/gi, "").replace(/_/g, " ").trim();
const normalizeChapter = (title: string) => title.replace(/^(chapter|unit|lesson)\s*\d+\s*[-:.)]?\s*/i, "").trim().toLocaleLowerCase();
const progressKey = (classNumber: string, subject: string, chapterTitle: string) => `${classNumber}|${subject.trim().toLocaleLowerCase()}|${chapterTitle.trim().toLocaleLowerCase()}`;
const progressLabel: Record<ChapterProgressStatus, string> = { in_progress: "Studying", needs_revision: "Needs revision", completed: "Completed" };
const SUBJECT_STORAGE_KEY = "dlms-study-last-subject";
const STUDY_CACHE_TTL_MS = 3 * 60 * 1000;
const studyDataCache = new Map<string, {
  resources: Resource[];
  ncertChapters: NcertChapter[];
  bookmarks: string[];
  chapterProgress: Record<string, ChapterProgress>;
  ts: number;
}>();

function inferBoard(resource: Resource) {
  const text = `${resource.title} ${resource.source_label || ""} ${resource.description || ""}`.toLowerCase();
  if (text.includes("jee")) return "JEE";
  if (text.includes("neet")) return "NEET";
  if (text.includes("cbse") || text.includes("board")) return "CBSE";
  return resource.source_label || "PYQ";
}

export default function StudyResources({ studentClass, userId, onOpenDoubt, initialChapter, onInitialChapterOpened, dataSaver = false }: { studentClass?: string | number | null; userId?: string; onOpenDoubt?: () => void; initialChapter?: { classNumber: string; subject: string; chapterTitle: string } | null; onInitialChapterOpened?: () => void; dataSaver?: boolean }) {
  const parsedClass = Number(String(studentClass ?? "").match(/\d+/)?.[0] || 6);
  const ownClass = String(Math.min(12, Math.max(6, parsedClass)));
  const [classFilter, setClassFilter] = useState(ownClass);
  const [resources, setResources] = useState<Resource[]>([]);
  const [ncertChapters, setNcertChapters] = useState<NcertChapter[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [chapterProgress, setChapterProgress] = useState<Record<string, ChapterProgress>>({});
  const [progressError, setProgressError] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [query, setQuery] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [chapterSearchOpen, setChapterSearchOpen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<TabValue>("notes");
  const [pyqYear, setPyqYear] = useState("all");
  const [pyqBoard, setPyqBoard] = useState("all");
  const [pyqMarks, setPyqMarks] = useState("all");
  const [twoMinuteMode, setTwoMinuteMode] = useState(false);
  const [requestingNotes, setRequestingNotes] = useState(false);
  const [readNotes, setReadNotes] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("dlms-study-read-notes") || "[]")); } catch { return new Set(); }
  });
  const [readerItem, setReaderItem] = useState<InAppReaderItem | null>(null);
  const activeSubjectRef = useRef<HTMLButtonElement>(null);
  const { speak, stop, speaking, supported } = useSpeech();

  useEffect(() => { activeSubjectRef.current?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" }); }, [selectedSubject, classFilter]);
  useEffect(() => { setClassFilter(ownClass); }, [ownClass]);
  useEffect(() => {
    let alive = true;
    const cacheKey = `${classFilter}:${userId || "anon"}`;
    const cached = studyDataCache.get(cacheKey);
    const hasFreshCache = Boolean(cached && Date.now() - cached.ts < STUDY_CACHE_TTL_MS);

    if (cached) {
      setResources(cached.resources);
      setNcertChapters(cached.ncertChapters);
      setBookmarks(new Set(cached.bookmarks));
      setChapterProgress(cached.chapterProgress);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setLoadError("");
    if (reloadKey > 0 || !cached) {
      setSelectedSubject("");
      setSelectedChapter("");
    }

    (async () => {
      if (hasFreshCache && reloadKey === 0) return;
      const [materialsResult, chaptersResult] = await Promise.all([
        (supabase as any).from("study_materials").select("id,title,description,subject,student_class,chapter_title,resource_type,academic_session,exam_year,marks,source_label,source_url,markdown_content,file_url,file_type,updated_at,created_at,review_status").eq("review_status", "approved").in("student_class", [classFilter, "All"]).order("subject").order("chapter_title"),
        supabase.from("ncert_books").select("id,subject,book_name,chapter_number,chapter_title,file_url").eq("class_number", classFilter).order("chapter_number", { ascending: true }),
      ]);
      if (!alive) return;
      const nextResources = materialsResult.error ? [] : ((materialsResult.data || []) as Resource[]);
      const nextChapters = chaptersResult.error ? [] : ((chaptersResult.data || []) as NcertChapter[]);
      setResources(nextResources);
      setNcertChapters(nextChapters);
      if (materialsResult.error && chaptersResult.error && !cached) setLoadError("Study materials could not be loaded. Please try again in a moment.");
      let nextBookmarks: string[] = [];
      let nextProgress: Record<string, ChapterProgress> = {};
      if (userId) {
        const [bookmarksResult, progressResult] = await Promise.all([
          (supabase as any).from("study_resource_bookmarks").select("resource_id").eq("user_id", userId),
          (supabase as any).from("study_chapter_progress").select("user_id,class_number,subject,chapter_title,status,started_at,completed_at,updated_at").eq("user_id", userId).eq("class_number", classFilter).order("updated_at", { ascending: false }),
        ]);
        if (!alive) return;
        nextBookmarks = (bookmarksResult.data || []).map((row: any) => row.resource_id);
        setBookmarks(new Set(nextBookmarks));
        if (progressResult.error) { setChapterProgress({}); setProgressError("Chapter progress could not be loaded. Your study materials are still available."); }
        else {
          nextProgress = (progressResult.data || []).reduce((map: Record<string, ChapterProgress>, row: ChapterProgress) => {
            map[progressKey(row.class_number, row.subject, row.chapter_title)] = row; return map;
          }, {});
          setChapterProgress(nextProgress);
          setProgressError("");
        }
      } else { setBookmarks(new Set()); setChapterProgress({}); setProgressError(""); }
      studyDataCache.set(cacheKey, {
        resources: nextResources,
        ncertChapters: nextChapters,
        bookmarks: nextBookmarks,
        chapterProgress: nextProgress,
        ts: Date.now(),
      });
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [classFilter, userId, reloadKey]);

  const subjects = useMemo(() => Array.from(new Set([
    ...ncertChapters.map((chapter) => normalizeSubject(chapter.subject)),
    ...resources.map((resource) => resource.subject ? normalizeSubject(resource.subject) : "General"),
  ])).filter(Boolean).sort((a, b) => {
    const latestFor = (subject: string) => Object.values(chapterProgress).filter((row) => row.subject.toLowerCase() === subject.toLowerCase()).reduce((latest, row) => Math.max(latest, new Date(row.updated_at).getTime()), 0);
    return latestFor(b) - latestFor(a) || a.localeCompare(b);
  }), [ncertChapters, resources, chapterProgress]);

  useEffect(() => {
    if (loading || initialChapter || !subjects.length) return;
    if (selectedSubject && subjects.some((subject) => subject.toLowerCase() === selectedSubject.toLowerCase())) return;
    const remembered = window.localStorage.getItem(SUBJECT_STORAGE_KEY);
    setSelectedSubject(subjects.find((subject) => subject.toLowerCase() === remembered?.toLowerCase()) || subjects[0]);
  }, [loading, initialChapter, selectedSubject, subjects]);

  const chapters = useMemo<Chapter[]>(() => {
    if (!selectedSubject) return [];
    const byTitle = new Map<string, Chapter>();
    ncertChapters.filter((item) => normalizeSubject(item.subject).toLowerCase() === selectedSubject.toLowerCase()).forEach((item) => {
      const key = normalizeChapter(item.chapter_title);
      const chapter = byTitle.get(key) || { title: item.chapter_title, resources: [] };
      chapter.chapterNumber = chapter.chapterNumber ?? item.chapter_number;
      chapter.textbookUrl = chapter.textbookUrl || item.file_url;
      chapter.bookName = chapter.bookName || item.book_name;
      byTitle.set(key, chapter);
    });
    resources.filter((item) => normalizeSubject(item.subject || "General").toLowerCase() === selectedSubject.toLowerCase()).forEach((item) => {
      const title = item.chapter_title?.trim() || "General Resources";
      const key = normalizeChapter(title);
      const chapter = byTitle.get(key) || { title, resources: [] };
      chapter.resources.push(item);
      byTitle.set(key, chapter);
    });
    return Array.from(byTitle.values()).sort((a, b) => (a.chapterNumber ?? 999) - (b.chapterNumber ?? 999) || a.title.localeCompare(b.title));
  }, [ncertChapters, resources, selectedSubject]);

  useEffect(() => {
    if (!initialChapter || loading) return;
    if (classFilter !== initialChapter.classNumber) { setClassFilter(initialChapter.classNumber); return; }
    const subject = subjects.find((item) => item.toLocaleLowerCase() === initialChapter.subject.toLocaleLowerCase());
    if (subject && subject !== selectedSubject) setSelectedSubject(subject);
  }, [initialChapter, loading, classFilter, subjects, selectedSubject]);

  useEffect(() => {
    if (!initialChapter || loading || selectedSubject.toLocaleLowerCase() !== initialChapter.subject.toLocaleLowerCase()) return;
    const chapter = chapters.find((item) => item.title === initialChapter.chapterTitle) || chapters.find((item) => normalizeChapter(item.title) === normalizeChapter(initialChapter.chapterTitle));
    if (!chapter) return;
    setSelectedChapter(chapter.title);
    onInitialChapterOpened?.();
  }, [initialChapter, loading, selectedSubject, chapters, onInitialChapterOpened]);

  const activeChapter = chapters.find((item) => item.title === selectedChapter);
  const activeProgress = activeChapter && userId ? chapterProgress[progressKey(classFilter, selectedSubject, activeChapter.title)] : undefined;
  const filteredChapters = chapters.filter((chapter) => chapter.title.toLowerCase().includes(chapterSearch.trim().toLowerCase()));
  const chapterResources = activeChapter?.resources || [];
  const visibleByType = (types: readonly string[]) => chapterResources.filter((r) => types.includes(r.resource_type)).filter((r) => {
    if (bookmarkedOnly && !bookmarks.has(r.id)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${r.title} ${r.description || ""} ${r.markdown_content || ""} ${r.source_label || ""}`.toLowerCase().includes(q);
  });

  const counts = {
    notes: visibleByType(["chapter_lesson", "short_notes", "other"]).length,
    formulas: visibleByType(["formula_sheet"]).length,
    pyq: visibleByType(["pyq", "chapter_practice"]).length,
    revision: visibleByType(["quick_revision"]).length,
    ncert: (activeChapter?.textbookUrl ? 1 : 0) + visibleByType(["textbook"]).length,
  };

  useEffect(() => {
    if (!selectedChapter) return;
    const totalDlms = counts.notes + counts.formulas + counts.pyq + counts.revision;
    const firstWithContent = totalDlms === 0 ? "ncert" : (TAB_DEFS.find((t) => counts[t.value] > 0)?.value || "ncert");
    setTab((current) => (counts[current] > 0 || current === "ncert" ? current : firstWithContent));
  }, [selectedChapter, activeChapter?.textbookUrl, counts.notes, counts.formulas, counts.pyq, counts.revision]);

  const toggleBookmark = async (id: string) => {
    if (!userId) { toast.error("Sign in to save bookmarks"); return; }
    const saved = bookmarks.has(id);
    setBookmarks((current) => {
      const next = new Set(current);
      if (saved) next.delete(id);
      else next.add(id);
      const cached = studyDataCache.get(`${classFilter}:${userId}`);
      if (cached) cached.bookmarks = Array.from(next);
      return next;
    });
    const result = saved
      ? await (supabase as any).from("study_resource_bookmarks").delete().eq("user_id", userId).eq("resource_id", id)
      : await (supabase as any).from("study_resource_bookmarks").insert({ user_id: userId, resource_id: id });
    if (result.error) setBookmarks((current) => {
      const next = new Set(current);
      if (saved) next.add(id);
      else next.delete(id);
      const cached = studyDataCache.get(`${classFilter}:${userId}`);
      if (cached) cached.bookmarks = Array.from(next);
      return next;
    });
  };

  const updateChapterProgress = async (status: ChapterProgressStatus) => {
    if (!userId || !activeChapter || savingProgress) return;
    const key = progressKey(classFilter, selectedSubject, activeChapter.title);
    const previous = chapterProgress[key];
    const now = new Date().toISOString();
    const next: ChapterProgress = { user_id: userId, class_number: classFilter, subject: selectedSubject, chapter_title: activeChapter.title, status, started_at: previous?.started_at || now, completed_at: status === "completed" ? now : null, updated_at: now };
    setSavingProgress(true); setProgressError("");
    setChapterProgress((current) => {
      const updated = { ...current, [key]: next };
      const cached = studyDataCache.get(`${classFilter}:${userId}`);
      if (cached) cached.chapterProgress = updated;
      return updated;
    });
    try {
      const { error } = await (supabase as any).from("study_chapter_progress").upsert(next, { onConflict: "user_id,class_number,subject,chapter_title" });
      if (error) throw error;
    } catch {
      setChapterProgress((current) => {
        const restored = { ...current };
        if (previous) restored[key] = previous; else delete restored[key];
        const cached = studyDataCache.get(`${classFilter}:${userId}`);
        if (cached) cached.chapterProgress = restored;
        return restored;
      });
      setProgressError("Progress could not be saved. Please try again.");
    } finally { setSavingProgress(false); }
  };

  const requestNotes = async () => {
    if (!userId || !activeChapter) { toast.error("Sign in to request notes"); return; }
    setRequestingNotes(true);
    try {
      const title = `Notes request: Class ${classFilter} ${selectedSubject} - ${displayChapterTitle(activeChapter.title, activeChapter.chapterNumber)}`;
      const { error } = await supabase.from("book_requests").insert({ user_id: userId, requested_title: title.slice(0, 180), requested_author: "DLMS Study", status: "pending" } as any);
      if (error) throw error;
      toast.success("Notes request sent to staff");
    } catch (e: any) {
      toast.error(e?.message || "Could not send request");
    } finally { setRequestingNotes(false); }
  };

  const continueChapter = useMemo(() => {
    if (!selectedSubject || !chapters.length) return null;
    return chapters.find((chapter) => {
      const progress = chapterProgress[progressKey(classFilter, selectedSubject, chapter.title)];
      return progress?.status === "in_progress" || progress?.status === "needs_revision";
    });
  }, [chapters, chapterProgress, classFilter, selectedSubject]);

  const chooseSubject = (subject: string) => { setSelectedSubject(subject); setSelectedChapter(""); setChapterSearch(""); window.localStorage.setItem(SUBJECT_STORAGE_KEY, subject); };
  const openChapter = (title: string) => { setSelectedChapter(title); setTab("notes"); setQuery(""); setBookmarkedOnly(false); setTwoMinuteMode(false); writeLastStudy({ classNumber: classFilter, subject: selectedSubject, chapterTitle: title, ts: Date.now() }); };
  const openResourceFile = (url: string, title?: string) => {
    if (dataSaver && !window.confirm("Low-data mode is on. Opening this file may use mobile data. Continue?")) return;
    setReaderItem({
      title: title || displayChapterTitle(selectedChapter, activeChapter?.chapterNumber) || "Study Resource",
      url,
      subject: selectedSubject,
      studentClass: classFilter,
      chapterTitle: displayChapterTitle(selectedChapter, activeChapter?.chapterNumber),
    });
  };
  const openNcert = () => {
    if (dataSaver && !window.confirm("Low-data mode is on. Opening the NCERT PDF may use mobile data. Continue?")) return;
    const url = activeChapter?.textbookUrl || "https://ncert.nic.in/textbook.php";
    setReaderItem({
      title: activeChapter?.bookName
        ? `${activeChapter.bookName} — ${displayChapterTitle(selectedChapter, activeChapter?.chapterNumber)}`
        : displayChapterTitle(selectedChapter, activeChapter?.chapterNumber) || "NCERT Chapter",
      url,
      subject: selectedSubject,
      studentClass: classFilter,
      chapterTitle: displayChapterTitle(selectedChapter, activeChapter?.chapterNumber),
    });
  };
  const askDoubt = () => { onOpenDoubt?.(); };
  const markRead = (id: string) => setReadNotes((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    localStorage.setItem("dlms-study-read-notes", JSON.stringify(Array.from(next)));
    return next;
  });

  const subject = subjectTheme(selectedSubject || "General");
  const progressStatus = activeProgress?.status;
  const heroUpdated = chapterResources.reduce<string | null>((latest, r) => {
    const d = r.updated_at || r.created_at; if (!d) return latest; if (!latest) return d; return new Date(d) > new Date(latest) ? d : latest;
  }, null);

  const progressMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-background px-3 text-xs sm:text-sm font-medium hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Change chapter progress">
          <span className={`h-2 w-2 rounded-full ${progressStatus === "completed" ? "bg-emerald-500" : progressStatus === "needs_revision" ? "bg-amber-500" : progressStatus === "in_progress" ? "bg-primary" : "bg-muted-foreground/40"}`} />
          {progressStatus ? progressLabel[progressStatus] : "Not started"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem onClick={() => updateChapterProgress("in_progress")}>Studying</DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateChapterProgress("needs_revision")}>Needs revision</DropdownMenuItem>
        <DropdownMenuItem onClick={() => updateChapterProgress("completed")}>Completed</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const tabContentNotes = () => {
    const notes = visibleByType(["chapter_lesson", "short_notes", "other"]);
    if (!notes.length) return <StudyEmptyState onOpenNcert={openNcert} onAskDoubt={onOpenDoubt ? askDoubt : undefined} onRequestNotes={userId ? requestNotes : undefined} requesting={requestingNotes} />;
    return <div className="space-y-3">{notes.map((r) => {
      const read = readNotes.has(r.id);
      return <Card key={r.id} className="rounded-xl border-border/70 shadow-none">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="secondary" className="rounded-full">{KIND[r.resource_type] || "Resource"}</Badge>
                {r.source_label && <Badge variant="outline" className="rounded-full">{r.source_label}</Badge>}
              </div>
              <h3 className="text-base font-semibold leading-6">{r.title}</h3>
              {r.description && <p className="text-sm text-muted-foreground mt-1 leading-6">{r.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {supported && r.markdown_content && (
                <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label={speaking ? "Stop reading aloud" : "Read this note aloud"} onClick={() => (speaking ? stop() : speak(r.markdown_content || ""))}>
                  {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label={bookmarks.has(r.id) ? "Remove bookmark" : "Bookmark"} onClick={() => toggleBookmark(r.id)}>{bookmarks.has(r.id) ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}</Button>
            </div>
          </div>
          {r.markdown_content ? <details className="rounded-lg border bg-muted/20 p-3 group">
            <summary className="cursor-pointer text-sm font-medium min-h-11 flex items-center">Read notes</summary>
            <div className="prose prose-sm mt-3 max-w-none dark:prose-invert reading-content"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{r.markdown_content}</ReactMarkdown></div>
          </details> : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="inline-flex items-center gap-2 text-sm min-h-11 px-1 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={read} onChange={() => markRead(r.id)} />
              <span className={read ? "text-muted-foreground line-through" : ""}>Mark as read</span>
            </label>
            {r.file_url && <Button size="sm" variant="outline" className="min-h-11 rounded-xl ml-auto" onClick={() => openResourceFile(r.file_url, r.title)}>Open resource <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></Button>}
          </div>
        </CardContent>
      </Card>;
    })}</div>;
  };

  const tabContentFormulas = () => {
    const formulas = visibleByType(["formula_sheet"]);
    if (!formulas.length) return <StudyEmptyState title="No formula sheets reviewed yet." description="Open NCERT or ask AI doubt while formulas are being reviewed." onOpenNcert={openNcert} onAskDoubt={onOpenDoubt ? askDoubt : undefined} onRequestNotes={userId ? requestNotes : undefined} requesting={requestingNotes} />;
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{formulas.map((r) => (
      <FormulaCard key={r.id} title={r.title} formula={r.markdown_content || r.description || r.title} label={r.description} units={r.marks ? `${r.marks} marks ref` : r.source_label} bookmarked={bookmarks.has(r.id)} onToggleBookmark={() => toggleBookmark(r.id)} />
    ))}</div>;
  };

  const tabContentPyq = () => {
    const raw = visibleByType(["pyq", "chapter_practice"]);
    const years = Array.from(new Set(raw.map((r) => r.exam_year).filter(Boolean))) as number[];
    const boards = Array.from(new Set(raw.map(inferBoard).filter(Boolean))) as string[];
    const marksVals = Array.from(new Set(raw.map((r) => r.marks).filter(Boolean))) as number[];
    const filtered = raw.filter((r) => (pyqYear === "all" || String(r.exam_year) === pyqYear) && (pyqBoard === "all" || inferBoard(r) === pyqBoard) && (pyqMarks === "all" || String(r.marks) === pyqMarks));
    const items: PyqItem[] = filtered.filter((r) => r.resource_type === "pyq").map((r) => ({ id: r.id, question: r.markdown_content || r.description || r.title, answer: r.source_url ? `Source: ${r.source_url}` : undefined, year: r.exam_year, marks: r.marks, board: inferBoard(r), sourceLabel: r.source_label }));
    const practice = filtered.filter((r) => r.resource_type === "chapter_practice");
    if (!raw.length) return <StudyEmptyState title="No PYQs or practice sets reviewed yet." description="Practice questions will appear here after review." onOpenNcert={openNcert} onAskDoubt={onOpenDoubt ? askDoubt : undefined} onRequestNotes={userId ? requestNotes : undefined} requesting={requestingNotes} />;
    const Chip = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
      <button type="button" onClick={onClick} className={`min-h-11 px-3 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted/50 text-foreground"}`} aria-pressed={active}>{label}</button>
    );
    return <div className="space-y-4">
      <div className="space-y-2" aria-label="PYQ filters">
        <div className="flex flex-wrap gap-2">{[["all","All years"], ...years.sort((a,b)=>b-a).map((y)=>[String(y),String(y)])].map(([v,l]) => <Chip key={`y-${v}`} active={pyqYear===v} label={l} onClick={()=>setPyqYear(v)} />)}</div>
        <div className="flex flex-wrap gap-2">{[["all","All boards"], ...boards.map((b)=>[b,b])].map(([v,l]) => <Chip key={`b-${v}`} active={pyqBoard===v} label={l} onClick={()=>setPyqBoard(v)} />)}</div>
        <div className="flex flex-wrap gap-2">{[["all","All marks"], ...marksVals.sort((a,b)=>a-b).map((m)=>[String(m),`${m} marks`])].map(([v,l]) => <Chip key={`m-${v}`} active={pyqMarks===v} label={l} onClick={()=>setPyqMarks(v)} />)}</div>
      </div>
      {!filtered.length ? <StudyEmptyState title="No questions match these filters." description="Try clearing a filter or ask AI for help with this chapter." onOpenNcert={openNcert} onAskDoubt={onOpenDoubt ? askDoubt : undefined} onRequestNotes={userId ? requestNotes : undefined} requesting={requestingNotes} /> : null}
      {items.map((item) => <PyqCard key={item.id} item={item} onExplain={onOpenDoubt ? () => { window.sessionStorage.setItem("dlms-doubt-prefill", item.question.slice(0, 1000)); onOpenDoubt(); } : undefined} />)}
      {practice.map((r) => <Card key={r.id} className="rounded-xl border-border/70 shadow-none"><CardContent className="p-4 sm:p-5 space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{r.title}</h3><Badge variant="secondary" className="rounded-full">Practice</Badge></div><ChapterPracticeSet resourceId={r.id} content={r.markdown_content} /></CardContent></Card>)}
    </div>;
  };

  const tabContentRevision = () => {
    const rev = visibleByType(["quick_revision"]);
    if (!rev.length) return <StudyEmptyState title="No quick revision available yet." description="Quick revision cards appear after staff review." onOpenNcert={openNcert} onAskDoubt={onOpenDoubt ? askDoubt : undefined} onRequestNotes={userId ? requestNotes : undefined} requesting={requestingNotes} />;
    const points = rev.flatMap((r) => {
      const text = r.markdown_content || r.description || "";
      return text.split(/\n(?=#{1,3}\s|\d+\.\s|[-*]\s)/).map((s) => s.trim()).filter(Boolean).slice(0, 12).map((content, i) => ({ id: `${r.id}-${i}`, title: r.title + (i ? ` (${i + 1})` : ""), content }));
    });
    return <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Revise key points quickly before class or tests.</p>
        <Button type="button" variant={twoMinuteMode ? "default" : "outline"} className="min-h-11 rounded-xl" onClick={() => setTwoMinuteMode((v) => !v)}><TimerReset className="h-4 w-4 mr-1.5" /> {twoMinuteMode ? "Card mode" : "Revise in 2 min"}</Button>
      </div>
      <RevisionCards points={points} twoMinuteMode={twoMinuteMode} />
    </div>;
  };

  const tabContentNcert = () => (
    <div className="space-y-3">
      <Card className="rounded-xl border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0"><BookOpen className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground">{activeChapter?.bookName || "Official NCERT Chapter"}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{activeChapter?.textbookUrl ? "Read the official NCERT chapter PDF right inside DLMS." : "NCERT link is not added for this chapter yet. Browse the official NCERT portal."}</p>
            </div>
          </div>
          <Button className="min-h-11 rounded-xl sm:shrink-0" onClick={openNcert}><ExternalLink className="h-4 w-4 mr-2" />{activeChapter?.textbookUrl ? "Open PDF" : "Open NCERT portal"}</Button>
        </CardContent>
      </Card>
      {visibleByType(["textbook"]).map((r) => (
        <Card key={r.id} className="rounded-xl border-border/70 shadow-none"><CardContent className="p-4 flex items-center justify-between gap-3"><div><p className="font-medium text-sm">{r.title}</p><p className="text-xs text-muted-foreground">{r.source_label || "Textbook resource"}</p></div>{r.file_url && <Button variant="outline" size="sm" className="min-h-11 rounded-xl" onClick={() => openResourceFile(r.file_url, r.title)}>Open</Button>}</CardContent></Card>
      ))}
    </div>
  );

  return <TooltipProvider delayDuration={200}><div className="study-v2 mx-auto w-full max-w-[1200px] pb-24">
    {loading ? (
      <div className="p-4 space-y-4" aria-label="Loading chapter" role="status">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    ) : loadError ? (
      <Card className="m-4 rounded-xl"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{loadError}</p><Button className="mt-4 min-h-11 rounded-xl" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>Try again</Button></CardContent></Card>
    ) : selectedChapter ? (
      <section aria-label={`${selectedChapter} chapter`} className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label="Back to chapters" onClick={() => { setSelectedChapter(""); setQuery(""); setBookmarkedOnly(false); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/30">Class {classFilter}</span>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ color: subject.color, backgroundColor: subject.tint, borderColor: `${subject.color}22` }}>{selectedSubject}</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold truncate text-foreground">{displayChapterTitle(selectedChapter, activeChapter?.chapterNumber)}</h1>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <Tooltip><TooltipTrigger asChild><span>{progressMenu}</span></TooltipTrigger><TooltipContent className="max-w-[220px] text-xs">Opening a chapter does not mark it complete.</TooltipContent></Tooltip>
            </div>
          </div>
        </header>

        <div className="px-4 pt-4 space-y-4">
          <Card className="rounded-2xl border-border/70 shadow-none overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: subject.color }}>
                    {activeChapter?.chapterNumber ? `Chapter ${activeChapter.chapterNumber}` : "Chapter Topic"}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5 text-foreground">{displayChapterTitle(selectedChapter, activeChapter?.chapterNumber)}</h2>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><NotebookText className="h-3.5 w-3.5" /> {counts.notes} notes</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><Calculator className="h-3.5 w-3.5" /> {counts.formulas} formulas</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><CircleHelp className="h-3.5 w-3.5" /> {counts.pyq} PYQs</span>
                    {heroUpdated && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Updated {new Date(heroUpdated).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {tab !== "ncert" && (
                    <Button className="min-h-11 rounded-xl font-semibold" onClick={openNcert}><BookOpen className="h-4 w-4 mr-2" />Open NCERT chapter</Button>
                  )}
                  {onOpenDoubt && <Button variant={tab === "ncert" ? "default" : "outline"} className="min-h-11 rounded-xl font-semibold" onClick={askDoubt}><Sparkles className="h-4 w-4 mr-2" />Ask AI doubt</Button>}
                </div>
              </div>
              {progressError && <p role="status" className="text-sm text-destructive mt-3">{progressError}</p>}
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="space-y-4">
            <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-b border-border/60">
              <div className="flex flex-col gap-2">
                <TabsList className="h-auto w-full justify-start overflow-x-auto no-scrollbar rounded-xl bg-muted/50 p-1 gap-1">
                  {TAB_DEFS.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger key={value} value={value} className="min-h-10 rounded-lg px-3 sm:px-4 text-xs sm:text-sm data-[state=active]:shadow-none data-[state=active]:bg-background shrink-0">
                      <Icon className="h-4 w-4 mr-1.5 shrink-0" /><span>{label}</span>
                      <span className="ml-1.5 text-[11px] text-muted-foreground tabular-nums">{counts[value]}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {chapterResources.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in this chapter" className="pl-9 min-h-10 rounded-xl" aria-label="Search chapter resources" /></div>
                    <Button type="button" variant={bookmarkedOnly ? "default" : "outline"} size="icon" className="h-10 w-10 rounded-xl shrink-0" aria-label={bookmarkedOnly ? "Show all resources" : "Show bookmarked only"} aria-pressed={bookmarkedOnly} onClick={() => setBookmarkedOnly((v) => !v)}>
                      {bookmarkedOnly ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <AskAiSelectionLayer
              studentClass={classFilter}
              subject={selectedSubject}
              chapterTitle={displayChapterTitle(selectedChapter, activeChapter?.chapterNumber)}
            >
              <TabsContent value="notes" className="mt-0 focus-visible:ring-0">{tabContentNotes()}</TabsContent>
              <TabsContent value="formulas" className="mt-0 focus-visible:ring-0">{tabContentFormulas()}</TabsContent>
              <TabsContent value="pyq" className="mt-0 focus-visible:ring-0">{tabContentPyq()}</TabsContent>
              <TabsContent value="revision" className="mt-0 focus-visible:ring-0">{tabContentRevision()}</TabsContent>
              <TabsContent value="ncert" className="mt-0 focus-visible:ring-0">{tabContentNcert()}</TabsContent>
            </AskAiSelectionLayer>
          </Tabs>

          <div className="text-[11px] text-muted-foreground pb-2">
            Reviewed notes, formulas, and PYQs appear here once approved. {activeProgress?.status === "completed" ? "You marked this chapter completed." : "Opening a chapter doesn't mark it complete — update status in the menu above."}
          </div>
        </div>
      </section>
    ) : (
      <section aria-label="Study subjects and chapters" className="study-v2-list">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-foreground">Study</h1>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-9 rounded-full bg-primary/10 hover:bg-primary/15 border-0 text-primary text-xs font-bold px-3 shadow-none gap-1 focus:ring-0" aria-label="Select class"><SelectValue placeholder={`Class ${classFilter}`} /></SelectTrigger>
              <SelectContent className="rounded-xl">{Array.from({ length: 7 }, (_, i) => String(i + 6)).map((c) => <SelectItem key={c} value={c}>Class {c}{c === ownClass ? " · My class" : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground" aria-label="Search chapters" onClick={() => setChapterSearchOpen((o) => !o)}><Search className="h-4.5 w-4.5" /></Button>
        </header>

        {chapterSearchOpen && <div className="px-4 pt-4"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus className="min-h-11 rounded-xl pl-11 text-sm" value={chapterSearch} onChange={(e) => setChapterSearch(e.target.value)} placeholder={`Search ${selectedSubject || "chapters"}`} aria-label="Search chapters" /></div></div>}
        <div className="study-v2-tabs no-scrollbar" role="tablist" aria-label="Subjects">
          {subjects.map((s) => { const theme = subjectTheme(s); const Icon = theme.icon; const active = selectedSubject.toLowerCase() === s.toLowerCase(); return <button key={s} ref={active ? activeSubjectRef : undefined} type="button" role="tab" aria-selected={active} onClick={() => chooseSubject(s)} className={`study-v2-tab ${active ? "study-v2-tab-active" : ""}`}><span className="study-v2-subject-icon" style={{ backgroundColor: active ? theme.color : theme.tint, color: active ? "#fff" : theme.color }}><Icon className="h-4.5 w-4.5" /></span><span className="study-v2-tab-label" title={s}>{shortSubjectName(s)}</span></button>; })}
        </div>

        {selectedSubject && <div className="mx-4 mt-3 mb-2 rounded-2xl border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/50 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5"><Sparkles className="h-4 w-4 text-amber-500 shrink-0" /><span>DLMS notes are being added. NCERT books are available now.</span></div>}
        {selectedSubject && <div className="study-v2-action" style={{ backgroundColor: subjectTheme(selectedSubject).tint }}><div className="min-w-0"><p className="text-sm font-bold text-slate-800 dark:text-slate-100">Stuck on something?</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Ask the AI Doubt Solver</p></div><Button type="button" disabled={!onOpenDoubt} onClick={() => onOpenDoubt?.()} className="h-10 shrink-0 rounded-xl bg-white px-4 text-xs font-bold text-slate-900 shadow-sm hover:bg-white/90">Ask a doubt</Button></div>}

        {selectedSubject ? <div className="study-v2-chapter-grid">
          {filteredChapters.length ? filteredChapters.map((chapter, index) => {
            const theme = subjectTheme(selectedSubject);
            const progress = chapterProgress[progressKey(classFilter, selectedSubject, chapter.title)];
            const progressPercent = progress?.status === "completed" ? 100 : progress?.status === "needs_revision" ? 70 : progress?.status === "in_progress" ? 40 : 0;
            const progressText = progress?.status === "completed" ? "Done" : progress?.status === "in_progress" ? "40%" : progress?.status === "needs_revision" ? "Needs revision" : "Yet to start";
            const chips = [
              { label: "Notes", count: chapter.resources.filter((r) => ["short_notes","chapter_lesson"].includes(r.resource_type)).length, icon: NotebookText },
              { label: "Formulas", count: chapter.resources.filter((r) => r.resource_type === "formula_sheet").length, icon: Calculator },
              { label: "Revision", count: chapter.resources.filter((r) => r.resource_type === "quick_revision").length, icon: FileText },
              { label: "Questions", count: chapter.resources.filter((r) => ["chapter_practice","pyq"].includes(r.resource_type)).length, icon: CircleHelp },
            ].filter((c) => c.count > 0);
            const cleanTitle = displayChapterTitle(chapter.title, chapter.chapterNumber);
            return <button key={chapter.title} type="button" onClick={() => openChapter(chapter.title)} className="study-v2-chapter-card">
              <div className="flex min-w-0 items-start gap-3">
                <span className="pt-0.5 text-sm font-black tabular-nums" style={{ color: theme.color }}>{String(chapter.chapterNumber || index + 1).padStart(2, "0")}</span>
                <h2 className="min-w-0 line-clamp-2 text-left text-sm font-bold leading-5 text-foreground">{cleanTitle}</h2>
              </div>
              <div className="mt-2.5 flex min-h-6 flex-wrap gap-1.5">
                {chips.length ? chips.map((chip) => { const ChipIcon = chip.icon; return <span key={chip.label} className="study-v2-content-chip"><ChipIcon className="h-3.5 w-3.5" />{chip.label} {chip.count}</span>; }) : chapter.textbookUrl ? <span className="study-v2-ncert-icon" title="NCERT chapter available"><BookOpen className="h-3.5 w-3.5" /> NCERT PDF</span> : null}
              </div>
              <div className="mt-auto flex items-center gap-3 pt-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-label={`${cleanTitle} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, backgroundColor: theme.color }} /></div>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">{progressText}</span>
              </div>
            </button>;
          }) : <div className="study-v2-empty"><BookOpen className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No matching chapters</p><p className="mt-1 text-xs text-muted-foreground">Try another search or subject.</p></div>}
        </div> : <div className="study-v2-empty"><BookOpen className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">Class chapter list is not available yet</p><a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer">Open NCERT textbook catalogue</a></div>}

        {continueChapter && !selectedChapter && (
          <div className="sticky bottom-20 md:bottom-6 z-20 mx-4 mt-4 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Continue studying</p><p className="truncate text-sm font-bold text-foreground">{displayChapterTitle(continueChapter.title, continueChapter.chapterNumber)}</p></div>
            <Button size="sm" className="h-11 shrink-0 rounded-xl gradient-primary text-white font-bold" onClick={() => openChapter(continueChapter.title)}>Resume <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        )}
      </section>
    )}
  </div>
  <InAppReaderDialog item={readerItem} onClose={() => setReaderItem(null)} />
  </TooltipProvider>;
}
