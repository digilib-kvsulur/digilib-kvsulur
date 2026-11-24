import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ArrowLeft, BookMarked, Bookmark, BookmarkCheck, BookOpen, ExternalLink, FileText, Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { openStudyMaterial } from "@/lib/studyMaterialAccess";

type Resource = { id: string; title: string; description: string | null; subject: string | null; student_class: string | null; chapter_title: string | null; resource_type: string; academic_session: string; exam_year: number | null; marks: number | null; source_label: string | null; source_url: string | null; markdown_content: string | null; file_url: string; file_type: string | null };
type NcertChapter = { id: string; subject: string; book_name: string; chapter_number: number | null; chapter_title: string; file_url: string };
type Chapter = { title: string; chapterNumber?: number | null; textbookUrl?: string; bookName?: string; resources: Resource[] };
const KIND: Record<string, string> = { short_notes: "Short Notes", formula_sheet: "Formula Sheet", pyq: "PYQ", quick_revision: "Quick Revision", textbook: "Textbook / Syllabus", other: "Other" };

const normalizeSubject = (subject: string) => subject.replace(/(_Part\d| Part \d)/gi, "").replace(/_/g, " ").trim();
const normalizeChapter = (title: string) => title.replace(/^(chapter|unit|lesson)\s*\d+\s*[-–:.)]?\s*/i, "").trim().toLocaleLowerCase();

export default function StudyResources({ studentClass, userId, onOpenDoubt }: { studentClass?: string | number | null; userId?: string; onOpenDoubt?: () => void }) {
  const parsedClass = Number(String(studentClass ?? "").match(/\d+/)?.[0] || 6);
  const ownClass = String(Math.min(12, Math.max(6, parsedClass)));
  const [classFilter, setClassFilter] = useState(ownClass);
  const [resources, setResources] = useState<Resource[]>([]);
  const [ncertChapters, setNcertChapters] = useState<NcertChapter[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [resourceType, setResourceType] = useState("all");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
        const { data: saved } = await (supabase as any).from("study_resource_bookmarks").select("resource_id").eq("user_id", userId);
        if (alive) setBookmarks(new Set((saved || []).map((row: any) => row.resource_id)));
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [classFilter, userId, reloadKey]);

  const subjects = useMemo(() => Array.from(new Set([
    ...ncertChapters.map((chapter) => normalizeSubject(chapter.subject)),
    ...resources.map((resource) => resource.subject ? normalizeSubject(resource.subject) : "General"),
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b)), [ncertChapters, resources]);

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

  const activeChapter = chapters.find((item) => item.title === selectedChapter);
  const visibleResources = (activeChapter?.resources || []).filter((resource) => {
    if (bookmarkedOnly && !bookmarks.has(resource.id)) return false;
    if (resourceType !== "all" && resource.resource_type !== resourceType) return false;
    const searchable = `${resource.title} ${resource.description || ""} ${resource.chapter_title || ""} ${resource.source_label || ""}`.toLowerCase();
    return !query.trim() || searchable.includes(query.toLowerCase());
  });

  const toggleBookmark = async (id: string) => {
    if (!userId) return;
    const saved = bookmarks.has(id);
    setBookmarks((current) => { const next = new Set(current); saved ? next.delete(id) : next.add(id); return next; });
    const result = saved
      ? await (supabase as any).from("study_resource_bookmarks").delete().eq("user_id", userId).eq("resource_id", id)
      : await (supabase as any).from("study_resource_bookmarks").insert({ user_id: userId, resource_id: id });
    if (result.error) setBookmarks((current) => { const next = new Set(current); saved ? next.add(id) : next.delete(id); return next; });
  };

  const resetNavigation = () => { setSelectedChapter(""); setQuery(""); setResourceType("all"); setBookmarkedOnly(false); };
  const openResourceFile = async (url: string) => { try { await openStudyMaterial(url); } catch { /* RLS may have changed since the list loaded. */ } };

  return <div className="mx-auto w-full max-w-6xl space-y-5">
    <header className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-violet-600 p-5 text-white shadow-lg sm:p-7">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-100"><BookMarked className="h-4 w-4" /> STUDY</div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="mt-2 text-2xl font-black sm:text-3xl">Choose a subject. Learn one chapter at a time.</h1><p className="mt-2 max-w-2xl text-sm text-blue-50">Open the NCERT chapter, then find class resources such as notes, formulas, revision sheets, and PYQs together.</p></div>{onOpenDoubt && <Button variant="secondary" className="min-h-11 shrink-0 gap-2" onClick={onOpenDoubt}><Sparkles className="h-4 w-4" /> Ask a doubt</Button>}</div>
    </header>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Select value={classFilter} onValueChange={setClassFilter}><SelectTrigger className="w-full sm:w-48" aria-label="Select class"><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{Array.from({ length: 7 }, (_, i) => String(i + 6)).map((c) => <SelectItem key={c} value={c}>Class {c}{c === ownClass ? " · My class" : ""}</SelectItem>)}</SelectContent></Select>
      <a href="https://cbseacademic.nic.in/curriculum_2027.html" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"><ExternalLink className="h-4 w-4" /> Official CBSE curriculum 2026–27</a>
    </div>

    {selectedSubject && <nav aria-label="Study navigation" className="flex flex-wrap items-center gap-2 text-sm">
      <Button variant="ghost" size="sm" onClick={() => { resetNavigation(); setSelectedSubject(""); }}><ArrowLeft className="mr-1 h-4 w-4" /> Subjects</Button>
      <span aria-hidden="true" className="text-muted-foreground">/</span>
      <Button variant={selectedChapter ? "ghost" : "secondary"} size="sm" onClick={() => resetNavigation()}>{selectedSubject}</Button>
      {selectedChapter && <><span aria-hidden="true" className="text-muted-foreground">/</span><span className="max-w-[65vw] truncate font-semibold" aria-current="page">{selectedChapter}</span></>}
    </nav>}

    {loading ? <p role="status" className="py-10 text-center text-sm text-muted-foreground">Loading Class {classFilter} subjects and chapters…</p> : loadError ? <Card><CardContent className="py-10 text-center"><p role="alert" className="text-sm text-destructive">{loadError}</p><Button className="mt-3" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button></CardContent></Card> : !selectedSubject ? <section aria-label="Subjects" className="space-y-3"><div><h2 className="text-lg font-bold">Class {classFilter} subjects</h2><p className="text-sm text-muted-foreground">Choose a subject to see its NCERT chapters and study materials.</p></div>{subjects.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjects.map((item) => {
      const chapterCount = ncertChapters.filter((chapter) => normalizeSubject(chapter.subject).toLowerCase() === item.toLowerCase()).length;
      const materialCount = resources.filter((resource) => normalizeSubject(resource.subject || "General").toLowerCase() === item.toLowerCase()).length;
      return <button key={item} type="button" onClick={() => setSelectedSubject(item)} className="group min-h-28 rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item}</h3><p className="mt-1 text-sm text-muted-foreground">{chapterCount ? `${chapterCount} NCERT chapters` : "Study resources"}</p></div><BookOpen className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" /></div><p className="mt-3 text-xs text-muted-foreground">{materialCount ? `${materialCount} DLMS resource${materialCount === 1 ? "" : "s"} available` : "Chapter materials will appear here"}</p></button>;
    })}</div> : <Card><CardContent className="py-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" /><h3 className="mt-3 font-semibold">Class chapter list is not available yet</h3><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">DLMS has not loaded NCERT chapter links or teacher resources for this class. Ask a teacher or librarian to import the class NCERT chapter index and add reviewed notes.</p><a className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer">Open NCERT textbook catalogue <ExternalLink className="h-4 w-4" /></a></CardContent></Card>}</section> : !selectedChapter ? <section aria-label={`${selectedSubject} chapters`} className="space-y-3"><div><h2 className="text-lg font-bold">{selectedSubject} chapters</h2><p className="text-sm text-muted-foreground">Select a chapter to open the NCERT text and matching DLMS materials.</p></div>{chapters.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{chapters.map((item) => <button key={item.title} type="button" onClick={() => setSelectedChapter(item.title)} className="flex min-h-24 items-center justify-between gap-4 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.chapterNumber ? `Chapter ${item.chapterNumber}` : item.bookName || "Topic"}</p><h3 className="mt-1 font-bold leading-snug">{item.title}</h3><p className="mt-2 text-xs text-muted-foreground">{item.resources.length ? `${item.resources.length} study resource${item.resources.length === 1 ? "" : "s"}` : "NCERT textbook available"}</p></div><BookOpen className="h-5 w-5 shrink-0 text-primary" /></button>)}</div> : <Card><CardContent className="py-10 text-center"><p className="font-semibold">No chapters found for {selectedSubject} yet</p><p className="mt-1 text-sm text-muted-foreground">The chapter index can be imported from the official NCERT catalogue.</p></CardContent></Card>}</section> : <section aria-label={`${selectedChapter} materials`} className="space-y-4">
      <div><h2 className="text-xl font-bold">{selectedChapter}</h2><p className="mt-1 text-sm text-muted-foreground">Class {classFilter} · {selectedSubject} · {activeChapter?.bookName || "Chapter resources"}</p></div>
      {activeChapter?.textbookUrl ? <Card className="border-primary/30 bg-primary/5"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 className="font-semibold">NCERT textbook chapter</h3><p className="text-sm text-muted-foreground">Open the official chapter PDF. The book remains hosted by NCERT.</p></div></div><Button asChild className="min-h-11"><a href={activeChapter.textbookUrl} target="_blank" rel="noreferrer">Open NCERT chapter <ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent></Card> : <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">NCERT chapter link not added</h3><p className="text-sm text-muted-foreground">Open the official catalogue and choose Class {classFilter} · {selectedSubject}.</p></div><Button variant="outline" asChild><a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer">NCERT catalogue <ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent></Card>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px_220px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="min-h-11 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this chapter" aria-label="Search chapter resources" /></div><Select value={resourceType} onValueChange={setResourceType}><SelectTrigger className="min-h-11" aria-label="Filter by resource type"><SelectValue placeholder="All resource types" /></SelectTrigger><SelectContent><SelectItem value="all">All resource types</SelectItem>{Object.entries(KIND).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button type="button" className="min-h-11 gap-2" variant={bookmarkedOnly ? "default" : "outline"} onClick={() => setBookmarkedOnly((current) => !current)}><Bookmark className="h-4 w-4" />{bookmarkedOnly ? "Bookmarks only" : "My bookmarks"}</Button></div>
      {visibleResources.length ? <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{visibleResources.map((resource) => <Card key={resource.id} className="flex min-w-0 flex-col border-border/70"><CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{KIND[resource.resource_type] || "Resource"}</Badge><Badge variant="outline">{resource.academic_session}</Badge>{resource.exam_year && <Badge variant="outline">{resource.exam_year}</Badge>}{resource.marks && <Badge variant="outline">{resource.marks} marks</Badge>}</div><h3 className="mt-2 font-bold leading-snug">{resource.title}</h3></div><button type="button" onClick={() => toggleBookmark(resource.id)} aria-label={bookmarks.has(resource.id) ? "Remove bookmark" : "Bookmark resource"} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{bookmarks.has(resource.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}</button></div>
        <p className="text-xs font-medium text-muted-foreground">{[resource.source_label, resource.exam_year && `Year ${resource.exam_year}`, resource.marks && `${resource.marks} marks`].filter(Boolean).join(" · ") || "DLMS learning material"}</p>{resource.description && <p className="text-sm text-muted-foreground">{resource.description}</p>}
        {resource.markdown_content && <details className="rounded-xl border bg-muted/30 p-3"><summary className="cursor-pointer text-sm font-semibold">Read resource</summary><div className="prose prose-sm mt-3 max-w-none dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{resource.markdown_content}</ReactMarkdown></div></details>}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">{resource.file_url && <Button size="sm" onClick={() => openResourceFile(resource.file_url)}>Open resource <ExternalLink className="ml-1 h-3.5 w-3.5" /></Button>}{resource.source_url && <a className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-primary hover:underline" href={resource.source_url} target="_blank" rel="noreferrer">Source <ExternalLink className="h-3.5 w-3.5" /></a>}</div>
      </CardContent></Card>)}</div> : <Card><CardContent className="py-10 text-center"><FileText className="mx-auto h-8 w-8 text-muted-foreground/60" /><h3 className="mt-3 font-semibold">{bookmarkedOnly ? "No bookmarked materials in this chapter" : "No DLMS notes or practice yet"}</h3><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{activeChapter?.textbookUrl ? "You can study the NCERT chapter above now. Teacher-reviewed notes, formulas, quick revision and PYQs will appear here when staff add them." : "Teachers can add reviewed notes, formula sheets, quick revision and sourced PYQs for this chapter."}</p></CardContent></Card>}
    </section>}
  </div>;
}
