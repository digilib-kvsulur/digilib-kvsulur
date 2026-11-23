import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { BookMarked, Bookmark, BookmarkCheck, ExternalLink, FileText, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Resource = { id: string; title: string; description: string | null; subject: string | null; student_class: string | null; chapter_title: string | null; resource_type: string; academic_session: string; exam_year: number | null; marks: number | null; source_label: string | null; source_url: string | null; markdown_content: string | null; file_url: string; file_type: string | null };
const KIND: Record<string, string> = { short_notes: "Short Notes", formula_sheet: "Formula Sheet", pyq: "PYQ", quick_revision: "Quick Revision", textbook: "Textbook / Syllabus", other: "Other" };

export default function StudyResources({ studentClass, userId }: { studentClass?: string | number | null; userId?: string }) {
  const parsedClass = Number(String(studentClass ?? "").match(/\d+/)?.[0] || 6);
  const ownClass = String(Math.min(12, Math.max(6, parsedClass)));
  const [classFilter, setClassFilter] = useState(ownClass);
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [chapter, setChapter] = useState("all");
  const [kind, setKind] = useState("all");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setClassFilter(ownClass); }, [ownClass]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any).from("study_materials").select("id,title,description,subject,student_class,chapter_title,resource_type,academic_session,exam_year,marks,source_label,source_url,markdown_content,file_url,file_type").in("student_class", [classFilter, "All"]).order("subject").order("chapter_title");
      if (!alive) return;
      setResources(error ? [] : (data || []));
      if (userId) {
        const { data: saved } = await (supabase as any).from("study_resource_bookmarks").select("resource_id").eq("user_id", userId);
        if (alive) setBookmarks(new Set((saved || []).map((row: any) => row.resource_id)));
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [classFilter, userId]);

  const subjects = useMemo(() => Array.from(new Set(resources.map((r) => r.subject).filter(Boolean))) as string[], [resources]);
  const chapters = useMemo(() => Array.from(new Set(resources.filter((r) => subject === "all" || r.subject === subject).map((r) => r.chapter_title).filter(Boolean))) as string[], [resources, subject]);
  const filtered = useMemo(() => resources.filter((r) => {
    if (bookmarkedOnly && !bookmarks.has(r.id)) return false;
    if (subject !== "all" && r.subject !== subject) return false;
    if (chapter !== "all" && r.chapter_title !== chapter) return false;
    if (kind !== "all" && r.resource_type !== kind) return false;
    const text = `${r.title} ${r.description || ""} ${r.chapter_title || ""} ${r.source_label || ""}`.toLowerCase();
    return !query.trim() || text.includes(query.toLowerCase());
  }), [resources, subject, chapter, kind, query, bookmarkedOnly, bookmarks]);

  const toggleBookmark = async (id: string) => {
    if (!userId) return;
    const saved = bookmarks.has(id);
    setBookmarks((current) => { const next = new Set(current); saved ? next.delete(id) : next.add(id); return next; });
    const result = saved
      ? await (supabase as any).from("study_resource_bookmarks").delete().eq("user_id", userId).eq("resource_id", id)
      : await (supabase as any).from("study_resource_bookmarks").insert({ user_id: userId, resource_id: id });
    if (result.error) setBookmarks((current) => { const next = new Set(current); saved ? next.add(id) : next.delete(id); return next; });
  };

  return <div className="mx-auto w-full max-w-6xl space-y-5">
    <header className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-violet-600 p-5 text-white shadow-lg sm:p-7">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-100"><BookMarked className="h-4 w-4" /> STUDY RESOURCES</div>
      <h1 className="mt-2 text-2xl font-black sm:text-3xl">Your class, your chapters, one study shelf</h1>
      <p className="mt-2 max-w-2xl text-sm text-blue-50">Find notes, formula sheets, quick revision and sourced previous-year questions. Staff add and review resources for each class.</p>
    </header>
    <section aria-label="Official curriculum sources" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[
        { title: "NCERT official textbooks", detail: "Open current class and chapter PDFs from NCERT", url: "https://ncert.nic.in/textbook.php" },
        { title: "CBSE Curriculum 2026–27", detail: "Official curriculum and subject syllabus pages", url: "https://cbseacademic.nic.in/curriculum_2027.html" },
        ...(classFilter === "10" ? [{ title: "Class 10 SQP & marking schemes", detail: "CBSE sample papers for 2026–27", url: "https://cbseacademic.nic.in/sqp_classx_2026-27.html" }] : []),
        ...(classFilter === "12" ? [{ title: "Class 12 SQP & marking schemes", detail: "CBSE sample papers for 2026–27", url: "https://cbseacademic.nic.in/SQP_CLASSXii_2026-27.html" }] : []),
        { title: "ePathshala", detail: "NCERT digital textbooks and linked learning resources", url: "https://epathshala.nic.in/" },
      ].map((source) => <a key={source.title} href={source.url} target="_blank" rel="noreferrer" className="rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="text-sm font-semibold">{source.title}</p><p className="mt-1 text-xs text-muted-foreground">{source.detail}</p></a>)}
    </section>
    <section aria-label="Filter study resources" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSubject("all"); setChapter("all"); }}><SelectTrigger aria-label="Class"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{Array.from({ length: 7 }, (_, i) => String(i + 6)).map((c) => <SelectItem key={c} value={c}>Class {c}{c === ownClass ? " · My class" : ""}</SelectItem>)}</SelectContent></Select>
      <Select value={subject} onValueChange={(v) => { setSubject(v); setChapter("all"); }}><SelectTrigger aria-label="Subject"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All subjects</SelectItem>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      <Select value={chapter} onValueChange={setChapter}><SelectTrigger aria-label="Chapter"><SelectValue placeholder="Chapter" /></SelectTrigger><SelectContent><SelectItem value="all">All chapters</SelectItem>{chapters.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
      <Select value={kind} onValueChange={setKind}><SelectTrigger aria-label="Resource type"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All resource types</SelectItem>{Object.entries(KIND).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources" aria-label="Search resources" /></div>
    </section>
    <div className="flex justify-end"><Button type="button" size="sm" variant={bookmarkedOnly ? "default" : "outline"} className="gap-2" onClick={() => setBookmarkedOnly((current) => !current)}><Bookmark className="h-4 w-4" />{bookmarkedOnly ? "Showing bookmarks" : "Show bookmarks"}</Button></div>
    {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading Class {classFilter} resources…</p> : filtered.length === 0 ? <Card><CardContent className="py-12 text-center"><FileText className="mx-auto h-8 w-8 text-muted-foreground/60" /><h2 className="mt-3 font-semibold">No matching resources yet</h2><p className="mt-1 text-sm text-muted-foreground">Try another subject or search. Staff can add reviewed resources from the Study Materials Hub.</p></CardContent></Card> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((r) => <Card key={r.id} className="flex min-w-0 flex-col border-border/70"><CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Badge variant="secondary">{KIND[r.resource_type] || "Resource"}</Badge><Badge variant="outline">Class {r.student_class === "All" ? classFilter : r.student_class}</Badge></div><h2 className="mt-2 font-bold leading-snug">{r.title}</h2></div><button type="button" onClick={() => toggleBookmark(r.id)} aria-label={bookmarks.has(r.id) ? "Remove bookmark" : "Bookmark resource"} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{bookmarks.has(r.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}</button></div>
        <p className="text-xs font-medium text-muted-foreground">{[r.subject, r.chapter_title, r.academic_session, r.exam_year && `Year ${r.exam_year}`, r.marks && `${r.marks} marks`].filter(Boolean).join(" · ")}</p><p className="line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
        {r.markdown_content && <details className="rounded-xl border bg-muted/30 p-3"><summary className="cursor-pointer text-sm font-semibold">Read resource</summary><div className="prose prose-sm mt-3 max-w-none dark:prose-invert"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{r.markdown_content}</ReactMarkdown></div></details>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="min-w-0 truncate text-xs text-muted-foreground">{r.source_label || "DLMS resource"}</span>{r.file_url && <Button size="sm" asChild><a href={r.file_url} target="_blank" rel="noreferrer">Open <ExternalLink className="ml-1 h-3.5 w-3.5" /></a></Button>}{r.source_url && <a className="text-xs font-medium text-primary hover:underline" href={r.source_url} target="_blank" rel="noreferrer">Source</a>}</div>
      </CardContent></Card>)}</div>}
  </div>;
}
