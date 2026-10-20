import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Search,
  ExternalLink,
  MapPin,
  BookmarkPlus,
  CheckCircle2,
  Calendar,
  Layers,
  UserCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export interface CurriculumCompanionItem {
  id: string;
  class_level: string;
  subject: string;
  syllabus_chapter: string;
  recommended_book: string;
  author: string;
  accession_number?: string;
  shelf_location: string;
  teacher_note: string;
  recommended_by: string;
  tags: string[];
}

const CURRICULUM_DATA: CurriculumCompanionItem[] = [
  {
    id: "cc-10-sci-1",
    class_level: "10",
    subject: "Science",
    syllabus_chapter: "Chapter 1: Chemical Reactions & Equations",
    recommended_book: "The Disappearing Spoon: And Other True Tales of Madness and Love from the Periodic Table",
    author: "Sam Kean",
    shelf_location: "Shelf SCI-02, Rack 4",
    teacher_note: "Brilliant real-world stories behind reaction reactivity series and chemical elements.",
    recommended_by: "Mrs. S. Meenakshi (PGT Chemistry)",
    tags: ["Reactivity", "Periodic Table", "Experiments"]
  },
  {
    id: "cc-10-sci-2",
    class_level: "10",
    subject: "Science",
    syllabus_chapter: "Chapter 10: Light – Reflection & Refraction",
    recommended_book: "Optics and Everyday Light Phenomenon",
    author: "F. A. Jenkins & H. E. White",
    shelf_location: "Shelf SCI-04, Rack 1",
    teacher_note: "Visual diagrams showing ray tracing and spherical mirror optics.",
    recommended_by: "Mr. K. Ramesh (PGT Physics)",
    tags: ["Ray Optics", "Mirrors", "Lenses"]
  },
  {
    id: "cc-10-math-1",
    class_level: "10",
    subject: "Mathematics",
    syllabus_chapter: "Chapter 8: Introduction to Trigonometry",
    recommended_book: "Trigonometric Delights",
    author: "Eli Maor",
    shelf_location: "Shelf MTH-01, Rack 2",
    teacher_note: "Understand why sine, cosine and tangent ratios exist beyond standard triangles.",
    recommended_by: "Mr. P. Vijayakumar (TGT Maths)",
    tags: ["Angles", "Heights & Distances", "History of Math"]
  },
  {
    id: "cc-10-eng-1",
    class_level: "10",
    subject: "English",
    syllabus_chapter: "First Flight: Nelson Mandela – Long Walk to Freedom",
    recommended_book: "Long Walk to Freedom (Unabridged Illustrated Edition)",
    author: "Nelson Mandela",
    shelf_location: "Shelf BIO-01, Rack 3",
    teacher_note: "Read the full historical context behind South Africa's struggle against apartheid.",
    recommended_by: "Mrs. Geetha Nair (TGT English)",
    tags: ["Autobiography", "Apartheid", "Inspirational"]
  },
  {
    id: "cc-12-phys-1",
    class_level: "12",
    subject: "Physics",
    syllabus_chapter: "Unit 3: Magnetic Effects of Current & Magnetism",
    recommended_book: "The Feynman Lectures on Physics (Vol. 2: Electromagnetism)",
    author: "Richard P. Feynman",
    shelf_location: "Shelf REF-03, Rack 5",
    teacher_note: "The clearest conceptual explanation of Ampere's circuital law and Lorentz force.",
    recommended_by: "Mr. K. Ramesh (PGT Physics)",
    tags: ["Electromagnetism", "Feynman", "Competitive Exam"]
  },
  {
    id: "cc-12-chem-1",
    class_level: "12",
    subject: "Chemistry",
    syllabus_chapter: "Unit 8: Coordination Compounds",
    recommended_book: "Concise Inorganic Chemistry",
    author: "J. D. Lee",
    shelf_location: "Shelf REF-02, Rack 2",
    teacher_note: "Excellent for Crystal Field Theory (CFT) and isomerism color complexes.",
    recommended_by: "Mrs. S. Meenakshi (PGT Chemistry)",
    tags: ["Inorganic", "CFT", "CBSE Board"]
  },
  {
    id: "cc-12-cs-1",
    class_level: "12",
    subject: "Computer Science",
    syllabus_chapter: "Unit 1: Computational Thinking & Programming-2 (Data Structures)",
    recommended_book: "Problem Solving with Algorithms and Data Structures using Python",
    author: "Bradley N. Miller & David L. Ranum",
    shelf_location: "Shelf CS-01, Rack 1",
    teacher_note: "Comprehensive visual diagrams on Stacks, Queues, and binary file operations.",
    recommended_by: "Mr. G. Anand (PGT Computer Science)",
    tags: ["Python", "Stacks", "Algorithms"]
  }
];

interface TeacherCurriculumListsProps {
  studentClass?: string | number | null;
  onLocateInMap?: (shelf: string) => void;
}

export const TeacherCurriculumLists: React.FC<TeacherCurriculumListsProps> = ({
  studentClass,
  onLocateInMap
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const defaultClass = useMemo(() => {
    const match = String(studentClass || "").match(/\d+/);
    return match ? match[0] : "10";
  }, [studentClass]);

  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    return CURRICULUM_DATA.filter((item) => {
      if (selectedClass !== "all" && item.class_level !== selectedClass) return false;
      if (selectedSubject !== "all" && item.subject !== selectedSubject) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.syllabus_chapter.toLowerCase().includes(q) ||
          item.recommended_book.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedClass, selectedSubject, search]);

  const subjects = useMemo(() => {
    const set = new Set(
      CURRICULUM_DATA.filter((i) => selectedClass === "all" || i.class_level === selectedClass).map(
        (i) => i.subject
      )
    );
    return Array.from(set);
  }, [selectedClass]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white border border-teal-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black text-[10px] px-2.5 py-0.5 border-0">
                <GraduationCap className="h-3 w-3 mr-1 inline" /> SYLLABUS COMPANIONS
              </Badge>
              <Badge variant="outline" className="text-teal-300 border-teal-400/30 text-[10px]">
                Teacher Curated
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Teacher Syllabus Reading Lists
            </h1>
            <p className="text-xs sm:text-sm text-teal-200/80 max-w-2xl leading-relaxed">
              Recommended library books and reference readings mapped directly to your ongoing CBSE textbook chapters by KV Sulur faculty.
            </p>
          </div>

          <Button
            onClick={() => navigate("/catalog")}
            className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold backdrop-blur shrink-0"
          >
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Explore Full Catalog
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-2xl border-border/60 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chapter, book, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-background text-xs sm:text-sm"
              />
            </div>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-10 rounded-xl bg-background text-xs sm:text-sm">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="12">Class 12</SelectItem>
                <SelectItem value="11">Class 11</SelectItem>
                <SelectItem value="10">Class 10</SelectItem>
                <SelectItem value="9">Class 9</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-10 rounded-xl bg-background text-xs sm:text-sm">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className="rounded-2xl border-border/60 hover:border-teal-500/40 bg-card hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30 text-[10px] font-bold">
                  Class {item.class_level} · {item.subject}
                </Badge>
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                  {item.shelf_location}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {item.syllabus_chapter}
                </p>
                <h3 className="text-base font-bold text-foreground mt-0.5 leading-snug">
                  {item.recommended_book}
                </h3>
                <p className="text-xs text-muted-foreground">by {item.author}</p>
              </div>

              {/* Teacher Note Quote Box */}
              <div className="p-3 bg-muted/40 rounded-xl border-l-4 border-l-teal-500 text-xs text-muted-foreground space-y-1">
                <p className="italic">"{item.teacher_note}"</p>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground pt-0.5">
                  <UserCheck className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  <span>{item.recommended_by}</span>
                </div>
              </div>

              {/* Tags and Action */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/40">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    navigate(`/catalog?q=${encodeURIComponent(item.recommended_book)}`);
                  }}
                  className="rounded-xl h-8 text-xs font-bold gradient-primary text-white border-0 shadow-xs active:scale-95 shrink-0"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  Borrow / Locate
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-12 text-center space-y-2">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-bold text-foreground">No syllabus companions found</p>
            <p className="text-xs text-muted-foreground">
              Try changing the class or subject filter to view more teacher recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherCurriculumLists;
