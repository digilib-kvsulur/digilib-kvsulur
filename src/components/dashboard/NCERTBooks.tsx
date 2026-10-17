import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Search, ExternalLink, FileText, LoaderCircle } from "lucide-react";

interface NCERTBooksProps {
  studentClass?: string | number | null;
}

interface NCERTChapter {
  class_number: string;
  subject: string;
  book_name: string;
  chapter_title: string;
  chapter_number: number;
  file_url: string | null;
}

function getClassNumber(value?: string | number | null) {
  const match = String(value ?? "").match(/\d+/);
  return match?.[0] ?? "all";
}

const NCERT_PORTAL = "https://ncert.nic.in/textbook.php";

export default function NCERTBooks({ studentClass }: NCERTBooksProps) {
  const studentClassNumber = getClassNumber(studentClass);
  const [classFilter, setClassFilter] = useState(studentClassNumber);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [chapters, setChapters] = useState<NCERTChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setClassFilter(studentClassNumber);
  }, [studentClassNumber]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);

    let query = supabase
      .from("ncert_books")
      .select("class_number, subject, book_name, chapter_title, chapter_number, file_url")
      .order("class_number")
      .order("subject")
      .order("book_name")
      .order("chapter_number");

    if (classFilter !== "all") query = query.eq("class_number", classFilter);

    query.then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setLoadError(true);
        setChapters([]);
      } else {
        setChapters((data || []) as NCERTChapter[]);
      }
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoadError(true);
      setChapters([]);
      setLoading(false);
    });

    return () => { active = false; };
  }, [classFilter]);

  const subjects = useMemo(
    () => [...new Set(chapters.map((chapter) => chapter.subject).filter(Boolean))].sort(),
    [chapters]
  );

  const collections = useMemo(() => {
    const groups = new Map<string, { classNumber: string; subject: string; title: string; chapters: NCERTChapter[] }>();
    for (const chapter of chapters) {
      const key = `${chapter.class_number}:${chapter.subject}:${chapter.book_name}`;
      const collection = groups.get(key) || {
        classNumber: chapter.class_number,
        subject: chapter.subject,
        title: chapter.book_name,
        chapters: [],
      };
      collection.chapters.push(chapter);
      groups.set(key, collection);
    }

    const term = search.trim().toLocaleLowerCase();
    return [...groups.values()]
      .filter((collection) => subjectFilter === "all" || collection.subject === subjectFilter)
      .map((collection) => ({
        ...collection,
        chapters: collection.chapters.filter((chapter) =>
          !term || `${collection.title} ${collection.subject} ${chapter.chapter_title}`.toLocaleLowerCase().includes(term)
        ),
      }))
      .filter((collection) => collection.chapters.length > 0)
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title));
  }, [chapters, search, subjectFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-5 sm:p-7">
        <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">NCERT Books</h2>
                {classFilter !== "all" && <Badge className="rounded-full">Class {classFilter}</Badge>}
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Browse official NCERT textbook collections by class and subject. Chapters open directly from NCERT.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full shrink-0 gap-2 rounded-xl bg-background/80 sm:w-auto">
            <a href={NCERT_PORTAL} target="_blank" rel="noopener noreferrer">
              All NCERT classes <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_170px_220px] sm:p-4">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search books or chapters"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Select value={classFilter} onValueChange={(value) => { setClassFilter(value); setSubjectFilter("all"); }}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All available classes</SelectItem>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((grade) => (
                <SelectItem key={grade} value={grade}>Class {grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Loading NCERT collections…
        </div>
      ) : loadError ? (
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">The saved NCERT collection could not be loaded.</p>
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <a href={NCERT_PORTAL} target="_blank" rel="noopener noreferrer">Open official NCERT textbooks <ExternalLink className="h-4 w-4" /></a>
            </Button>
          </CardContent>
        </Card>
      ) : collections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <Card key={`${collection.classNumber}:${collection.subject}:${collection.title}`} className="overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
              <Accordion type="single" collapsible>
                <AccordionItem value="chapters" className="border-0">
                  <AccordionTrigger className="items-start px-4 py-4 text-left hover:no-underline sm:px-5">
                    <div className="flex min-w-0 items-start gap-3 pr-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-bold leading-snug">{collection.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">Class {collection.classNumber}</Badge>
                          <Badge variant="outline" className="text-[10px]">{collection.subject}</Badge>
                          <span className="text-[11px] text-muted-foreground">{collection.chapters.length} chapters</span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 sm:px-5">
                    <div className="space-y-1 border-t border-border/60 pt-2">
                      {collection.chapters.map((chapter) => (
                        <div key={`${chapter.chapter_number}:${chapter.chapter_title}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm leading-snug">{chapter.chapter_title}</span>
                          </div>
                          {chapter.file_url && (
                            <a
                              href={chapter.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${chapter.chapter_title} from NCERT`}
                              className="shrink-0 rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><BookOpen className="h-6 w-6" /></div>
            <div>
              <p className="font-semibold">No saved collection for {classFilter === "all" ? "this search" : `Class ${classFilter}`} yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Use NCERT’s official textbook catalogue to browse the complete class-wise collection.</p>
            </div>
            <Button asChild variant="outline" className="gap-2 rounded-xl">
              <a href={NCERT_PORTAL} target="_blank" rel="noopener noreferrer">Browse official NCERT catalogue <ExternalLink className="h-4 w-4" /></a>
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Textbooks are provided by NCERT. This site links to the official source and does not host textbook files.
      </p>
    </div>
  );
}
