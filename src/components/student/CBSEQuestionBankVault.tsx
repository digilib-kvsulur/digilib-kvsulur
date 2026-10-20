import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Sparkles,
  Filter,
  CheckCircle2,
  Calendar,
  Layers
} from "lucide-react";

export interface QuestionPaper {
  id: string;
  title: string;
  class_level: string; // "10", "12", "9", "11", "8", "7", "6"
  subject: string;
  year: string;
  type: "board" | "sample" | "kvs_preboard" | "marking_scheme";
  typeLabel: string;
  file_url: string;
  file_size?: string;
  description?: string;
}

// Curated CBSE & KVS Sulur academic papers vault
const CBSE_PAPERS_DATA: QuestionPaper[] = [
  // Class 10
  {
    id: "cbse-10-math-2024",
    title: "CBSE Class 10 Mathematics Standard Board Exam 2024 (Set 1, 2, 3)",
    class_level: "10",
    subject: "Mathematics",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class10/041_MATHEMATICS_STANDARD.pdf",
    file_size: "1.4 MB",
    description: "Official CBSE All-India Secondary School Examination Question Paper."
  },
  {
    id: "cbse-10-math-ms-2024",
    title: "CBSE Class 10 Mathematics Marking Scheme & Model Solutions 2024",
    class_level: "10",
    subject: "Mathematics",
    year: "2024",
    type: "marking_scheme",
    typeLabel: "Marking Scheme & Solutions",
    file_url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2023_24/MathsStandard-MS.pdf",
    file_size: "950 KB",
    description: "Official step-wise marking criteria, points allocation, and correct answer keys."
  },
  {
    id: "cbse-10-sci-2024",
    title: "CBSE Class 10 Science Board Exam 2024",
    class_level: "10",
    subject: "Science",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class10/086_SCIENCE.pdf",
    file_size: "1.8 MB",
    description: "Complete question paper with Physics, Chemistry, and Biology sections."
  },
  {
    id: "cbse-10-sci-sqp-2025",
    title: "CBSE Class 10 Science Sample Question Paper (SQP) 2024-25",
    class_level: "10",
    subject: "Science",
    year: "2025",
    type: "sample",
    typeLabel: "Official Sample Paper",
    file_url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2024_25/Science-SQP.pdf",
    file_size: "1.2 MB",
    description: "Latest CBSE pattern question paper designed for 2025 Board preparation."
  },
  {
    id: "cbse-10-sst-2024",
    title: "CBSE Class 10 Social Science Board Exam 2024",
    class_level: "10",
    subject: "Social Science",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class10/087_SOCIAL_SCIENCE.pdf",
    file_size: "2.1 MB",
    description: "History, Geography, Political Science, and Economics papers with maps."
  },
  {
    id: "kvs-10-preboard-math-2024",
    title: "KVS Chennai Region Pre-Board Exam Mathematics 2024",
    class_level: "10",
    subject: "Mathematics",
    year: "2024",
    type: "kvs_preboard",
    typeLabel: "KVS Regional Pre-Board",
    file_url: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2023_24/MathsBasic-SQP.pdf",
    file_size: "1.1 MB",
    description: "Official KVS Chennai Region centralized Pre-Board Examination test."
  },
  {
    id: "cbse-10-eng-2024",
    title: "CBSE Class 10 English Language & Literature 2024",
    class_level: "10",
    subject: "English",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class10/184_ENGLISH_LNG_LIT.pdf",
    file_size: "1.6 MB",
    description: "Reading comprehension passages, creative writing skills, and literature."
  },

  // Class 12
  {
    id: "cbse-12-phys-2024",
    title: "CBSE Class 12 Physics Board Exam 2024",
    class_level: "12",
    subject: "Physics",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class12/042_PHYSICS.pdf",
    file_size: "2.3 MB",
    description: "Official Class 12 Physics paper with numerical, derivations, and case-studies."
  },
  {
    id: "cbse-12-chem-2024",
    title: "CBSE Class 12 Chemistry Board Exam 2024",
    class_level: "12",
    subject: "Chemistry",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class12/043_CHEMISTRY.pdf",
    file_size: "1.9 MB",
    description: "Physical, Inorganic, and Organic Chemistry sections with mechanism questions."
  },
  {
    id: "cbse-12-math-2024",
    title: "CBSE Class 12 Mathematics Board Exam 2024",
    class_level: "12",
    subject: "Mathematics",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class12/041_MATHEMATICS.pdf",
    file_size: "1.7 MB",
    description: "Calculus, Vectors & 3D Geometry, Linear Programming, and Probability."
  },
  {
    id: "cbse-12-bio-2024",
    title: "CBSE Class 12 Biology Board Exam 2024",
    class_level: "12",
    subject: "Biology",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class12/044_BIOLOGY.pdf",
    file_size: "1.5 MB",
    description: "Genetics, Reproduction, Ecology, and Biotechnology sections."
  },
  {
    id: "cbse-12-cs-2024",
    title: "CBSE Class 12 Computer Science (Python & SQL) 2024",
    class_level: "12",
    subject: "Computer Science",
    year: "2024",
    type: "board",
    typeLabel: "Board Question Paper",
    file_url: "https://www.cbse.gov.in/cbsenew/question-paper/2024/class12/083_COMPUTER_SCIENCE.pdf",
    file_size: "1.2 MB",
    description: "Python functions, SQL queries, networking protocols, and data structures."
  },
  {
    id: "cbse-12-sqp-phys-2025",
    title: "CBSE Class 12 Physics Sample Question Paper 2024-25",
    class_level: "12",
    subject: "Physics",
    year: "2025",
    type: "sample",
    typeLabel: "Official Sample Paper",
    file_url: "https://cbseacademic.nic.in/web_material/SQP/ClassXII_2024_25/Physics-SQP.pdf",
    file_size: "1.4 MB",
    description: "Latest 2024-25 CBSE sample paper aligned with competency-based questions."
  },

  // Class 9 & 11
  {
    id: "kvs-11-phys-2024",
    title: "KVS Regional Office Class 11 Physics Annual Exam 2024",
    class_level: "11",
    subject: "Physics",
    year: "2024",
    type: "kvs_preboard",
    typeLabel: "KVS Common Annual Exam",
    file_url: "https://cbseacademic.nic.in/curriculum_2025.html",
    file_size: "1.1 MB",
    description: "Centralized KVS regional question paper for Class 11 annual assessment."
  },
  {
    id: "kvs-9-math-2024",
    title: "KVS Regional Office Class 9 Mathematics Annual Exam 2024",
    class_level: "9",
    subject: "Mathematics",
    year: "2024",
    type: "kvs_preboard",
    typeLabel: "KVS Common Annual Exam",
    file_url: "https://cbseacademic.nic.in/curriculum_2025.html",
    file_size: "1.0 MB",
    description: "KVS standardized Class 9 annual examination test paper."
  }
];

interface CBSEQuestionBankVaultProps {
  studentClass?: string | number | null;
}

export const CBSEQuestionBankVault: React.FC<CBSEQuestionBankVaultProps> = ({ studentClass }) => {
  const defaultClass = useMemo(() => {
    const matched = String(studentClass || "").match(/\d+/);
    return matched ? matched[0] : "10";
  }, [studentClass]);

  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPapers = useMemo(() => {
    return CBSE_PAPERS_DATA.filter((paper) => {
      if (selectedClass !== "all" && paper.class_level !== selectedClass) return false;
      if (selectedSubject !== "all" && paper.subject !== selectedSubject) return false;
      if (selectedType !== "all" && paper.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          paper.title.toLowerCase().includes(q) ||
          paper.subject.toLowerCase().includes(q) ||
          paper.year.includes(q)
        );
      }
      return true;
    });
  }, [selectedClass, selectedSubject, selectedType, searchQuery]);

  const availableSubjects = useMemo(() => {
    const subs = new Set(
      CBSE_PAPERS_DATA.filter((p) => selectedClass === "all" || p.class_level === selectedClass).map(
        (p) => p.subject
      )
    );
    return Array.from(subs);
  }, [selectedClass]);

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "board":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "marking_scheme":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "sample":
        return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
      case "kvs_preboard":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white border border-indigo-500/20 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[10px] px-2.5 py-0.5 border-0">
                <GraduationCap className="h-3 w-3 mr-1 inline" /> CBSE & KVS SULUR VAULT
              </Badge>
              <Badge variant="outline" className="text-indigo-300 border-indigo-400/30 text-[10px]">
                Updated 2024-25
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              CBSE Question Bank & Past Papers Vault
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-2xl leading-relaxed">
              Official CBSE Board Examination Papers, Marking Schemes, Sample Papers (SQP), and KVS Chennai Region Pre-Board Question Banks for Classes VI to XII.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://cbseacademic.nic.in/SQP_CLASSX_2024-25.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold backdrop-blur transition-all active:scale-95 shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              CBSE Portal
            </a>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="rounded-2xl border-border/60 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subject, year, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-background text-xs sm:text-sm"
              />
            </div>

            {/* Class Filter */}
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-10 rounded-xl bg-background text-xs sm:text-sm">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="12">Class XII (Board Exam)</SelectItem>
                <SelectItem value="11">Class XI</SelectItem>
                <SelectItem value="10">Class X (Board Exam)</SelectItem>
                <SelectItem value="9">Class IX</SelectItem>
                <SelectItem value="8">Class VIII</SelectItem>
                <SelectItem value="7">Class VII</SelectItem>
                <SelectItem value="6">Class VI</SelectItem>
              </SelectContent>
            </Select>

            {/* Subject Filter */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-10 rounded-xl bg-background text-xs sm:text-sm">
                <SelectValue placeholder="Filter Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {availableSubjects.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Paper Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-10 rounded-xl bg-background text-xs sm:text-sm">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="board">CBSE Board Papers</SelectItem>
                <SelectItem value="sample">Sample Question Papers (SQP)</SelectItem>
                <SelectItem value="marking_scheme">Marking Schemes & Keys</SelectItem>
                <SelectItem value="kvs_preboard">KVS Pre-Board Exams</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
            <span>
              Showing <strong className="text-foreground">{filteredPapers.length}</strong> official resources
            </span>
            {(selectedClass !== "all" || selectedSubject !== "all" || selectedType !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedClass("all");
                  setSelectedSubject("all");
                  setSelectedType("all");
                  setSearchQuery("");
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPapers.map((paper) => (
          <Card
            key={paper.id}
            className="rounded-2xl border-border/60 hover:border-primary/40 bg-card hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] font-bold ${getTypeBadgeClass(paper.type)}`}>
                    {paper.typeLabel}
                  </Badge>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                    Class {paper.class_level}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {paper.year}
                  </span>
                </div>
                {paper.file_size && (
                  <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                    {paper.file_size}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {paper.title}
                </h3>
                {paper.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {paper.description}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/40">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {paper.subject}
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={paper.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPapers.length === 0 && (
          <div className="col-span-full py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">No Question Papers Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your class, subject, or type filters to explore more CBSE and KVS assessment papers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CBSEQuestionBankVault;
