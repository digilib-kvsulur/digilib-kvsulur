import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, BookOpen, Search, FileText, Download, Loader2, ChevronRight, GraduationCap, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Material {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  student_class: string | null;
  file_url: string;
  file_name: string | null;
  created_at: string;
}

interface NcertChapter {
  title: string;
  url: string;
}

interface NcertBookData {
  name: string;
  chapters: NcertChapter[];
}

// Fallback NCERT data if DB is empty
const FALLBACK_NCERT: Record<string, Record<string, NcertBookData>> = {
  "6": {
    Mathematics: {
      name: "Mathematics – Class 6",
      chapters: [
        { title: "Chapter 1 – Knowing Our Numbers", url: "https://ncert.nic.in/textbook/pdf/femh101.pdf" },
        { title: "Chapter 2 – Whole Numbers", url: "https://ncert.nic.in/textbook/pdf/femh102.pdf" },
        { title: "Chapter 3 – Playing with Numbers", url: "https://ncert.nic.in/textbook/pdf/femh103.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 6",
      chapters: [
        { title: "Chapter 1 – Food: Where Does It Come From?", url: "https://ncert.nic.in/textbook/pdf/fesc101.pdf" },
        { title: "Chapter 2 – Components of Food", url: "https://ncert.nic.in/textbook/pdf/fesc102.pdf" },
      ],
    },
  },
  "10": {
    Mathematics: {
      name: "Mathematics – Class 10",
      chapters: [
        { title: "Chapter 1 – Real Numbers", url: "https://ncert.nic.in/textbook/pdf/jemh101.pdf" },
        { title: "Chapter 2 – Polynomials", url: "https://ncert.nic.in/textbook/pdf/jemh102.pdf" },
      ],
    },
    Science: {
      name: "Science – Class 10",
      chapters: [
        { title: "Chapter 1 – Chemical Reactions and Equations", url: "https://ncert.nic.in/textbook/pdf/jesc101.pdf" },
        { title: "Chapter 2 – Acids, Bases and Salts", url: "https://ncert.nic.in/textbook/pdf/jesc102.pdf" },
      ],
    },
  },
};

const getBaseClass = (cls?: string) => {
  if (!cls) return "";
  const num = cls.replace(/[^0-9]/g, "");
  return num;
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "bg-blue-100 text-blue-700",
  Science: "bg-green-100 text-green-700",
  Physics: "bg-purple-100 text-purple-700",
  Chemistry: "bg-orange-100 text-orange-700",
  Biology: "bg-emerald-100 text-emerald-700",
  English: "bg-pink-100 text-pink-700",
  "Social Science": "bg-yellow-100 text-yellow-700",
  "CBSE Curriculum": "bg-indigo-100 text-indigo-700",
  General: "bg-slate-100 text-slate-700",
};

const StudyMaterials = ({ studentClass }: { studentClass?: string }) => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dbNcert, setDbNcert] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterSubject, setFilterSubject] = useState("all");
  const [ncertBook, setNcertBook] = useState<{ name: string; chapters: { title: string; url: string }[] } | null>(null);
  const [cbseBook, setCbseBook] = useState<{ name: string; chapters: { title: string; url: string }[] } | null>(null);
  const [viewMaterial, setViewMaterial] = useState<{title: string, url: string, id?: string | null} | null>(null);
  const [readSeconds, setReadSeconds] = useState(0);
  const [readAward, setReadAward] = useState<number | null>(null);
  const [dbCbse, setDbCbse] = useState<any[]>([]);

  // Reading timer — awards XP for time spent studying a material
  useEffect(() => {
    if (!viewMaterial) return;
    setReadSeconds(0);
    setReadAward(null);
    const t = window.setInterval(() => setReadSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [viewMaterial]);

  const closeViewer = async () => {
    const secs = readSeconds;
    const mat = viewMaterial;
    setViewMaterial(null);
    if (!mat || secs < 60) return;
    const { data, error } = await supabase.rpc("award_material_reading", {
      p_material_id: mat.id ?? null,
      p_material_title: mat.title,
      p_seconds: secs,
    });
    if (error) return;
    const pts = Number(data) || 0;
    toast({
      title: pts > 0 ? `+${pts} XP for reading!` : "Reading time logged",
      description: `You studied "${mat.title}" for ${Math.floor(secs / 60)} min.`,
    });
  };


  const baseClass = getBaseClass(studentClass);

  useEffect(() => {
    (async () => {
      // 1. Fetch teacher materials
      const { data: mats } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
      const allMats = (mats as Material[]) || [];
      const filteredMats = studentClass
        ? allMats.filter(m => !m.student_class || m.student_class === "All" || m.student_class === studentClass || m.student_class === baseClass)
        : allMats;
      setMaterials(filteredMats);

      // 2. Fetch NCERT books from Database
      try {
        const { data: ncert } = await supabase.from("ncert_books").select("*").eq("class_number", baseClass).order("chapter_number", { ascending: true });
        setDbNcert(ncert || []);
      } catch (e) {
        console.error("Error fetching ncert books:", e);
      }

      // 3. Fetch CBSE Curriculum from Database
      try {
        const { data: cbse } = await supabase.from("cbse_curriculum").select("*").order("chapter_number", { ascending: true });
        setDbCbse(cbse || []);
      } catch (e) {
        console.error("Error fetching cbse curriculum:", e);
      }

      setLoading(false);
    })();
  }, [studentClass, baseClass]);

  // Group NCERT books by subject (merge static fallback and database rows)
  const ncertForClass: Record<string, NcertBookData> = {};

  // Add DB items
  dbNcert.forEach((row) => {
    const sub = row.subject.replace(/(_Part\d| Part \d)/gi, "").trim();
    if (!ncertForClass[sub]) {
      ncertForClass[sub] = { name: `${sub} (Complete)`, chapters: [] };
    }
    const title = row.chapter_title?.trim() || `Chapter ${row.chapter_number || ncertForClass[sub].chapters.length + 1}`;
    if (!ncertForClass[sub].chapters.some(chapter => chapter.url === row.file_url || chapter.title.trim().toLowerCase() === title.toLowerCase())) {
      ncertForClass[sub].chapters.push({ title, url: row.file_url });
    }
  });

  // If no DB entries found, fall back to hardcoded data
  if (Object.keys(ncertForClass).length === 0 && FALLBACK_NCERT[baseClass]) {
    Object.entries(FALLBACK_NCERT[baseClass]).forEach(([sub, data]) => {
      ncertForClass[sub] = data;
    });
  }

  const hasNcert = Object.keys(ncertForClass).length > 0;

  // Separate regular Reference Materials vs CBSE Curriculum uploads
  const referenceMaterials = materials.filter(m => m.subject !== "CBSE Curriculum");
  const cbseUploads = materials.filter(m => m.subject === "CBSE Curriculum" && (!m.student_class || m.student_class === "All" || m.student_class === baseClass));

  const subjects = ["all", ...Array.from(new Set(referenceMaterials.map(m => m.subject || "General").filter(Boolean)))];

  let visibleReference = referenceMaterials.filter(m =>
    (!search.trim() || m.title.toLowerCase().includes(search.toLowerCase()) || (m.subject || "").toLowerCase().includes(search.toLowerCase())) &&
    (filterSubject === "all" || (m.subject || "General") === filterSubject)
  );

  if (sortBy === "newest") visibleReference = [...visibleReference].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  else if (sortBy === "oldest") visibleReference = [...visibleReference].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  else if (sortBy === "az") visibleReference = [...visibleReference].sort((a, b) => a.title.localeCompare(b.title));
  else if (sortBy === "subject") visibleReference = [...visibleReference].sort((a, b) => (a.subject || "").localeCompare(b.subject || ""));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Study Materials
        </h2>
        <p className="text-sm text-muted-foreground">Reference materials, CBSE curriculums, and NCERT textbooks.</p>
      </div>

      <Tabs defaultValue="materials">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="materials">Reference Materials</TabsTrigger>
          {hasNcert && <TabsTrigger value="ncert">NCERT Books (Class {baseClass})</TabsTrigger>}
          <TabsTrigger value="cbse">CBSE Curriculum</TabsTrigger>
        </TabsList>

        {/* Reference Materials Tab */}
        <TabsContent value="materials" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or subject..." className="pl-9" />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Subjects" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="az">A → Z</SelectItem>
                <SelectItem value="subject">By Subject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : visibleReference.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              {search || filterSubject !== "all" ? "No matches. Try adjusting filters." : "No reference materials available yet."}
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleReference.map(m => (
                <Card key={m.id} className="hover-lift border-border/60 group">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-1 text-sm">{m.title}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {m.subject && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SUBJECT_COLORS[m.subject] || SUBJECT_COLORS.General}`}>
                            {m.subject}
                          </span>
                        )}
                        {m.student_class && m.student_class !== "All" && (
                          <span className="text-[10px] font-medium text-muted-foreground">Class {m.student_class}</span>
                        )}
                      </div>
                      {m.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.description}</p>}
                      <div className="mt-3">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-3" onClick={() => setViewMaterial({ title: m.title, url: m.file_url, id: m.id })}>
                          <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Open
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* NCERT Books Tab */}
        {hasNcert && (
          <TabsContent value="ncert" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Tap any subject to choose and download a specific chapter.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(ncertForClass).map(([subject, bookData]) => (
                <Card
                  key={subject}
                  className="hover-lift cursor-pointer group border-border/60 hover:border-primary/40 hover:shadow-md transition-all"
                  onClick={() => setNcertBook(bookData)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-lg ${SUBJECT_COLORS[subject] || SUBJECT_COLORS.General}`}>
                      {subject[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{subject}</p>
                      <p className="text-xs text-muted-foreground">{bookData.chapters.length} chapters</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* CBSE Curriculum Tab */}
        <TabsContent value="cbse" className="mt-4 space-y-6">
          {/* DB + Official Card Grid */}
          {(() => {
            // Build CBSE curriculum cards from DB rows (grouped by subject) + static official links
            const cbseGroups: Record<string, { name: string; chapters: { title: string; url: string }[] }> = {};

            // Filter DB rows by class
            const filteredCbse = dbCbse.filter(row => !row.class_number || row.class_number === "All" || row.class_number === baseClass);

            filteredCbse.forEach((row) => {
              const sub = row.subject || row.category || "CBSE Resource";
              if (!cbseGroups[sub]) cbseGroups[sub] = { name: sub, chapters: [] };
              cbseGroups[sub].chapters.push({ title: row.chapter_title || row.title, url: row.file_url });
            });

            // Merge cbseUploads (teacher uploads subject=CBSE Curriculum, class is already filtered above)
            cbseUploads.forEach((m) => {
              const sub = m.title || "Teacher Upload";
              if (!cbseGroups[sub]) cbseGroups[sub] = { name: sub, chapters: [] };
              cbseGroups[sub].chapters.push({ title: m.description || m.title, url: m.file_url });
            });

            // Always include static official links as cards
            const allCards = [...Object.values(cbseGroups)];

            return (
              <>
                <p className="text-sm text-muted-foreground">Tap any resource to view or open a specific link or chapter.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCards.map((card, idx) => (
                    <Card
                      key={idx}
                      className="hover-lift cursor-pointer group border-border/60 hover:border-indigo-400/60 hover:shadow-md transition-all"
                      onClick={() => setCbseBook(card)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-black text-lg">
                          {card.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground group-hover:text-indigo-600 transition-colors line-clamp-1">{card.name}</p>
                          <p className="text-xs text-muted-foreground">{card.chapters.length} {card.chapters.length === 1 ? "link" : "items"}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 transition-colors shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Chapter picker popup for NCERT */}
      <Dialog open={!!ncertBook} onOpenChange={() => setNcertBook(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              {ncertBook?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {ncertBook?.chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => {
                  if (ch.url.includes("ncert.nic.in")) window.open(ch.url, "_blank");
                  else setViewMaterial({ title: `${ncertBook.name} - ${ch.title}`, url: ch.url });
                }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors group border border-transparent hover:border-border/60 text-left w-full"
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">{ch.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chapter/Link picker popup for CBSE */}
      <Dialog open={!!cbseBook} onOpenChange={() => setCbseBook(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              {cbseBook?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {cbseBook?.chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => {
                  if (ch.url.includes("ncert.nic.in") || ch.url.includes("cbseacademic.nic.in")) window.open(ch.url, "_blank");
                  else setViewMaterial({ title: `${cbseBook.name} - ${ch.title}`, url: ch.url });
                }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50/60 transition-colors group border border-transparent hover:border-indigo-200 text-left w-full"
              >
                <span className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground group-hover:text-indigo-600 transition-colors">{ch.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-600 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Material Viewer Popup */}
      <Dialog open={!!viewMaterial} onOpenChange={(o) => { if (!o) void closeViewer(); }}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex items-start gap-2 text-base font-bold text-foreground">
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="leading-snug text-left">{viewMaterial?.title}</span>
              </DialogTitle>
              {viewMaterial?.url?.toLowerCase().includes('.pdf') && (
                <Button asChild variant="outline" size="sm" className="h-8 shrink-0">
                  <a href={viewMaterial.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5 sm:mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted/10 w-full h-full relative">
            {viewMaterial && (
              <iframe
                src={viewMaterial.url}
                className="w-full h-full border-0 absolute inset-0"
                title={viewMaterial.title}
                allow="autoplay"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyMaterials;
