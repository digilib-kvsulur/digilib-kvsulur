import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, Trash2, Download, BookOpen, Loader2, Plus, GraduationCap, Link2, Edit2, RefreshCw, Save, X, Database, ExternalLink, CheckCircle2, RotateCcw } from "lucide-react";
import BulkImportMaterials from "./BulkImportMaterials";
import BulkImportCbse from "./BulkImportCbse";
import NcertCbseReview from "./NcertCbseReview";
import { formatGoogleDriveUrl, isGoogleDriveUrl, isGoogleDriveFolder } from "@/lib/utils";
import { getStudyMaterialAccessUrl, openStudyMaterial } from "@/lib/studyMaterialAccess";

interface Material {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  student_class: string | null;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  chapter_title?: string | null;
  resource_type?: string;
  academic_session?: string;
  exam_year?: number | null;
  marks?: number | null;
  source_label?: string | null;
  source_url?: string | null;
  markdown_content?: string | null;
  review_status?: "pending" | "approved" | "needs_revision";
  review_note?: string | null;
  reviewed_at?: string | null;
  uploaded_by: string;
  created_at: string;
}

interface NcertBookChapter {
  id: string;
  class_number: string;
  subject: string;
  book_name: string;
  chapter_title: string;
  chapter_number: number | null;
  file_url: string;
  created_at: string;
}

interface CbseCurriculumEntry {
  id: string;
  category: string;
  chapter_title: string;
  chapter_number: number | null;
  file_url: string;
  description: string | null;
  class_number: string;
  subject: string;
  created_at: string;
}

const CLASSES = ["6", "7", "8", "9", "10", "11", "12", "All"];
const SUBJECTS = ["Mathematics", "Science", "English", "Social Science", "Physics", "Chemistry", "Biology", "Hindi", "Sanskrit", "Computer Science", "CBSE Curriculum", "General"];

// NCERT URL codes per class+subject — pattern: https://ncert.nic.in/textbook/pdf/{code}{chapter_padded}.pdf
const NCERT_URL_CODES: Record<string, Record<string, { code: string; bookName: string; chapters: number }>> = {
  "6": {
    English: { code: "fepr1", bookName: "English (Poorvi) – Class 6", chapters: 5 },
    Hindi: { code: "fhml1", bookName: "Hindi (Malhar) – Class 6", chapters: 13 },
    Mathematics: { code: "fegp1", bookName: "Mathematics (Ganita Prakash) – Class 6", chapters: 10 },
    Science: { code: "fecu1", bookName: "Science (Curiosity) – Class 6", chapters: 12 },
    "Social Science": { code: "fees1", bookName: "Social Science (Exploring Society) – Class 6", chapters: 14 },
    Sanskrit: { code: "fsde1", bookName: "Sanskrit (Deepakam) – Class 6", chapters: 15 },
  },
  "7": {
    English: { code: "gehc1", bookName: "English (Honeycomb) – Class 7", chapters: 8 },
    Hindi: { code: "ghvs1", bookName: "Hindi (Vasant) – Class 7", chapters: 15 },
    Mathematics: { code: "gemh1", bookName: "Mathematics – Class 7", chapters: 13 },
    Science: { code: "gesc1", bookName: "Science – Class 7", chapters: 13 },
    "Social Science": { code: "gess1", bookName: "Social Science – Class 7", chapters: 8 },
  },
  "8": {
    English: { code: "hehd1", bookName: "English (Honeydew) – Class 8", chapters: 8 },
    Hindi: { code: "hhvs1", bookName: "Hindi (Vasant) – Class 8", chapters: 13 },
    Mathematics: { code: "hemh1", bookName: "Mathematics – Class 8", chapters: 13 },
    Science: { code: "hesc1", bookName: "Science – Class 8", chapters: 13 },
    "Social Science": { code: "hess2", bookName: "Social Science (History) – Class 8", chapters: 10 },
    Sanskrit: { code: "hhsk1", bookName: "Sanskrit (Ruchira) – Class 8", chapters: 14 },
  },
  "9": {
    English: { code: "iebe1", bookName: "English (Beehive) – Class 9", chapters: 9 },
    Hindi: { code: "ihks1", bookName: "Hindi (Kshitij) – Class 9", chapters: 13 },
    Mathematics: { code: "iemh1", bookName: "Mathematics – Class 9", chapters: 12 },
    Science: { code: "iesc1", bookName: "Science – Class 9", chapters: 12 },
    "Social Science": { code: "iess1", bookName: "Social Science (History) – Class 9", chapters: 5 },
  },
  "10": {
    English: { code: "jeff1", bookName: "English (First Flight) – Class 10", chapters: 9 },
    Hindi: { code: "jhks1", bookName: "Hindi (Kshitij) – Class 10", chapters: 13 },
    Mathematics: { code: "jemh1", bookName: "Mathematics – Class 10", chapters: 14 },
    Science: { code: "jesc1", bookName: "Science – Class 10", chapters: 13 },
    "Social Science": { code: "jess1", bookName: "Social Science (History) – Class 10", chapters: 5 },
  },
  "11": {
    English: { code: "kehb1", bookName: "English (Hornbill) – Class 11", chapters: 8 },
    Hindi: { code: "khar1", bookName: "Hindi (Aroh) – Class 11", chapters: 10 },
    Mathematics: { code: "kemh1", bookName: "Mathematics – Class 11", chapters: 14 },
    Physics_Part1: { code: "keph1", bookName: "Physics Part 1 – Class 11", chapters: 8 },
    Physics_Part2: { code: "keph2", bookName: "Physics Part 2 – Class 11", chapters: 6 },
    Chemistry_Part1: { code: "kech1", bookName: "Chemistry Part 1 – Class 11", chapters: 7 },
    Chemistry_Part2: { code: "kech2", bookName: "Chemistry Part 2 – Class 11", chapters: 7 },
    Biology: { code: "kebo1", bookName: "Biology – Class 11", chapters: 19 },
    "Computer Science": { code: "kecs1", bookName: "Computer Science – Class 11", chapters: 11 },
  },
  "12": {
    English: { code: "lefl1", bookName: "English (Flamingo) – Class 12", chapters: 8 },
    Hindi: { code: "lhar1", bookName: "Hindi (Aroh) – Class 12", chapters: 10 },
    Mathematics_Part1: { code: "lemh1", bookName: "Mathematics Part 1 – Class 12", chapters: 6 },
    Mathematics_Part2: { code: "lemh2", bookName: "Mathematics Part 2 – Class 12", chapters: 7 },
    Physics_Part1: { code: "leph1", bookName: "Physics Part 1 – Class 12", chapters: 8 },
    Physics_Part2: { code: "leph2", bookName: "Physics Part 2 – Class 12", chapters: 6 },
    Chemistry_Part1: { code: "lech1", bookName: "Chemistry Part 1 – Class 12", chapters: 9 },
    Chemistry_Part2: { code: "lech2", bookName: "Chemistry Part 2 – Class 12", chapters: 7 },
    Biology: { code: "lebo1", bookName: "Biology – Class 12", chapters: 13 },
    "Computer Science": { code: "lecs1", bookName: "Computer Science – Class 12", chapters: 13 },
  },
};

const buildNcertUrl = (code: string, chapter: number) => {
  const ch = String(chapter).padStart(2, "0");
  return `https://ncert.nic.in/textbook/pdf/${code}${ch}.pdf`;
};

const normalizeStudySubject = (value: string | null | undefined) => (value || "")
  .replace(/(_Part\d| Part \d)/gi, "").replace(/_/g, " ").trim().toLocaleLowerCase();
const normalizeStudyChapter = (value: string | null | undefined) => (value || "")
  .replace(/^(chapter|unit|lesson)\s*\d+\s*[-–:.)]?\s*/i, "").trim().toLocaleLowerCase();

const StudyMaterialsManager = () => {
  const { toast } = useToast();
  
  // General study materials states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserClass, setCurrentUserClass] = useState("");
  const [loadingMats, setLoadingMats] = useState(true);
  const [uploadingMats, setUploadingMats] = useState(false);
  const [matsForm, setMatsForm] = useState({ title: "", description: "", subject: "General", student_class: "All", chapter_title: "", resource_type: "short_notes", academic_session: "2026-27", exam_year: "", marks: "", source_label: "", source_url: "", markdown_content: "" });
  const [activeHubTab, setActiveHubTab] = useState("materials");
  const [coverageClass, setCoverageClass] = useState("All");
  const [coverageSubject, setCoverageSubject] = useState("All");
  const [matsFile, setMatsFile] = useState<File | null>(null);
  const [materialToEdit, setMaterialToEdit] = useState<Material | null>(null);
  const [editMaterialForm, setEditMaterialForm] = useState<any>({});

  // NCERT chapters states
  const [ncertChapters, setNcertChapters] = useState<NcertBookChapter[]>([]);
  const [loadingNcert, setLoadingNcert] = useState(true);
  const [addingNcert, setAddingNcert] = useState(false);
  const [ncertFile, setNcertFile] = useState<File | null>(null);
  const [ncertForm, setNcertForm] = useState({
    class_number: "10",
    subject: "Mathematics",
    book_name: "Mathematics – Class 10",
    chapter_title: "Chapter 1 – Real Numbers",
    chapter_number: "1",
    file_url: "",
  });

  // CBSE Curriculum states
  const [cbseEntries, setCbseEntries] = useState<CbseCurriculumEntry[]>([]);
  const [loadingCbse, setLoadingCbse] = useState(true);
  const [addingCbse, setAddingCbse] = useState(false);
  const [editingCbseId, setEditingCbseId] = useState<string | null>(null);
  const [cbseFile, setCbseFile] = useState<File | null>(null);
  const [cbseForm, setCbseForm] = useState({
    category: "",
    chapter_title: "",
    chapter_number: "",
    file_url: "",
    description: "",
    class_number: "10",
    subject: "Mathematics"
  });

  // NCERT edit states
  const [editingNcertId, setEditingNcertId] = useState<string | null>(null);
  const [editNcertForm, setEditNcertForm] = useState<Partial<NcertBookChapter>>({});

  // NCERT fetch panel state
  const [showFetchPanel, setShowFetchPanel] = useState(false);
  const [fetchClass, setFetchClass] = useState("10");
  const [fetchSubject, setFetchSubject] = useState("Mathematics");
  const [fetchingNcert, setFetchingNcert] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMaterial, setViewMaterial] = useState<{title: string, url: string} | null>(null);

  const handleOpenMaterial = async (title: string, rawUrl: string) => {
    if (!rawUrl) return;
    const accessUrl = await getStudyMaterialAccessUrl(rawUrl);
    if (
      rawUrl.includes("ncert.nic.in") ||
      rawUrl.includes("cbseacademic.nic.in") ||
      isGoogleDriveFolder(rawUrl)
    ) {
      window.open(accessUrl, "_blank", "noopener,noreferrer");
    } else {
      setViewMaterial({ title, url: accessUrl });
    }
  };

  useEffect(() => {
    loadMaterials();
    loadNcertChapters();
    loadCbseCurriculum();
  }, []);

  const loadMaterials = async () => {
    setLoadingMats(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoadingMats(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role,student_class").eq("id", session.user.id).single();
    setCurrentUserId(session.user.id);
    setCurrentUserRole(profile?.role || "");
    setCurrentUserClass(profile?.student_class || "");
    const profileClassNumber = String(profile?.student_class || "").match(/\d+/)?.[0] || "";
    if (profile?.role === "teacher" && profileClassNumber) setCoverageClass(profileClassNumber);

    let query = (supabase as any).from("study_materials").select("*").order("created_at", { ascending: false });
    
    const { data, error } = await query;
    if (error) toast({ title: "Failed to load materials", description: error.message, variant: "destructive" });
    else setMaterials((data as Material[]) || []);
    setLoadingMats(false);
  };

  const beginEditMaterial = (material: Material) => {
    setMaterialToEdit(material);
    setEditMaterialForm({ ...material, exam_year: material.exam_year?.toString() || "", marks: material.marks?.toString() || "" });
  };

  const saveMaterialEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialToEdit) return;
    const { error } = await (supabase as any).from("study_materials").update({
      title: editMaterialForm.title.trim(), description: editMaterialForm.description?.trim() || null,
      subject: editMaterialForm.subject, student_class: editMaterialForm.student_class,
      chapter_title: editMaterialForm.chapter_title?.trim() || null, resource_type: editMaterialForm.resource_type,
      academic_session: editMaterialForm.academic_session?.trim() || "2026-27",
      exam_year: editMaterialForm.exam_year ? Number(editMaterialForm.exam_year) : null,
      marks: editMaterialForm.marks ? Number(editMaterialForm.marks) : null,
      source_label: editMaterialForm.source_label?.trim() || null, source_url: editMaterialForm.source_url?.trim() || null,
      markdown_content: editMaterialForm.markdown_content?.trim() || null,
      review_status: "pending", review_note: null, reviewed_by: null, reviewed_at: null,
    }).eq("id", materialToEdit.id);
    if (error) { toast({ title: "Could not update resource", description: error.message, variant: "destructive" }); return; }
    setMaterialToEdit(null); toast({ title: "Resource updated" }); loadMaterials();
  };

  const setMaterialReview = async (material: Material, status: "approved" | "needs_revision") => {
    const { error } = await supabase.from("study_materials").update({ review_status: status, review_note: status === "needs_revision" ? "Please revise this resource and resubmit for review." : null } as any).eq("id", material.id);
    if (error) { toast({ title: "Review update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "Resource approved" : "Revision requested", description: status === "approved" ? "Students can now see this resource." : "The uploader can edit and resubmit this resource." });
    loadMaterials();
  };

  const loadNcertChapters = async () => {
    setLoadingNcert(true);
    const { data, error } = await supabase.from("ncert_books").select("*").order("class_number", { ascending: true }).order("subject", { ascending: true }).order("chapter_number", { ascending: true });
    if (error) toast({ title: "Failed to load NCERT", description: error.message, variant: "destructive" });
    else setNcertChapters((data as NcertBookChapter[]) || []);
    setLoadingNcert(false);
  };

  const loadCbseCurriculum = async () => {
    setLoadingCbse(true);
    const { data, error } = await supabase.from("cbse_curriculum").select("*").order("category", { ascending: true }).order("chapter_number", { ascending: true });
    if (error) toast({ title: "Failed to load CBSE Curriculum", description: error.message, variant: "destructive" });
    else setCbseEntries((data as CbseCurriculumEntry[]) || []);
    setLoadingCbse(false);
  };

  const bulkFetchNcertChapters = async () => {
    const classData = NCERT_URL_CODES[fetchClass];
    if (!classData || !classData[fetchSubject]) {
      toast({ title: "No URL pattern available for this class/subject combination", variant: "destructive" });
      return;
    }
    const { code, bookName, chapters } = classData[fetchSubject];
    setFetchingNcert(true);
    try {
      const CHAPTER_NAMES: Record<string, string[]> = {
        Mathematics: ["Real Numbers","Polynomials","Pair of Linear Equations in Two Variables","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Introduction to Trigonometry","Some Applications of Trigonometry","Circles","Areas Related to Circles","Surface Areas and Volumes","Statistics","Probability","Proofs in Mathematics"],
        Science: ["Chemical Reactions and Equations","Acids, Bases and Salts","Metals and Non-metals","Carbon and Its Compounds","Life Processes","Control and Coordination","How do Organisms Reproduce?","Heredity","Light – Reflection and Refraction","The Human Eye and the Colourful World","Electricity","Magnetic Effects of Electric Current","Our Environment","Sustainable Management of Natural Resources","Carbon and Its Compounds (Extra)","Management of Natural Resources"],
        Physics: ["Electric Charges and Fields","Electrostatic Potential and Capacitance","Current Electricity","Moving Charges and Magnetism","Magnetism and Matter","Electromagnetic Induction","Alternating Current","Electromagnetic Waves"],
        Chemistry: ["The Solid State","Solutions","Electrochemistry","Chemical Kinetics","Surface Chemistry","General Principles","The p-Block Elements","The d and f Block Elements"],
        Biology: ["The Living World","Biological Classification","Plant Kingdom","Animal Kingdom","Morphology of Flowering Plants","Anatomy of Flowering Plants","Structural Organisation in Animals","Cell: The Unit of Life","Biomolecules","Cell Cycle and Cell Division","Transport in Plants","Mineral Nutrition","Photosynthesis","Respiration in Plants","Plant Growth","Digestion and Absorption","Breathing and Exchange of Gases","Body Fluids and Circulation","Excretory Products","Locomotion and Movement","Neural Control","Chemical Coordination"],
      };

      const rows = Array.from({ length: chapters }, (_, i) => {
        const chNum = i + 1;
        const chapterNames = CHAPTER_NAMES[fetchSubject] || [];
        const chapterName = chapterNames[i] ? `Chapter ${chNum} – ${chapterNames[i]}` : `Chapter ${chNum}`;
        return {
          class_number: fetchClass,
          subject: fetchSubject,
          book_name: bookName,
          chapter_title: chapterName,
          chapter_number: chNum,
          file_url: buildNcertUrl(code, chNum),
        };
      });

      const { error } = await supabase.from("ncert_books").upsert(rows, { onConflict: "class_number,subject,chapter_number", ignoreDuplicates: true });
      if (error) throw error;

      toast({ title: `✅ Fetched ${chapters} chapters!`, description: `${bookName} chapters registered successfully.` });
      setShowFetchPanel(false);
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Fetch failed", description: err.message, variant: "destructive" });
    } finally {
      setFetchingNcert(false);
    }
  };

  const fetchAllNcertDatabase = async () => {
    if (!confirm("This will fetch and import all predefined NCERT books for all classes. It may take a moment. Continue?")) return;
    setFetchingNcert(true);
    
    try {
      const allRows: any[] = [];
      const CHAPTER_NAMES: Record<string, string[]> = {
        Mathematics: ["Real Numbers","Polynomials","Pair of Linear Equations in Two Variables","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Introduction to Trigonometry","Some Applications of Trigonometry","Circles","Areas Related to Circles","Surface Areas and Volumes","Statistics","Probability","Proofs in Mathematics"],
        Science: ["Chemical Reactions and Equations","Acids, Bases and Salts","Metals and Non-metals","Carbon and Its Compounds","Life Processes","Control and Coordination","How do Organisms Reproduce?","Heredity","Light – Reflection and Refraction","The Human Eye and the Colourful World","Electricity","Magnetic Effects of Electric Current","Our Environment","Sustainable Management of Natural Resources","Carbon and Its Compounds (Extra)","Management of Natural Resources"],
        Physics_Part1: ["Electric Charges and Fields","Electrostatic Potential and Capacitance","Current Electricity","Moving Charges and Magnetism","Magnetism and Matter","Electromagnetic Induction","Alternating Current","Electromagnetic Waves"],
        Chemistry_Part1: ["The Solid State","Solutions","Electrochemistry","Chemical Kinetics","Surface Chemistry","General Principles","The p-Block Elements","The d and f Block Elements"],
      };

      for (const [cls, subjects] of Object.entries(NCERT_URL_CODES)) {
        for (const [sub, data] of Object.entries(subjects)) {
          for (let i = 0; i < data.chapters; i++) {
            const chNum = i + 1;
            const chapterNames = CHAPTER_NAMES[sub] || CHAPTER_NAMES[sub.replace(/_Part\d/, "")] || [];
            const chapterName = chapterNames[i] ? `Chapter ${chNum} – ${chapterNames[i]}` : `Chapter ${chNum}`;
            allRows.push({
              class_number: cls,
              subject: sub,
              book_name: data.bookName,
              chapter_title: chapterName,
              chapter_number: chNum,
              file_url: buildNcertUrl(data.code, chNum),
            });
          }
        }
      }

      // Process in batches of 100 to avoid request too large errors
      for (let i = 0; i < allRows.length; i += 100) {
        const batch = allRows.slice(i, i + 100);
        const { error } = await supabase.from("ncert_books").upsert(batch, { onConflict: "class_number,subject,chapter_number", ignoreDuplicates: true });
        if (error) throw error;
      }

      toast({ title: `✅ Fetched all books!`, description: `${allRows.length} chapters registered successfully.` });
      setShowFetchPanel(false);
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Fetch All failed", description: err.message, variant: "destructive" });
    } finally {
      setFetchingNcert(false);
    }
  };

  const fetchMissingNcertDatabase = async () => {
    if (!confirm("This will fetch and import only the missing predefined NCERT books for all classes. Continue?")) return;
    setFetchingNcert(true);
    
    try {
      const allRows: any[] = [];
      const CHAPTER_NAMES: Record<string, string[]> = {
        Mathematics: ["Real Numbers","Polynomials","Pair of Linear Equations in Two Variables","Quadratic Equations","Arithmetic Progressions","Triangles","Coordinate Geometry","Introduction to Trigonometry","Some Applications of Trigonometry","Circles","Areas Related to Circles","Surface Areas and Volumes","Statistics","Probability","Proofs in Mathematics"],
        Science: ["Chemical Reactions and Equations","Acids, Bases and Salts","Metals and Non-metals","Carbon and Its Compounds","Life Processes","Control and Coordination","How do Organisms Reproduce?","Heredity","Light – Reflection and Refraction","The Human Eye and the Colourful World","Electricity","Magnetic Effects of Electric Current","Our Environment","Sustainable Management of Natural Resources","Carbon and Its Compounds (Extra)","Management of Natural Resources"],
        Physics_Part1: ["Electric Charges and Fields","Electrostatic Potential and Capacitance","Current Electricity","Moving Charges and Magnetism","Magnetism and Matter","Electromagnetic Induction","Alternating Current","Electromagnetic Waves"],
        Chemistry_Part1: ["The Solid State","Solutions","Electrochemistry","Chemical Kinetics","Surface Chemistry","General Principles","The p-Block Elements","The d and f Block Elements"],
      };

      for (const [cls, subjects] of Object.entries(NCERT_URL_CODES)) {
        for (const [sub, data] of Object.entries(subjects)) {
          for (let i = 0; i < data.chapters; i++) {
            const chNum = i + 1;
            
            // Check if it already exists
            const exists = ncertChapters.some(c => c.class_number === cls && c.subject === sub && c.chapter_number === chNum);
            if (exists) continue;

            const chapterNames = CHAPTER_NAMES[sub] || CHAPTER_NAMES[sub.replace(/_Part\d/, "")] || [];
            const chapterName = chapterNames[i] ? `Chapter ${chNum} – ${chapterNames[i]}` : `Chapter ${chNum}`;
            allRows.push({
              class_number: cls,
              subject: sub,
              book_name: data.bookName,
              chapter_title: chapterName,
              chapter_number: chNum,
              file_url: buildNcertUrl(data.code, chNum),
            });
          }
        }
      }

      if (allRows.length === 0) {
        toast({ title: "No missing books", description: "All predefined NCERT books are already in the database." });
        setFetchingNcert(false);
        return;
      }

      // Process in batches of 100 to avoid request too large errors
      for (let i = 0; i < allRows.length; i += 100) {
        const batch = allRows.slice(i, i + 100);
        const { error } = await supabase.from("ncert_books").upsert(batch, { onConflict: "class_number,subject,chapter_number", ignoreDuplicates: true });
        if (error) throw error;
      }

      toast({ title: `✅ Fetched missing books!`, description: `${allRows.length} missing chapters registered successfully.` });
      setShowFetchPanel(false);
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Fetch Missing failed", description: err.message, variant: "destructive" });
    } finally {
      setFetchingNcert(false);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!matsFile && !matsForm.markdown_content.trim()) || !matsForm.title.trim()) {
      toast({ title: "Missing info", description: "Add a title and either a file or Markdown content", variant: "destructive" });
      return;
    }
    setUploadingMats(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let publicUrl = "";
      if (matsFile) {
        const ext = matsFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("study-materials").upload(path, matsFile, { contentType: matsFile.type, upsert: false, cacheControl: "31536000" });
        if (upErr) throw upErr;
        publicUrl = supabase.storage.from("study-materials").getPublicUrl(path).data.publicUrl;
      }

      const { error: insErr } = await (supabase as any).from("study_materials").insert({
        title: matsForm.title.trim(),
        description: matsForm.description.trim() || null,
        subject: matsForm.subject,
        student_class: matsForm.student_class,
        chapter_title: matsForm.chapter_title.trim() || null,
        resource_type: matsForm.resource_type,
        academic_session: matsForm.academic_session.trim() || "2026-27",
        exam_year: matsForm.exam_year ? Number(matsForm.exam_year) : null,
        marks: matsForm.marks ? Number(matsForm.marks) : null,
        source_label: matsForm.source_label.trim() || null,
        source_url: matsForm.source_url.trim() || null,
        file_url: publicUrl,
        file_name: matsFile?.name || null,
        file_type: matsFile?.type || "text/markdown",
        markdown_content: matsForm.markdown_content.trim() || null,
        review_status: "pending",
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;

      toast({ title: "Submitted for review", description: `${matsForm.title} will appear to students after a teacher or admin approves it.` });
      setMatsForm({ title: "", description: "", subject: "General", student_class: "All", chapter_title: "", resource_type: "short_notes", academic_session: "2026-27", exam_year: "", marks: "", source_label: "", source_url: "", markdown_content: "" });
      setMatsFile(null);
      const fileInput = document.getElementById("sm-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      loadMaterials();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMats(false);
    }
  };

  const handleDeleteMaterial = async (m: Material) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      const marker = "/study-materials/";
      const idx = m.file_url.indexOf(marker);
      if (idx >= 0) {
        const path = m.file_url.substring(idx + marker.length);
        await supabase.storage.from("study-materials").remove([path]);
      }
      const { error } = await supabase.from("study_materials").delete().eq("id", m.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      loadMaterials();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAddNcertChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncertForm.file_url.trim() && !ncertFile) {
      toast({ title: "Resource URL or File is required", variant: "destructive" });
      return;
    }
    setAddingNcert(true);
    try {
      let finalUrl = formatGoogleDriveUrl(ncertForm.file_url.trim());

      if (ncertFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const ext = ncertFile.name.split(".").pop();
        const path = `ncert/${ncertForm.class_number}/${ncertForm.subject}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("study-materials").upload(path, ncertFile, {
          contentType: ncertFile.type, cacheControl: "31536000", upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("study-materials").getPublicUrl(path);
        finalUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("ncert_books").insert({
        class_number: ncertForm.class_number,
        subject: ncertForm.subject,
        book_name: ncertForm.book_name.trim(),
        chapter_title: ncertForm.chapter_title.trim(),
        chapter_number: parseInt(ncertForm.chapter_number) || null,
        file_url: finalUrl,
      });
      if (error) throw error;

      toast({ title: "NCERT Chapter Added!", description: "Chapter successfully registered in database." });
      setNcertForm(prev => ({
        ...prev,
        chapter_title: `Chapter ${parseInt(prev.chapter_number || "0") + 1} – `,
        chapter_number: String(parseInt(prev.chapter_number || "0") + 1),
        file_url: "",
      }));
      setNcertFile(null);
      const fEl = document.getElementById("nc-file") as HTMLInputElement;
      if (fEl) fEl.value = "";
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Failed to add chapter", description: err.message, variant: "destructive" });
    } finally {
      setAddingNcert(false);
    }
  };

  const handleDeleteNcertChapter = async (c: NcertBookChapter) => {
    if (!confirm(`Delete NCERT chapter "${c.chapter_title}"?`)) return;
    try {
      const { error } = await supabase.from("ncert_books").delete().eq("id", c.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const handleEditNcertSave = async (id: string) => {
    try {
      const { error } = await supabase.from("ncert_books").update({
        chapter_title: editNcertForm.chapter_title,
        book_name: editNcertForm.book_name,
        file_url: formatGoogleDriveUrl(editNcertForm.file_url?.trim() || ""),
        chapter_number: editNcertForm.chapter_number,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: "Updated" });
      setEditingNcertId(null);
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    }
  };

  const handleAddCbse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cbseForm.chapter_title.trim() || (!cbseForm.file_url.trim() && !cbseFile)) {
      toast({ title: "Title and URL/File are required", variant: "destructive" });
      return;
    }
    setAddingCbse(true);
    try {
      let finalUrl = formatGoogleDriveUrl(cbseForm.file_url.trim());
      if (cbseFile) {
        const { data: { user } } = await supabase.auth.getUser();
        const ext = cbseFile.name.split(".").pop();
        const path = `cbse/${cbseForm.category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("study-materials").upload(path, cbseFile, { contentType: cbseFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("study-materials").getPublicUrl(path);
        finalUrl = pub.publicUrl;
      }

      const payload = {
        category: cbseForm.category.trim() || "CBSE Curriculum",
        chapter_title: cbseForm.chapter_title.trim(),
        chapter_number: parseInt(cbseForm.chapter_number) || null,
        file_url: finalUrl,
        description: cbseForm.description.trim() || null,
        class_number: cbseForm.class_number,
        subject: cbseForm.subject,
      };

      let error;
      if (editingCbseId) {
        ({ error } = await supabase.from("cbse_curriculum").update(payload).eq("id", editingCbseId));
      } else {
        ({ error } = await supabase.from("cbse_curriculum").insert(payload));
      }
      if (error) throw error;

      toast({ title: editingCbseId ? "Updated!" : "Added!" });
      setCbseForm({ category: "", chapter_title: "", chapter_number: "", file_url: "", description: "", class_number: "10", subject: "Mathematics" });
      setCbseFile(null);
      setEditingCbseId(null);
      const fEl = document.getElementById("cbse-file") as HTMLInputElement;
      if (fEl) fEl.value = "";
      loadCbseCurriculum();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setAddingCbse(false);
    }
  };

  const handleDeleteCbse = async (entry: CbseCurriculumEntry) => {
    if (!confirm(`Delete "${entry.chapter_title}"?`)) return;
    try {
      const { error } = await supabase.from("cbse_curriculum").delete().eq("id", entry.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      loadCbseCurriculum();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  const curriculumSubjects = Array.from(new Set(ncertChapters
    .filter((chapter) => coverageClass === "All" || chapter.class_number === coverageClass)
    .map((chapter) => chapter.subject))).sort((a, b) => a.localeCompare(b));
  const coverageRows = ncertChapters
    .filter((chapter) => (coverageClass === "All" || chapter.class_number === coverageClass)
      && (coverageSubject === "All" || chapter.subject === coverageSubject))
    .map((chapter) => {
      const normalizedClass = String(Number(chapter.class_number));
      const subjectKey = normalizeStudySubject(chapter.subject);
      const chapterKey = normalizeStudyChapter(chapter.chapter_title);
      const matching = materials.filter((material) =>
        (material.student_class === normalizedClass || material.student_class === "All")
        && normalizeStudySubject(material.subject) === subjectKey
        && normalizeStudyChapter(material.chapter_title) === chapterKey);
      const formulaSubject = ["mathematics", "science", "physics", "chemistry"].includes(subjectKey);
      const competitiveSubject = ["mathematics", "physics", "chemistry", "biology"].includes(subjectKey);
      const classNumber = Number(chapter.class_number);
      const requiredTypes = ["chapter_lesson", "short_notes", ...(formulaSubject ? ["formula_sheet"] : []), "quick_revision",
        ...(classNumber === 10 || classNumber === 12 || (classNumber >= 11 && classNumber <= 12 && competitiveSubject) ? ["pyq"] : [])];
      const resourcesByType = new Map(requiredTypes.map((type) => [type, {
        approved: matching.filter((resource) => resource.resource_type === type && resource.review_status === "approved").length,
        pending: matching.filter((resource) => resource.resource_type === type && resource.review_status === "pending").length,
        needsRevision: matching.filter((resource) => resource.resource_type === type && resource.review_status === "needs_revision").length,
      }]));
      const completeCount = requiredTypes.filter((type) => (resourcesByType.get(type)?.approved || 0) > 0).length;
      const firstUnstartedType = requiredTypes.find((type) => {
        const count = resourcesByType.get(type);
        return !count?.approved && !count?.pending && !count?.needsRevision;
      });
      return { chapter, requiredTypes, resourcesByType, completeCount, firstUnstartedType };
    });
  const totalCoverageRequirements = coverageRows.reduce((sum, row) => sum + row.requiredTypes.length, 0);
  const approvedCoverageRequirements = coverageRows.reduce((sum, row) => sum + row.completeCount, 0);
  const missingCoverageResources = coverageRows.reduce((sum, row) => sum + row.requiredTypes.filter((type) => {
    const counts = row.resourcesByType.get(type);
    return !counts?.approved && !counts?.pending && !counts?.needsRevision;
  }).length, 0);
  const teacherCoverageClass = currentUserClass.match(/\d+/)?.[0] || "";
  const resourceTypeLabels: Record<string, string> = {
    chapter_lesson: "Chapter lesson", short_notes: "Short notes", formula_sheet: "Formula sheet", quick_revision: "Quick revision", pyq: "PYQs",
  };
  const downloadCoverageTemplate = () => {
    const columns = ["title", "description", "subject", "student_class", "chapter_title", "resource_type", "academic_session", "exam_year", "marks", "file_url", "source_label", "source_url", "markdown_content"];
    const lines = coverageRows.flatMap(({ chapter, requiredTypes, resourcesByType }) => requiredTypes
      .filter((type) => {
        const counts = resourcesByType.get(type);
        return !counts?.approved && !counts?.pending && !counts?.needsRevision;
      })
      .map((type) => [
        `Class ${chapter.class_number} ${chapter.subject} — ${chapter.chapter_title} — ${resourceTypeLabels[type]}`,
        "Original DLMS draft. Verify facts and current syllabus before approval.",
        chapter.subject,
        chapter.class_number,
        chapter.chapter_title,
        type,
        "2026-27",
        "",
        "",
        "",
        `Official NCERT reference: ${chapter.book_name}`,
        chapter.file_url,
        "",
      ]));
    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [columns, ...lines].map((line) => line.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `study-content-drafts-class-${coverageClass}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Study Materials Hub
          </h2>
          <p className="text-sm text-muted-foreground">Manage reference guides, CBSE curriculum materials, and NCERT books.</p>
        </div>
      </div>

      <Dialog open={Boolean(materialToEdit)} onOpenChange={(open) => !open && setMaterialToEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit study resource</DialogTitle></DialogHeader>
          <form onSubmit={saveMaterialEdit} className="grid max-h-[70dvh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            <div><Label>Title</Label><Input required value={editMaterialForm.title || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, title: e.target.value })} /></div>
            <div><Label>Class</Label><Select value={editMaterialForm.student_class || "All"} onValueChange={(v) => setEditMaterialForm({ ...editMaterialForm, student_class: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLASSES.filter((c) => currentUserRole !== "teacher" || c === "All" || c === currentUserClass).map((c) => <SelectItem key={c} value={c}>{c === "All" ? "All Classes" : `Class ${c}`}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Subject</Label><Select value={editMaterialForm.subject || "General"} onValueChange={(v) => setEditMaterialForm({ ...editMaterialForm, subject: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Chapter</Label><Input value={editMaterialForm.chapter_title || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, chapter_title: e.target.value })} /></div>
            <div><Label>Resource type</Label><Select value={editMaterialForm.resource_type || "short_notes"} onValueChange={(v) => setEditMaterialForm({ ...editMaterialForm, resource_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[["chapter_lesson","Chapter Lesson"],["short_notes","Short Notes"],["formula_sheet","Formula Sheet"],["pyq","PYQ"],["quick_revision","Quick Revision"],["textbook","Textbook / Syllabus"],["other","Other"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Session</Label><Input value={editMaterialForm.academic_session || "2026-27"} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, academic_session: e.target.value })} /></div>
            <div><Label>Exam year</Label><Input type="number" value={editMaterialForm.exam_year || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, exam_year: e.target.value })} /></div>
            <div><Label>Marks</Label><Input type="number" value={editMaterialForm.marks || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, marks: e.target.value })} /></div>
            <div><Label>Source label</Label><Input value={editMaterialForm.source_label || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, source_label: e.target.value })} /></div>
            <div><Label>Source URL</Label><Input type="url" value={editMaterialForm.source_url || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, source_url: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={editMaterialForm.description || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, description: e.target.value })} rows={2} /></div>
            <div className="sm:col-span-2"><Label>Markdown content</Label><Textarea value={editMaterialForm.markdown_content || ""} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, markdown_content: e.target.value })} rows={8} /></div>
            <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save resource</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Tabs value={activeHubTab} onValueChange={setActiveHubTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="coverage">Chapter Coverage</TabsTrigger>
          <TabsTrigger value="materials">Reference Materials</TabsTrigger>
          <TabsTrigger value="ncert">NCERT Books</TabsTrigger>
          <TabsTrigger value="cbse">CBSE Curriculum</TabsTrigger>
          <TabsTrigger value="review">NCERT & CBSE Link Review</TabsTrigger>
        </TabsList>

        <TabsContent value="coverage" className="space-y-5 mt-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Chapter resource coverage</CardTitle>
              <CardDescription>Coverage is based on the NCERT chapter index and approved DLMS materials in this school database. Pending drafts do not count as available to students.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select value={coverageClass} onValueChange={(value) => { setCoverageClass(value); setCoverageSubject("All"); }}>
                  <SelectTrigger className="min-h-11 sm:w-52" aria-label="Filter coverage by class"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{(currentUserRole === "teacher" && teacherCoverageClass ? [teacherCoverageClass] : CLASSES.filter((value) => value !== "All")).map((value) => <SelectItem key={value} value={value}>Class {value}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={coverageSubject} onValueChange={setCoverageSubject}>
                  <SelectTrigger className="min-h-11 sm:w-64" aria-label="Filter coverage by subject"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent><SelectItem value="All">All subjects</SelectItem>{curriculumSubjects.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex min-h-11 items-center rounded-lg border bg-muted/30 px-3 text-sm font-medium">
                  {loadingNcert || loadingMats ? "Loading coverage…" : `${approvedCoverageRequirements} of ${totalCoverageRequirements} required resource types approved`}
                </div>
                <Button variant="outline" className="min-h-11 gap-2 sm:ml-auto" onClick={downloadCoverageTemplate} disabled={loadingNcert || loadingMats || missingCoverageResources === 0}>
                  <Download className="h-4 w-4" /> Download missing-resource CSV
                </Button>
              </div>
              {loadingNcert || loadingMats ? <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Reading chapter and review data…</div> : coverageRows.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <h3 className="mt-3 font-semibold">No NCERT chapters in this class index</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Import or refresh the official chapter links before planning materials for this class.</p>
                  <Button className="mt-3" variant="outline" onClick={() => setActiveHubTab("ncert")}>Open NCERT chapter index</Button>
                </div>
              ) : <div className="space-y-3">{coverageRows.map(({ chapter, requiredTypes, resourcesByType, completeCount, firstUnstartedType }) => (
                <Card key={`${chapter.class_number}-${chapter.subject}-${chapter.book_name}-${chapter.chapter_number}`} className="border-border/70">
                  <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class {chapter.class_number} · {chapter.subject} · {chapter.book_name}</p>
                        <h3 className="mt-1 font-semibold leading-snug">{chapter.chapter_title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{completeCount}/{requiredTypes.length} applicable resource types approved</p>
                      </div>
                      <Button size="sm" variant={firstUnstartedType ? "outline" : "ghost"} className="min-h-10 shrink-0" onClick={() => {
                        if (firstUnstartedType) setMatsForm((current) => ({ ...current, title: `${resourceTypeLabels[firstUnstartedType]} — ${chapter.chapter_title}`, student_class: chapter.class_number, subject: chapter.subject, chapter_title: chapter.chapter_title, resource_type: firstUnstartedType }));
                        setActiveHubTab("materials");
                      }}>{firstUnstartedType ? "Add missing resource" : "Review resources"}</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">{requiredTypes.map((type) => {
                      const counts = resourcesByType.get(type)!;
                      const statusText = counts.approved ? `${counts.approved} approved` : counts.pending ? `${counts.pending} pending review` : counts.needsRevision ? `${counts.needsRevision} needs revision` : "Missing";
                      const variant = counts.approved ? "default" : counts.needsRevision ? "destructive" : counts.pending ? "secondary" : "outline";
                      return <Badge key={type} variant={variant}>{resourceTypeLabels[type]} · {statusText}</Badge>;
                    })}</div>
                  </CardContent>
                </Card>
              ))}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Reference Materials */}
        <TabsContent value="materials" className="space-y-6 mt-0">
          <div className="flex justify-end">
            <BulkImportMaterials onImported={loadMaterials} />
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-indigo-500" /> Add Reference / CBSE Material</CardTitle>
              <CardDescription>Submit notes and curriculum resources for review. Students see them after approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadMaterial} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Title *</Label>
                  <Input value={matsForm.title} onChange={e => setMatsForm({ ...matsForm, title: e.target.value })} placeholder="e.g. CBSE Class 10 Syllabus 2026-27 or Chemistry Notes" required />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={matsForm.description} onChange={e => setMatsForm({ ...matsForm, description: e.target.value })} placeholder="Brief details about the resource..." rows={2} />
                </div>
                <div>
                  <Label>Subject / Category</Label>
                  <Select value={matsForm.subject} onValueChange={v => setMatsForm({ ...matsForm, subject: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Class</Label>
                  <Select value={matsForm.student_class} onValueChange={v => setMatsForm({ ...matsForm, student_class: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASSES.filter((c) => currentUserRole !== "teacher" || c === "All" || c === currentUserClass).map(c => <SelectItem key={c} value={c}>{c === "All" ? "All Classes" : `Class ${c}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chapter</Label>
                  <Input value={matsForm.chapter_title} onChange={e => setMatsForm({ ...matsForm, chapter_title: e.target.value })} placeholder="Chapter or unit title" />
                </div>
                <div>
                  <Label>Resource Type</Label>
                  <Select value={matsForm.resource_type} onValueChange={v => setMatsForm({ ...matsForm, resource_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chapter_lesson">Chapter Lesson</SelectItem>
                      <SelectItem value="short_notes">Short Notes</SelectItem>
                      <SelectItem value="formula_sheet">Formula Sheet</SelectItem>
                      <SelectItem value="pyq">Previous Year Question</SelectItem>
                      <SelectItem value="quick_revision">Quick Revision</SelectItem>
                      <SelectItem value="textbook">Textbook / Syllabus</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Academic Session</Label><Input value={matsForm.academic_session} onChange={e => setMatsForm({ ...matsForm, academic_session: e.target.value })} placeholder="2026-27" /></div>
                {matsForm.resource_type === "pyq" && <>
                  <div><Label>Exam Year</Label><Input type="number" min="1990" max="2100" value={matsForm.exam_year} onChange={e => setMatsForm({ ...matsForm, exam_year: e.target.value })} /></div>
                  <div><Label>Marks</Label><Input type="number" min="1" max="100" value={matsForm.marks} onChange={e => setMatsForm({ ...matsForm, marks: e.target.value })} /></div>
                </>}
                <div><Label>Source Label</Label><Input value={matsForm.source_label} onChange={e => setMatsForm({ ...matsForm, source_label: e.target.value })} placeholder="CBSE 2025 board paper" /></div>
                <div><Label>Source URL</Label><Input type="url" value={matsForm.source_url} onChange={e => setMatsForm({ ...matsForm, source_url: e.target.value })} placeholder="Official source page" /></div>
                <div className="md:col-span-2">
                  <Label>Markdown Content</Label>
                  <Textarea value={matsForm.markdown_content} onChange={e => setMatsForm({ ...matsForm, markdown_content: e.target.value })} placeholder="Optional: author short notes, formulas, or quick revision in Markdown. Add either this or a file." rows={7} />
                </div>
                <div className="md:col-span-2">
                  <Label>Resource File (PDF, Word doc, image, etc.)</Label>
                  <Input id="sm-file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={e => setMatsFile(e.target.files?.[0] || null)} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={uploadingMats} className="gradient-primary border-0 font-bold">
                    {uploadingMats ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Material</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Uploaded Resources ({materials.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingMats ? (
                <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : materials.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No resources uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {materials.map(m => (
                    <div key={m.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">{m.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.subject} · {m.student_class === "All" ? "All Classes" : `Class ${m.student_class}`}
                          {m.description && ` · ${m.description}`}
                        </p>
                        <div className="mt-1"><Badge variant={m.review_status === "approved" ? "default" : m.review_status === "needs_revision" ? "destructive" : "secondary"}>{m.review_status === "approved" ? "Approved for students" : m.review_status === "needs_revision" ? "Revision requested" : "Pending review"}</Badge>{m.review_note && <span className="ml-2 text-xs text-muted-foreground">{m.review_note}</span>}</div>
                      </div>
                      {m.review_status !== "approved" && (currentUserRole === "admin" || m.uploaded_by !== currentUserId) ? <><Button onClick={() => setMaterialReview(m, "approved")} variant="outline" size="sm" className="h-9" title="Approve for students"><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button><Button onClick={() => setMaterialReview(m, "needs_revision")} variant="ghost" size="sm" className="h-9" title="Request revisions"><RotateCcw className="mr-1 h-4 w-4" /> Revise</Button></> : m.review_status !== "approved" ? <span className="px-2 text-xs text-muted-foreground">Awaiting peer review</span> : null}
                      <Button size="sm" variant="outline" className="h-8" title="Edit resource metadata and Markdown" onClick={() => beginEditMaterial(m)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {m.file_url && <Button size="sm" variant="outline" className="h-8" title="Preview Material" onClick={() => handleOpenMaterial(m.title, m.file_url)}>
                        <BookOpen className="h-4 w-4" />
                      </Button>}
                      {m.file_url && <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" title="Open directly in new tab" onClick={() => openStudyMaterial(m.file_url)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>}
                      <Button onClick={() => handleDeleteMaterial(m)} variant="ghost" size="sm" className="text-destructive h-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: NCERT Chapters */}
        <TabsContent value="ncert" className="space-y-6 mt-0">
          {/* Fetch Panel */}
          <Card className="border-border/50 bg-emerald-50/50 border-emerald-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span><BookOpen className="h-5 w-5 inline mr-2 text-indigo-500" /> NCERT Books</span>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setShowFetchPanel(!showFetchPanel)}>
                      <Database className="h-4 w-4 mr-2" />
                      Auto-Fetch NCERT Books
                    </Button>
                    <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50" onClick={fetchMissingNcertDatabase} disabled={fetchingNcert}>
                      {fetchingNcert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Fetch Missing
                    </Button>
                    <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={fetchAllNcertDatabase} disabled={fetchingNcert}>
                      {fetchingNcert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                      Fetch Complete DB
                    </Button>
                  </div>
                </CardTitle>
              </div>
              <CardDescription>Auto-register all chapter links from the official NCERT website in one click.</CardDescription>
            </CardHeader>
            {showFetchPanel && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label>Class</Label>
                    <Select value={fetchClass} onValueChange={setFetchClass}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(NCERT_URL_CODES).map(cls => (
                          <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={fetchSubject} onValueChange={setFetchSubject}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(NCERT_URL_CODES[fetchClass] || {}).map(sub => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {NCERT_URL_CODES[fetchClass]?.[fetchSubject] ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Will import <strong>{NCERT_URL_CODES[fetchClass][fetchSubject].chapters}</strong> chapters of{" "}
                          <strong>{NCERT_URL_CODES[fetchClass][fetchSubject].bookName}</strong>
                        </p>
                        <Button onClick={bulkFetchNcertChapters} disabled={fetchingNcert} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold">
                          {fetchingNcert ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Fetching...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Fetch All Chapters</>}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        No URL pattern available for Class {fetchClass} – {fetchSubject}. Add chapters manually below.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-indigo-500" /> Add NCERT Chapter Manually</CardTitle>
              <CardDescription>Upload a chapter PDF file or provide a direct web link (e.g. from ncert.nic.in).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddNcertChapter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Class Number *</Label>
                  <Select value={ncertForm.class_number} onValueChange={v => setNcertForm({ ...ncertForm, class_number: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["6", "7", "8", "9", "10", "11", "12"].map(num => <SelectItem key={num} value={num}>Class {num}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Select value={ncertForm.subject} onValueChange={v => setNcertForm({ ...ncertForm, subject: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Mathematics", "Science", "English", "Social Science", "Physics", "Chemistry", "Biology", "Hindi", "Mathematics_Part1", "Mathematics_Part2", "Physics_Part1", "Physics_Part2", "Chemistry_Part1", "Chemistry_Part2"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Book Name *</Label>
                  <Input value={ncertForm.book_name} onChange={e => setNcertForm({ ...ncertForm, book_name: e.target.value })} placeholder="e.g. Mathematics – Class 10" required />
                </div>
                <div>
                  <Label>Chapter Number (Optional)</Label>
                  <Input type="number" value={ncertForm.chapter_number} onChange={e => setNcertForm({ ...ncertForm, chapter_number: e.target.value })} placeholder="e.g. 1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Chapter Title *</Label>
                  <Input value={ncertForm.chapter_title} onChange={e => setNcertForm({ ...ncertForm, chapter_title: e.target.value })} placeholder="e.g. Chapter 1 – Real Numbers" required />
                </div>
                <div className="md:col-span-2">
                  <div className="border p-4 rounded-xl space-y-3 bg-slate-50">
                    <Label className="font-bold text-slate-700">Choose Resource Option</Label>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Option A: PDF URL (Fastest, saves storage space)</Label>
                        <Input value={ncertForm.file_url} onChange={e => setNcertForm({ ...ncertForm, file_url: e.target.value, ...{ file_file: null } })} placeholder="e.g. https://ncert.nic.in/textbook/pdf/jemh101.pdf" />
                      </div>
                      <div className="text-center text-xs text-muted-foreground">— OR —</div>
                      <div>
                        <Label className="text-xs">Option B: Upload PDF File directly</Label>
                        <Input id="nc-file" type="file" accept=".pdf" onChange={e => setNcertFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={addingNcert} className="gradient-primary border-0 font-bold">
                    {addingNcert ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Plus className="h-4 w-4 mr-2" /> Register NCERT Chapter</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* NCERT list with edit */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Registered NCERT Chapters ({ncertChapters.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingNcert ? (
                <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : ncertChapters.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No custom NCERT chapters loaded. Local defaults will be shown to students.</p>
              ) : (
                <div className="space-y-2">
                  {ncertChapters.map(c => (
                    <div key={c.id} className="p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                      {editingNcertId === c.id ? (
                        <div className="space-y-2">
                          <Input value={editNcertForm.chapter_title || ""} onChange={e => setEditNcertForm(p => ({ ...p, chapter_title: e.target.value }))} placeholder="Chapter title" />
                          <Input value={editNcertForm.book_name || ""} onChange={e => setEditNcertForm(p => ({ ...p, book_name: e.target.value }))} placeholder="Book name" />
                          <Input value={editNcertForm.file_url || ""} onChange={e => setEditNcertForm(p => ({ ...p, file_url: e.target.value }))} placeholder="PDF URL" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditNcertSave(c.id)} className="gradient-primary border-0 h-8">
                              <Save className="h-3.5 w-3.5 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingNcertId(null)} className="h-8">
                              <X className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-extrabold text-sm">
                              {c.class_number}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground truncate text-sm">{c.chapter_title}</p>
                              <p className="text-xs text-muted-foreground truncate">{c.book_name} ({c.subject})</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8" title="Preview Chapter" onClick={() => handleOpenMaterial(c.chapter_title, c.file_url)}>
                              <BookOpen className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" title="Open directly in new tab" onClick={() => window.open(c.file_url, "_blank", "noopener,noreferrer")}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => { setEditingNcertId(c.id); setEditNcertForm(c); }} variant="outline" size="sm" className="h-8">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleDeleteNcertChapter(c)} variant="ghost" size="sm" className="text-destructive h-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: CBSE Curriculum */}
        <TabsContent value="cbse" className="space-y-6 mt-0">
          <Card className="border-border/50 bg-slate-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="h-5 w-5 text-indigo-500" /> {editingCbseId ? "Edit CBSE Entry" : "Add CBSE Curriculum Entry"}</CardTitle>
              <BulkImportCbse onImported={loadCbseCurriculum} />
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCbse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Class *</Label>
                  <Select value={cbseForm.class_number} onValueChange={v => setCbseForm({ ...cbseForm, class_number: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSES.map(num => <SelectItem key={num} value={num}>Class {num}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Select value={cbseForm.subject} onValueChange={v => setCbseForm({ ...cbseForm, subject: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category / Book Name *</Label>
                  <Input value={cbseForm.category} onChange={e => setCbseForm({ ...cbseForm, category: e.target.value })} placeholder="e.g. Class 10 Syllabus 2025-26" required />
                </div>
                <div>
                  <Label>Item / Chapter Number</Label>
                  <Input type="number" value={cbseForm.chapter_number} onChange={e => setCbseForm({ ...cbseForm, chapter_number: e.target.value })} placeholder="e.g. 1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Title / Link Label *</Label>
                  <Input value={cbseForm.chapter_title} onChange={e => setCbseForm({ ...cbseForm, chapter_title: e.target.value })} placeholder="e.g. Mathematics Syllabus" required />
                </div>
                <div className="md:col-span-2">
                  <Label>Description (optional)</Label>
                  <Textarea value={cbseForm.description} onChange={e => setCbseForm({ ...cbseForm, description: e.target.value })} placeholder="Brief description of this resource..." rows={2} />
                </div>
                <div className="md:col-span-2">
                  <div className="border p-4 rounded-xl space-y-3 bg-slate-50">
                    <Label className="font-bold text-slate-700">Resource</Label>
                    <div>
                      <Label className="text-xs">Option A: URL (Portal link or direct PDF link)</Label>
                      <div className="flex gap-2">
                        <Input value={cbseForm.file_url} onChange={e => setCbseForm({ ...cbseForm, file_url: e.target.value })} placeholder="e.g. https://cbseacademic.nic.in/curriculum_2025.html" />
                        {cbseForm.file_url && (
                          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => window.open(cbseForm.file_url, "_blank")}>
                            <Link2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-xs text-muted-foreground">— OR —</div>
                    <div>
                      <Label className="text-xs">Option B: Upload PDF / Document</Label>
                      <Input id="cbse-file" type="file" accept=".pdf,.doc,.docx" onChange={e => setCbseFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={addingCbse} className="gradient-primary border-0 font-bold">
                    {addingCbse ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Plus className="h-4 w-4 mr-2" /> {editingCbseId ? "Update Entry" : "Add Entry"}</>}
                  </Button>
                  {editingCbseId && (
                    <Button type="button" variant="outline" onClick={() => { setEditingCbseId(null); setCbseForm({ category: "", chapter_title: "", chapter_number: "", file_url: "", description: "", class_number: "10", subject: "Mathematics" }); }}>
                      <X className="h-4 w-4 mr-1" /> Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">CBSE Curriculum Entries ({cbseEntries.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingCbse ? (
                <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : cbseEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No CBSE curriculum entries added yet. Only the default official portal links will be shown.</p>
              ) : (
                <div className="space-y-2">
                  {cbseEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-extrabold text-sm">
                          {entry.category[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate text-sm">{entry.chapter_title}</p>
                          <p className="text-xs text-muted-foreground truncate">{entry.category}{entry.description && ` · ${entry.description}`}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8" title="Preview Entry" onClick={() => handleOpenMaterial(entry.chapter_title, entry.file_url)}>
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-foreground" title="Open directly in new tab" onClick={() => window.open(entry.file_url, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => {
                          setEditingCbseId(entry.id);
                          setCbseForm({ category: entry.category, chapter_title: entry.chapter_title, chapter_number: String(entry.chapter_number || ""), file_url: entry.file_url, description: entry.description || "", class_number: entry.class_number || "All", subject: entry.subject || "General" });
                        }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDeleteCbse(entry)} variant="ghost" size="sm" className="text-destructive h-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="review" className="space-y-6 mt-0">
          <NcertCbseReview />
        </TabsContent>
      </Tabs>

      {/* Material Viewer Popup */}
      <Dialog open={!!viewMaterial} onOpenChange={() => setViewMaterial(null)}>
        <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex items-start gap-2 text-base font-bold text-foreground">
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="leading-snug text-left">{viewMaterial?.title}</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                {viewMaterial?.url?.toLowerCase().includes('.pdf') && (
                  <Button asChild variant="outline" size="sm" className="h-8 shrink-0">
                    <a href={viewMaterial.url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 sm:mr-2" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </Button>
                )}
                {viewMaterial?.url && (
                  <Button asChild size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0">
                    <a href={viewMaterial.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span>{isGoogleDriveUrl(viewMaterial.url) ? "Open in Drive" : "Open Directly"}</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {isGoogleDriveUrl(viewMaterial?.url || "") && (
              <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 p-2 rounded-lg mt-2 text-left font-medium leading-normal">
                ⚠️ If the Google Drive preview below is blank or asks for permissions, click the <strong>Open in Drive</strong> button above to view it directly in Google Drive.
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 bg-muted/10 w-full h-full relative">
            {viewMaterial && (
              isGoogleDriveFolder(viewMaterial.url) ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <ExternalLink className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">Google Drive Folder</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Google Drive folders cannot be embedded in a preview frame. Click below to open and browse the folder directly in Google Drive.
                    </p>
                  </div>
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    <a href={viewMaterial.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Folder in Google Drive
                    </a>
                  </Button>
                </div>
              ) : (
                <iframe
                  src={formatGoogleDriveUrl(viewMaterial.url)}
                  className="w-full h-full border-0 absolute inset-0"
                  title={viewMaterial.title}
                  allow="autoplay; encrypted-media; fullscreen"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyMaterialsManager;
