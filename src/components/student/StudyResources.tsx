import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ArrowLeft, Bookmark, BookmarkCheck, BookOpen, Calculator, ChevronDown, ChevronRight, CircleHelp, ExternalLink, FileText, NotebookText, Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { openStudyMaterial } from "@/lib/studyMaterialAccess";
import ChapterPracticeSet from "@/components/student/ChapterPracticeSet";
import {
  displayChapterTitle,
  shortSubjectName,
  subjectTheme,
  writeLastStudy,
} from "@/lib/subjectTheme";

type Resource = { id: string; title: string; description: string | null; subject: string | null; student_class: string | null; chapter_title: string | null; resource_type: string; academic_session: string; exam_year: number | null; marks: number | null; source_label: string | null; source_url: string | null; markdown_content: string | null; file_url: string; file_type: string | null };
type NcertChapter = { id: string; subject: string; book_name: string; chapter_number: number | null; chapter_title: string; file_url: string };
type Chapter = { title: string; chapterNumber?: number | null; textbookUrl?: string; bookName?: string; resources: Resource[] };
type ChapterProgressStatus = "in_progress" | "needs_revision" | "completed";
type ChapterProgress = { user_id: string; class_number: string; subject: string; chapter_title: string; status: ChapterProgressStatus; started_at: string; completed_at: string | null; updated_at: string };
const KIND: Record<string, string> = { chapter_lesson: "Chapter Lesson", short_notes: "Short Notes", formula_sheet: "Formula Sheet", quick_revision: "Quick Revision", chapter_practice: "Practice", pyq: "PYQ", textbook: "Textbook / Syllabus", other: "Other" };
const RESOURCE_ORDER: Record<string, number> = { chapter_lesson: 0, short_notes: 1, formula_sheet: 2, quick_revision: 3, chapter_practice: 4, pyq: 5, textbook: 6, other: 7 };

const normalizeSubject = (subject: string) => subject.replace(/(_Part\d| Part \d)/gi, "").replace(/_/g, " ").trim();
const normalizeChapter = (title: string) => title.replace(/^(chapter|unit|lesson)\s*\d+\s*[-–:.)]?\s*/i, "").trim().toLocaleLowerCase();
const progressKey = (classNumber: string, subject: string, chapterTitle: string) => `${classNumber}|${subject.trim().toLocaleLowerCase()}|${chapterTitle.trim().toLocaleLowerCase()}`;
const progressLabel: Record<ChapterProgressStatus, string> = { in_progress: "In progress", needs_revision: "Needs revision", completed: "Completed" };
const SUBJECT_STORAGE_KEY = "dlms-study-last-subject";

export default function StudyResources({ studentClass, userId, onOpenDoubt, initialChapter, onInitialChapterOpened }: { studentClass?: string | number | null; userId?: string; onOpenDoubt?: () => void; initialChapter?: { classNumber: string; subject: string; chapterTitle: string } | null; onInitialChapterOpened?: () => void }) {
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
  const [resourceType, setResourceType] = useState("all");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [chapterSearchOpen, setChapterSearchOpen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const activeSubjectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeSubjectRef.current) {
      activeSubjectRef.current.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  }, [selectedSubject, classFilter]);

  useEffect(() => { setClassFilter(ownClass); }, [ownClass]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError("");
    setSelectedSubject("");
    setSelectedChapter("");
    (async () => {
      const [materialsResult, chaptersResult] = await Promise.all([
        (supabase as any).from("study_materials").select("id,title,description,subject,student_class,chapter_title,resource_type,academic_session,exam_year,marks,source_label,source_url,markdown_content,file_url,file_type").eq("review_status", "approved").in("student_class", [classFilter, "All"]).order("subject").order("chapter_title"),
        supabase.from("ncert_books").select("id,subject,book_name,chapter_number,chapter_title,file_url").eq("class_number", classFilter).order("chapter_number", { ascending: true }),
      ]);
      if (!alive) return;
      setResources(materialsResult.error ? [] : ((materialsResult.data || []) as Resource[]));
      setNcertChapters(chaptersResult.error ? [] : ((chaptersResult.data || []) as NcertChapter[]));
      if (materialsResult.error && chaptersResult.error) setLoadError("Study materials could not be loaded. Please try again in a moment.");
      if (userId) {
        const [bookmarksResult, progressResult] = await Promise.all([
          (supabase as any).from("study_resource_bookmarks").select("resource_id").eq("user_id", userId),
          (supabase as any).from("study_chapter_progress").select("user_id,class_number,subject,chapter_title,status,started_at,completed_at,updated_at").eq("user_id", userId).eq("class_number", classFilter).order("updated_at", { ascending: false }),
        ]);
        if (!alive) return;
        setBookmarks(new Set((bookmarksResult.data || []).map((row: any) => row.resource_id)));
        if (progressResult.error) {
          setChapterProgress({});
          setProgressError("Chapter progress could not be loaded. Your study materials are still available.");
        } else {
          const progressMap = (progressResult.data || []).reduce((map: Record<string, ChapterProgress>, row: ChapterProgress) => {
            map[progressKey(row.class_number, row.subject, row.chapter_title)] = row;
            return map;
          }, {});
          setChapterProgress(progressMap);
          setProgressError("");
        }
      } else {
        setBookmarks(new Set());
        setChapterProgress({});
        setProgressError("");
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [classFilter, userId, reloadKey]);

  const subjects = useMemo(() => Array.from(new Set([
    ...ncertChapters.map((chapter) => normalizeSubject(chapter.subject)),
    ...resources.map((resource) => resource.subject ? normalizeSubject(resource.subject) : "General"),
  ])).filter(Boolean).sort((a, b) => {
    const latestFor = (subject: string) => Object.values(chapterProgress)
      .filter((row) => row.subject.toLowerCase() === subject.toLowerCase())
      .reduce((latest, row) => Math.max(latest, new Date(row.updated_at).getTime()), 0);
    return latestFor(b) - latestFor(a) || a.localeCompare(b);
  }), [ncertChapters, resources, chapterProgress]);

  useEffect(() => {
    if (loading || initialChapter || !subjects.length) return;
    if (selectedSubject && subjects.some((subject) => subject.toLowerCase() === selectedSubject.toLowerCase())) return;
    const remembered = window.localStorage.getItem(SUBJECT_STORAGE_KEY);
    const nextSubject = subjects.find((subject) => subject.toLowerCase() === remembered?.toLowerCase()) || subjects[0];
    setSelectedSubject(nextSubject);
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
    if (classFilter !== initialChapter.classNumber) {
      setClassFilter(initialChapter.classNumber);
      return;
    }
    const subject = subjects.find((item) => item.toLocaleLowerCase() === initialChapter.subject.toLocaleLowerCase());
    if (subject && subject !== selectedSubject) setSelectedSubject(subject);
  }, [initialChapter, loading, classFilter, subjects, selectedSubject]);

  useEffect(() => {
    if (!initialChapter || loading || selectedSubject.toLocaleLowerCase() !== initialChapter.subject.toLocaleLowerCase()) return;
    const chapter = chapters.find((item) => item.title === initialChapter.chapterTitle)
      || chapters.find((item) => normalizeChapter(item.title) === normalizeChapter(initialChapter.chapterTitle));
    if (!chapter) return;
    setSelectedChapter(chapter.title);
    onInitialChapterOpened?.();
  }, [initialChapter, loading, selectedSubject, chapters, onInitialChapterOpened]);

  const activeChapter = chapters.find((item) => item.title === selectedChapter);
  const activeProgress = activeChapter && userId ? chapterProgress[progressKey(classFilter, selectedSubject, activeChapter.title)] : undefined;
  const filteredChapters = chapters.filter((chapter) => chapter.title.toLowerCase().includes(chapterSearch.trim().toLowerCase()));
  const visibleResources = (activeChapter?.resources || []).filter((resource) => {
    if (bookmarkedOnly && !bookmarks.has(resource.id)) return false;
    if (resourceType !== "all" && resource.resource_type !== resourceType) return false;
    const searchable = `${resource.title} ${resource.description || ""} ${resource.chapter_title || ""} ${resource.source_label || ""}`.toLowerCase();
    return !query.trim() || searchable.includes(query.toLowerCase());
  }).sort((a, b) => (RESOURCE_ORDER[a.resource_type] ?? 99) - (RESOURCE_ORDER[b.resource_type] ?? 99) || a.title.localeCompare(b.title));

  const toggleBookmark = async (id: string) => {
    if (!userId) return;
    const saved = bookmarks.has(id);
    setBookmarks((current) => { const next = new Set(current); saved ? next.delete(id) : next.add(id); return next; });
    const result = saved
      ? await (supabase as any).from("study_resource_bookmarks").delete().eq("user_id", userId).eq("resource_id", id)
      : await (supabase as any).from("study_resource_bookmarks").insert({ user_id: userId, resource_id: id });
    if (result.error) setBookmarks((current) => { const next = new Set(current); saved ? next.add(id) : next.delete(id); return next; });
  };

  const updateChapterProgress = async (status: ChapterProgressStatus) => {
    if (!userId || !activeChapter || savingProgress) return;
    const key = progressKey(classFilter, selectedSubject, activeChapter.title);
    const previous = chapterProgress[key];
    const now = new Date().toISOString();
    const next: ChapterProgress = {
      user_id: userId,
      class_number: classFilter,
      subject: selectedSubject,
      chapter_title: activeChapter.title,
      status,
      started_at: previous?.started_at || now,
      completed_at: status === "completed" ? now : null,
      updated_at: now,
    };
    setSavingProgress(true);
    setProgressError("");
    setChapterProgress((current) => ({ ...current, [key]: next }));
    try {
      const { error } = await (supabase as any).from("study_chapter_progress").upsert(next, { onConflict: "user_id,class_number,subject,chapter_title" });
      if (error) throw error;
    } catch {
      setChapterProgress((current) => {
        const restored = { ...current };
        if (previous) restored[key] = previous;
        else delete restored[key];
        return restored;
      });
      setProgressError("Progress could not be saved. Please try again.");
    } finally {
      setSavingProgress(false);
    }
  };

  const continueChapter = useMemo(() => {
    if (!selectedSubject || !chapters.length) return null;
    return chapters.find((chapter) => {
      const progress = chapterProgress[progressKey(classFilter, selectedSubject, chapter.title)];
      return progress?.status === "in_progress" || progress?.status === "needs_revision";
    });
  }, [chapters, chapterProgress, classFilter, selectedSubject]);

  const resetNavigation = () => { setSelectedChapter(""); setQuery(""); setResourceType("all"); setBookmarkedOnly(false); };
  const chooseSubject = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedChapter("");
    setChapterSearch("");
    window.localStorage.setItem(SUBJECT_STORAGE_KEY, subject);
  };
  const openChapter = (title: string) => {
    setSelectedChapter(title);
    writeLastStudy({
      classNumber: classFilter,
      subject: selectedSubject,
      chapterTitle: title,
      ts: Date.now(),
    });
  };
  const openResourceFile = async (url: string) => { try { await openStudyMaterial(url); } catch { /* RLS may have changed since the list loaded. */ } };

  return <div className="study-v2 mx-auto w-full max-w-[1200px] pb-24">
    {selectedChapter ? (
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          aria-label="Back to chapters"
          onClick={resetNavigation}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-black truncate text-foreground">
            {displayChapterTitle(selectedChapter, activeChapter?.chapterNumber)}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            Class {classFilter} · {selectedSubject} · {activeChapter?.bookName || "NCERT & DLMS Pack"}
          </p>
        </div>
      </header>
    ) : (
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-foreground">Study</h1>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-7 rounded-full bg-primary/10 hover:bg-primary/15 border-0 text-primary text-xs font-bold px-2.5 shadow-none gap-1 focus:ring-0" aria-label="Select class">
              <SelectValue placeholder={`Class ${classFilter}`} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Array.from({ length: 7 }, (_, i) => String(i + 6)).map((c) => (
                <SelectItem key={c} value={c}>Class {c}{c === ownClass ? " · My class" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          aria-label="Search chapters"
          onClick={() => setChapterSearchOpen((open) => !open)}
        >
          <Search className="h-4.5 w-4.5" />
        </Button>
      </header>
    )}

    {loading ? <div className="study-v2-skeletons" role="status" aria-label="Loading study chapters">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="study-v2-skeleton" />)}</div> : loadError ? <Card className="m-4 rounded-[var(--radius-card)]"><CardContent className="p-6 text-center"><p role="alert" className="text-sm text-destructive">{loadError}</p><Button className="mt-4 min-h-11" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button></CardContent></Card> : selectedChapter ? <section aria-label={`${selectedChapter} materials`} className="space-y-4 px-4 pt-4">
      <div><h2 className="text-xl font-bold">{displayChapterTitle(selectedChapter, activeChapter?.chapterNumber)}</h2><p className="mt-1 text-sm text-muted-foreground">Class {classFilter} · {selectedSubject} · {activeChapter?.bookName || "Chapter resources"}</p></div>
      {userId && activeChapter && <Card><CardContent className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Chapter progress</h3><p className="text-sm text-muted-foreground">Opening a chapter does not mark it complete. Update your progress when you are ready.</p></div>{activeProgress && <Badge variant={activeProgress.status === "completed" ? "default" : "outline"}>{progressLabel[activeProgress.status]}</Badge>}</div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={activeProgress?.status === "in_progress" ? "default" : "outline"} disabled={savingProgress} onClick={() => updateChapterProgress("in_progress")}>{activeProgress?.status === "completed" ? "Study again" : activeProgress?.status === "in_progress" ? "Continue studying" : "Start studying"}</Button><Button type="button" size="sm" variant={activeProgress?.status === "needs_revision" ? "default" : "outline"} disabled={savingProgress} onClick={() => updateChapterProgress("needs_revision")}>Needs revision</Button><Button type="button" size="sm" variant={activeProgress?.status === "completed" ? "default" : "outline"} disabled={savingProgress || activeProgress?.status === "completed"} onClick={() => updateChapterProgress("completed")}>{savingProgress ? "Saving…" : activeProgress?.status === "completed" ? "Completed" : "Mark complete"}</Button></div>{progressError && <p role="status" className="text-sm text-destructive">{progressError}</p>}</CardContent></Card>}
      {activeChapter?.textbookUrl ? <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 className="font-semibold">NCERT textbook chapter</h3><p className="text-sm text-muted-foreground">Open the official chapter PDF. The book remains hosted by NCERT.</p></div></div><Button asChild className="min-h-11"><a href={activeChapter.textbookUrl} target="_blank" rel="noreferrer">Open NCERT chapter <ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent></Card> : <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">NCERT chapter link not added</h3><p className="text-sm text-muted-foreground">Open the official catalogue and choose Class {classFilter} · {selectedSubject}.</p></div><Button variant="outline" asChild><a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer">NCERT catalogue <ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent></Card>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px_220px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="min-h-11 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this chapter" aria-label="Search chapter resources" /></div><Select value={resourceType} onValueChange={setResourceType}><SelectTrigger className="min-h-11" aria-label="Filter by resource type"><SelectValue placeholder="All resource types" /></SelectTrigger><SelectContent><SelectItem value="all">All resource types</SelectItem>{Object.entries(KIND).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button type="button" className="min-h-11 gap-2" variant={bookmarkedOnly ? "default" : "outline"} onClick={() => setBookmarkedOnly((current) => !current)}><Bookmark className="h-4 w-4" />{bookmarkedOnly ? "Bookmarks only" : "My bookmarks"}</Button></div>
      {visibleResources.length ? <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{visibleResources.map((resource) => <Card key={resource.id} className="flex min-w-0 flex-col border-border/70"><CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{KIND[resource.resource_type] || "Resource"}</Badge><Badge variant="outline">{resource.academic_session}</Badge>{resource.exam_year && <Badge variant="outline">{resource.exam_year}</Badge>}{resource.marks && <Badge variant="outline">{resource.marks} marks</Badge>}</div><h3 className="mt-2 font-bold leading-snug">{resource.title}</h3></div><button type="button" onClick={() => toggleBookmark(resource.id)} aria-label={bookmarks.has(resource.id) ? "Remove bookmark" : "Bookmark resource"} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{bookmarks.has(resource.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}</button></div>
        <p className="text-xs font-medium text-muted-foreground">{[resource.source_label, resource.exam_year && `Year ${resource.exam_year}`, resource.marks && `${resource.marks} marks`].filter(Boolean).join(" · ") || "DLMS learning material"}</p>{resource.description && <p className="text-sm text-muted-foreground">{resource.description}</p>}
        {resource.resource_type === "chapter_practice" ? <ChapterPracticeSet resourceId={resource.id} content={resource.markdown_content} /> : resource.markdown_content && <details open={resource.resource_type === "chapter_lesson"} className="rounded-xl border bg-muted/30 p-3"><summary className="cursor-pointer text-sm font-semibold">{resource.resource_type === "chapter_lesson" ? "Start lesson" : "Read resource"}</summary><div className="prose prose-sm mt-3 max-w-none dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{resource.markdown_content}</ReactMarkdown></div></details>}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">{resource.file_url && <Button size="sm" onClick={() => openResourceFile(resource.file_url)}>Open resource <ExternalLink className="ml-1 h-3.5 w-3.5" /></Button>}{resource.source_url && <a className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-primary hover:underline" href={resource.source_url} target="_blank" rel="noreferrer">Source <ExternalLink className="h-3.5 w-3.5" /></a>}</div>
      </CardContent></Card>)}</div> : <Card><CardContent className="py-10 text-center"><FileText className="mx-auto h-8 w-8 text-muted-foreground/60" /><h3 className="mt-3 font-semibold">{bookmarkedOnly ? "No bookmarked materials in this chapter" : "No reviewed DLMS materials for this chapter yet"}</h3><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{bookmarkedOnly ? "Turn off My bookmarks to see all available materials." : activeChapter?.textbookUrl ? "The official NCERT chapter is ready above. DLMS notes, formula sheets, quick revision and PYQs appear here after staff add and review them; they are not auto-generated." : "Staff can add sourced notes, formula sheets, quick revision and PYQs after checking the current syllabus. Open the official NCERT catalogue for the textbook in the meantime."}</p>{!bookmarkedOnly && !activeChapter?.textbookUrl && <a className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer">Browse official NCERT textbooks <ExternalLink className="h-4 w-4" /></a>}</CardContent></Card>}
    </section> : <section aria-label="Study subjects and chapters" className="study-v2-list">
      {chapterSearchOpen && <div className="px-4 pt-4"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus className="min-h-11 rounded-[var(--radius-card)] pl-11 text-sm" value={chapterSearch} onChange={(event) => setChapterSearch(event.target.value)} placeholder={`Search ${selectedSubject || "chapters"}`} aria-label="Search chapters" /></div></div>}
      <div className="study-v2-tabs no-scrollbar" role="tablist" aria-label="Subjects">
        {subjects.map((subject) => {
          const theme = subjectTheme(subject);
          const Icon = theme.icon;
          const active = selectedSubject.toLowerCase() === subject.toLowerCase();
          return <button
            key={subject}
            ref={active ? activeSubjectRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => chooseSubject(subject)}
            className={`study-v2-tab ${active ? "study-v2-tab-active" : ""}`}
          >
            <span
              className="study-v2-subject-icon"
              style={{
                backgroundColor: active ? theme.color : theme.tint,
                color: active ? "#ffffff" : theme.color,
              }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="study-v2-tab-label">{shortSubjectName(subject)}</span>
          </button>;
        })}
      </div>

      {selectedSubject && (
        <div className="mx-4 mt-3 mb-2 rounded-2xl border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/50 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
          <span>DLMS notes are being added. NCERT books are available now.</span>
        </div>
      )}

      {selectedSubject && <div className="study-v2-action" style={{ backgroundColor: subjectTheme(selectedSubject).tint }}>
        <div className="min-w-0"><p className="text-sm font-bold text-slate-800">Stuck on something?</p><p className="mt-1 text-xs text-slate-600">Ask the AI Doubt Solver</p></div>
        <Button type="button" disabled={!onOpenDoubt} onClick={() => onOpenDoubt?.()} className="h-11 shrink-0 rounded-[var(--radius-chip)] bg-white px-4 text-xs font-bold text-slate-900 shadow-sm hover:bg-white/90">Ask a doubt</Button>
      </div>}

      {selectedSubject ? <div className="study-v2-chapter-grid">
        {filteredChapters.length ? filteredChapters.map((chapter, index) => {
          const theme = subjectTheme(selectedSubject);
          const progress = chapterProgress[progressKey(classFilter, selectedSubject, chapter.title)];
          const progressPercent = progress?.status === "completed" ? 100 : progress?.status === "needs_revision" ? 70 : progress?.status === "in_progress" ? 40 : 0;
          const progressText = progress?.status === "completed" ? "Done ✓" : progress?.status === "in_progress" ? "40%" : progress?.status === "needs_revision" ? "Needs revision" : "Yet to start";
          const chips = [
            { label: "Notes", count: chapter.resources.filter((resource) => ["short_notes", "chapter_lesson"].includes(resource.resource_type)).length, icon: NotebookText },
            { label: "Formulas", count: chapter.resources.filter((resource) => resource.resource_type === "formula_sheet").length, icon: Calculator },
            { label: "Revision", count: chapter.resources.filter((resource) => resource.resource_type === "quick_revision").length, icon: FileText },
            { label: "Questions", count: chapter.resources.filter((resource) => ["chapter_practice", "pyq"].includes(resource.resource_type)).length, icon: CircleHelp },
          ].filter((chip) => chip.count > 0);
          const cleanTitle = displayChapterTitle(chapter.title, chapter.chapterNumber);
          return <button key={chapter.title} type="button" onClick={() => openChapter(chapter.title)} className="study-v2-chapter-card">
            <div className="flex min-w-0 items-start gap-3">
              <span className="pt-0.5 text-sm font-black" style={{ color: theme.color }}>
                {String(chapter.chapterNumber || index + 1).padStart(2, "0")}
              </span>
              <h2 className="min-w-0 line-clamp-2 text-left text-sm font-bold leading-5 text-slate-900 dark:text-slate-100">
                {cleanTitle}
              </h2>
            </div>
            <div className="mt-3 flex min-h-6 flex-wrap gap-2">
              {chips.length ? chips.map((chip) => {
                const ChipIcon = chip.icon;
                return <span key={chip.label} className="study-v2-content-chip"><ChipIcon className="h-3.5 w-3.5" />{chip.label} {chip.count}</span>;
              }) : chapter.textbookUrl ? (
                <span className="study-v2-ncert-icon" title="NCERT chapter available"><BookOpen className="h-4 w-4" /></span>
              ) : null}
            </div>
            <div className="mt-auto flex items-center gap-3 pt-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`${cleanTitle} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, backgroundColor: theme.color }} />
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-400">{progressText}</span>
            </div>
          </button>;
        }) : <div className="study-v2-empty"><BookOpen className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No matching chapters</p><p className="mt-1 text-xs text-muted-foreground">Try another search or subject.</p></div>}
      </div> : <div className="study-v2-empty"><BookOpen className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">Class chapter list is not available yet</p><a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline" href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer">Open NCERT textbook catalogue</a></div>}

      {continueChapter && !selectedChapter && (
        <div className="sticky bottom-20 md:bottom-6 z-20 mx-4 mt-4 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Continue studying</p>
            <p className="truncate text-sm font-bold text-foreground">
              {displayChapterTitle(continueChapter.title, continueChapter.chapterNumber)}
            </p>
          </div>
          <Button
            size="sm"
            className="h-10 shrink-0 rounded-xl gradient-primary text-white font-bold"
            onClick={() => openChapter(continueChapter.title)}
          >
            Resume <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </section>}
  </div>;
}
