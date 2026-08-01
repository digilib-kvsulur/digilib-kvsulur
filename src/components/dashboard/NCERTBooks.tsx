import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, BookOpen, Search, FileText } from "lucide-react";

// NCERT books — direct links to official NCERT PDFs (ncert.nic.in)
const NCERT_BOOKS: { class: string; subject: string; title: string; url: string }[] = [
  // Class 6
  { class: "6", subject: "English", title: "Honeysuckle", url: "https://ncert.nic.in/textbook.php?fehn1=0-10" },
  { class: "6", subject: "English", title: "A Pact with the Sun", url: "https://ncert.nic.in/textbook.php?fehp1=0-10" },
  { class: "6", subject: "Mathematics", title: "Mathematics", url: "https://ncert.nic.in/textbook.php?femh1=0-14" },
  { class: "6", subject: "Science", title: "Science", url: "https://ncert.nic.in/textbook.php?fesc1=0-16" },
  { class: "6", subject: "Social Science", title: "History — Our Pasts I", url: "https://ncert.nic.in/textbook.php?fess1=0-10" },
  { class: "6", subject: "Social Science", title: "Geography — The Earth Our Habitat", url: "https://ncert.nic.in/textbook.php?fess2=0-8" },
  { class: "6", subject: "Social Science", title: "Civics — Social and Political Life I", url: "https://ncert.nic.in/textbook.php?fess3=0-9" },
  // Class 7
  { class: "7", subject: "English", title: "Honeycomb", url: "https://ncert.nic.in/textbook.php?gehn1=0-10" },
  { class: "7", subject: "Mathematics", title: "Mathematics", url: "https://ncert.nic.in/textbook.php?gemh1=0-15" },
  { class: "7", subject: "Science", title: "Science", url: "https://ncert.nic.in/textbook.php?gesc1=0-18" },
  // Class 8
  { class: "8", subject: "English", title: "Honeydew", url: "https://ncert.nic.in/textbook.php?hehd1=0-10" },
  { class: "8", subject: "Mathematics", title: "Mathematics", url: "https://ncert.nic.in/textbook.php?hemh1=0-16" },
  { class: "8", subject: "Science", title: "Science", url: "https://ncert.nic.in/textbook.php?hesc1=0-18" },
  // Class 9
  { class: "9", subject: "English", title: "Beehive", url: "https://ncert.nic.in/textbook.php?iebe1=0-11" },
  { class: "9", subject: "Mathematics", title: "Mathematics", url: "https://ncert.nic.in/textbook.php?iemh1=0-15" },
  { class: "9", subject: "Science", title: "Science", url: "https://ncert.nic.in/textbook.php?iesc1=0-15" },
  // Class 10
  { class: "10", subject: "English", title: "First Flight", url: "https://ncert.nic.in/textbook.php?jeff1=0-11" },
  { class: "10", subject: "Mathematics", title: "Mathematics", url: "https://ncert.nic.in/textbook.php?jemh1=0-15" },
  { class: "10", subject: "Science", title: "Science", url: "https://ncert.nic.in/textbook.php?jesc1=0-16" },
  // Class 11
  { class: "11", subject: "Physics", title: "Physics Part I", url: "https://ncert.nic.in/textbook.php?keph1=0-8" },
  { class: "11", subject: "Chemistry", title: "Chemistry Part I", url: "https://ncert.nic.in/textbook.php?kech1=0-7" },
  { class: "11", subject: "Biology", title: "Biology", url: "https://ncert.nic.in/textbook.php?kebo1=0-22" },
  { class: "11", subject: "Mathematics", title: "Mathematics", url: "https://ncert.nic.in/textbook.php?kemh1=0-16" },
  // Class 12
  { class: "12", subject: "Physics", title: "Physics Part I", url: "https://ncert.nic.in/textbook.php?leph1=0-8" },
  { class: "12", subject: "Chemistry", title: "Chemistry Part I", url: "https://ncert.nic.in/textbook.php?lech1=0-9" },
  { class: "12", subject: "Biology", title: "Biology", url: "https://ncert.nic.in/textbook.php?lebo1=0-16" },
  { class: "12", subject: "Mathematics", title: "Mathematics Part I", url: "https://ncert.nic.in/textbook.php?lemh1=0-13" },
];

const NCERTBooks = () => {
  const [classFilter, setClassFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMaterial, setViewMaterial] = useState<{title: string, url: string} | null>(null);

  const subjects = Array.from(new Set(NCERT_BOOKS.map((b) => b.subject)));
  const classes = Array.from(new Set(NCERT_BOOKS.map((b) => b.class))).sort((a, b) => +a - +b);

  const filtered = NCERT_BOOKS.filter((b) =>
    (classFilter === "all" || b.class === classFilter) &&
    (subjectFilter === "all" || b.subject === subjectFilter) &&
    (search === "" || b.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> NCERT Books</h2>
        <p className="text-sm text-muted-foreground">Latest NCERT textbooks — direct from ncert.nic.in</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search book..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((b, i) => (
          <Card key={i} className="border-border/50 hover-lift">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{b.title}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px]">Class {b.class}</Badge>
                    <Badge variant="outline" className="text-[10px]">{b.subject}</Badge>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => setViewMaterial({ title: b.title, url: b.url })}>
                <BookOpen className="h-3.5 w-3.5 mr-2" /> Open Book
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-8">No books match your filter.</p>}
      </div>
    </div>
      
      {/* Material Viewer Popup */}
      <Dialog open={!!viewMaterial} onOpenChange={() => setViewMaterial(null)}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground line-clamp-1">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                {viewMaterial?.title}
              </DialogTitle>
              <Button asChild variant="outline" size="sm" className="h-8 hidden sm:flex">
                <a href={viewMaterial?.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open in New Tab
                </a>
              </Button>
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

export default NCERTBooks;
