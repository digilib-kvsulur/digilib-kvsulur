import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  Plus,
  Trash2,
  Search,
  LayoutTemplate,
  Save,
  Download,
  Printer,
  Eye,
  Upload,
  Sparkles,
  Users,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Copy,
  Sliders,
  Palette,
  CheckSquare,
  Square,
  Type,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  generateCertificatePdf,
  printCertificateDirect,
  type CertificateRenderData,
} from "@/components/certificates/certificateGenerator";
import {
  fetchCertificateTemplateUrl,
  saveCertificateTemplateUrl,
  fetchCertificateLayout,
  saveCertificateLayout,
  fetchCertificateCommonText,
  saveCertificateCommonText,
  DEFAULT_CERTIFICATE_LAYOUT,
  type CertificateLayout,
  type CertFieldLayout,
} from "@/lib/librarySettings";
import CertificateCanvas, {
  CERT_FIELD_LABELS,
  type CertFieldKey,
} from "@/components/certificates/CertificateCanvas";
import {
  BUILTIN_TEMPLATES,
  OFFICIAL_KV_TEMPLATE_URL,
  OFFICIAL_KV_LAYOUT,
} from "@/components/certificates/BuiltinTemplates";

interface CertificateRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  template_url: string | null;
  issued_at: string;
  event_id?: string | null;
  certificate_no?: string | null;
  name_hindi?: string | null;
  class_hindi?: string | null;
  event_hindi?: string | null;
  title_hindi?: string | null;
  during_text?: string | null;
  common_text?: string | null;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    hindi_name?: string | null;
    admission_number: string | null;
    student_class: string | null;
  };
}

const AWARD_PRESETS = [
  { label: "🥇 1st Position", titleEng: "First Position", titleHin: "प्रथम स्थान" },
  { label: "🥈 2nd Position", titleEng: "Second Position", titleHin: "द्वितीय स्थान" },
  { label: "🥉 3rd Position", titleEng: "Third Position", titleHin: "तृतीय स्थान" },
  { label: "🎖️ Certificate of Merit", titleEng: "Certificate of Merit", titleHin: "योग्यता प्रमाण-पत्र" },
  { label: "🌟 Star Reader", titleEng: "Star Reader of the Month", titleHin: "माह का श्रेष्ठ पाठक" },
  { label: "📚 Book Reviewer", titleEng: "Best Book Reviewer", titleHin: "पुस्तक समीक्षा पुरस्कार" },
  { label: "💡 Quiz Master", titleEng: "Library Quiz Master", titleHin: "प्रश्नोत्तरी विजेता" },
  { label: "🤝 Volunteer", titleEng: "Library Volunteer", titleHin: "पुस्तकालय स्वयंसेवक" },
  { label: "📜 Participation", titleEng: "Certificate of Participation", titleHin: "सहभागिता प्रमाण-पत्र" },
];

const COLOR_SWATCHES = [
  { label: "KV Navy", value: "#1e3a8a" },
  { label: "Crimson Red", value: "#b91c1c" },
  { label: "Royal Gold", value: "#b45309" },
  { label: "Emerald Green", value: "#047857" },
  { label: "Dark Charcoal", value: "#0f172a" },
  { label: "Deep Purple", value: "#6b21a8" },
];

function generateCertNo(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KVS-LIB-2026-${rand}`;
}

export default function CertificateManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [templateUrl, setTemplateUrl] = useState<string>(OFFICIAL_KV_TEMPLATE_URL);
  const [layout, setLayout] = useState<CertificateLayout>(DEFAULT_CERTIFICATE_LAYOUT);
  const [commonText, setCommonText] = useState<string>("");
  const [selectedField, setSelectedField] = useState<CertFieldKey>("nameHindi");
  const [savingLayout, setSavingLayout] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Issuing Dialog State
  const [issuing, setIssuing] = useState(false);
  const [issueMode, setIssueMode] = useState<"single" | "class" | "multi">("single");
  const [issueSearch, setIssueSearch] = useState("");
  const [issueClassFilter, setIssueClassFilter] = useState("all");
  const [targetClass, setTargetClass] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Bilingual Form State
  const [form, setForm] = useState({
    user_id: "",
    title: "First Position",
    title_hindi: "प्रथम स्थान",
    name_hindi: "",
    event_id: "",
    event_name: "",
    event_hindi: "",
    during_text: "वर्ष 2026-2027 / Year 2026-2027",
    description: "For outstanding performance in library activities.",
    certificate_no: generateCertNo(),
    issued_at: new Date().toISOString().slice(0, 10),
  });

  // Preview & Download Modal
  const [previewCert, setPreviewCert] = useState<CertificateRow | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: certs }, tpl, lay, commText] = await Promise.all([
        supabase.from("issued_certificates").select("*").order("issued_at", { ascending: false }),
        fetchCertificateTemplateUrl(),
        fetchCertificateLayout(),
        fetchCertificateCommonText(),
      ]);
      setTemplateUrl(tpl || OFFICIAL_KV_TEMPLATE_URL);
      setLayout(lay);
      setCommonText(commText);
      const list = (certs as any[]) || [];
      const userIds = Array.from(new Set(list.map((c) => c.user_id)));
      let profileMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, hindi_name, admission_number, student_class")
          .in("id", userIds);
        (profs || []).forEach((p) => {
          profileMap[p.id] = p;
        });
      }
      setRows(list.map((c) => ({ ...c, profiles: profileMap[c.user_id] })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openIssueDialog = async () => {
    setForm({
      user_id: "",
      title: "First Position",
      title_hindi: "प्रथम स्थान",
      name_hindi: "",
      event_id: "",
      event_name: "",
      event_hindi: "",
      during_text: "वर्ष 2026-2027 / Year 2026-2027",
      description: "For outstanding performance in library activities.",
      certificate_no: generateCertNo(),
      issued_at: new Date().toISOString().slice(0, 10),
    });
    setIssueMode("single");
    setIssueSearch("");
    setIssueClassFilter("all");
    setTargetClass("");
    setSelectedStudentIds([]);

    const [{ data: studs }, { data: evts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, hindi_name, admission_number, student_class")
        .eq("role", "student")
        .eq("is_approved", true)
        .order("student_class", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(2000),
      supabase.from("library_events").select("id, title").order("event_date", { ascending: false }).limit(50),
    ]);
    setStudents(studs || []);
    setEvents(evts || []);
    setOpen(true);
  };

  // Available classes for filtering
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.student_class) set.add(s.student_class.trim());
    });
    rows.forEach((r) => {
      if (r.profiles?.student_class) set.add(r.profiles.student_class.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, rows]);

  // Filter students for Issue Dialog with instant search
  const filteredIssueStudents = useMemo(() => {
    const q = issueSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (issueClassFilter !== "all" && s.student_class !== issueClassFilter) return false;
      if (!q) return true;
      const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
      const hindiName = (s.hindi_name || "").toLowerCase();
      const adm = (s.admission_number || "").toLowerCase();
      const cls = (s.student_class || "").toLowerCase();
      return name.includes(q) || hindiName.includes(q) || adm.includes(q) || cls.includes(q);
    });
  }, [students, issueSearch, issueClassFilter]);

  // Main table filtered rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (classFilter !== "all" && r.profiles?.student_class !== classFilter) return false;
      if (!q) return true;
      const name = `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.toLowerCase();
      const hindiName = (r.name_hindi || r.profiles?.hindi_name || "").toLowerCase();
      return (
        name.includes(q) ||
        hindiName.includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.title_hindi || "").toLowerCase().includes(q) ||
        (r.certificate_no || "").toLowerCase().includes(q) ||
        (r.profiles?.admission_number || "").toLowerCase().includes(q) ||
        (r.profiles?.student_class || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, classFilter]);

  // Selected student details for live preview
  const selectedStudent = useMemo(() => {
    if (!form.user_id) return null;
    return students.find((s) => s.id === form.user_id) || null;
  }, [students, form.user_id]);

  const selectedEvent = useMemo(() => {
    if (!form.event_id) return null;
    return events.find((e) => e.id === form.event_id) || null;
  }, [events, form.event_id]);

  // Pick a single student and sync name & Hindi name
  const handleSelectSingleStudent = (s: any) => {
    setForm((prev) => ({
      ...prev,
      user_id: s.id,
      name_hindi: s.hindi_name || prev.name_hindi,
    }));
  };

  // Toggle multi-select student
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredIssueStudents.map((s) => s.id);
    setSelectedStudentIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const applyPreset = (preset: typeof AWARD_PRESETS[0]) => {
    setForm((prev) => ({
      ...prev,
      title: preset.titleEng,
      title_hindi: preset.titleHin,
    }));
  };

  const handleIssue = async () => {
    let targetStudents: any[] = [];
    if (issueMode === "single") {
      if (!form.user_id) {
        toast({ title: "Select a student", description: "Please pick a student to award.", variant: "destructive" });
        return;
      }
      targetStudents = students.filter((s) => s.id === form.user_id);
    } else if (issueMode === "class") {
      if (!targetClass) {
        toast({ title: "Select a class", description: "Please pick a class for batch issuance.", variant: "destructive" });
        return;
      }
      targetStudents = students.filter((s) => s.student_class === targetClass);
    } else {
      if (selectedStudentIds.length === 0) {
        toast({ title: "No students selected", description: "Please check at least one student.", variant: "destructive" });
        return;
      }
      targetStudents = students.filter((s) => selectedStudentIds.includes(s.id));
    }

    if (targetStudents.length === 0) {
      toast({ title: "No recipients found", description: "No approved students matched the selection.", variant: "destructive" });
      return;
    }

    setIssuing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // If single student and custom hindi_name provided, update profile
      if (issueMode === "single" && form.name_hindi.trim() && selectedStudent) {
        await supabase
          .from("profiles")
          .update({ hindi_name: form.name_hindi.trim() })
          .eq("id", selectedStudent.id);
      }

      const inserts = targetStudents.map((s, idx) => ({
        user_id: s.id,
        title: form.title.trim(),
        title_hindi: form.title_hindi.trim() || null,
        name_hindi: issueMode === "single" ? (form.name_hindi.trim() || s.hindi_name || null) : (s.hindi_name || null),
        class_hindi: s.student_class || null,
        event_id: form.event_id || null,
        event_hindi: form.event_hindi.trim() || (selectedEvent ? selectedEvent.title : null),
        during_text: form.during_text.trim() || null,
        common_text: commonText.trim() || null,
        description: form.description.trim() || null,
        template_url: templateUrl,
        issued_by: user?.id || null,
        issued_at: new Date(form.issued_at).toISOString(),
        certificate_no: `${form.certificate_no.replace(/-\d+$/, "")}-${String(idx + 1).padStart(4, "0")}`,
      }));

      const { error } = await supabase.from("issued_certificates").insert(inserts);
      if (error) throw error;

      // Send notifications
      const notifs = targetStudents.map((s) => ({
        target_user_id: s.id,
        sent_by: user?.id || s.id,
        title: "🏆 Certificate Awarded!",
        message: `You have been awarded: "${form.title.trim()} / ${form.title_hindi.trim()}". View & download it now!`,
        type: "success",
      }));
      await supabase.from("notifications").insert(notifs);

      toast({
        title: "Certificates Issued! 🎉",
        description: `Successfully awarded to ${targetStudents.length} student${targetStudents.length > 1 ? "s" : ""}.`,
      });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Issuing Failed", description: e.message, variant: "destructive" });
    } finally {
      setIssuing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this certificate record?")) return;
    const { error } = await supabase.from("issued_certificates").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      load();
    }
  };

  // Upload Custom Certificate Template
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    setUploadingTemplate(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `templates/custom-cert-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("certificates").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      let publicUrl = "";
      if (uploadError) {
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } else {
        const { data } = supabase.storage.from("certificates").getPublicUrl(path);
        publicUrl = data.publicUrl;
      }

      setTemplateUrl(publicUrl);
      await saveCertificateTemplateUrl(publicUrl);
      toast({ title: "Template updated! 🎨", description: "Custom design is now active." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingTemplate(false);
      e.target.value = "";
    }
  };

  const selectPresetTemplate = async (tpl: (typeof BUILTIN_TEMPLATES)[0]) => {
    setTemplateUrl(tpl.previewUrl);
    if (tpl.isOfficial) {
      setLayout(OFFICIAL_KV_LAYOUT);
      await saveCertificateLayout(OFFICIAL_KV_LAYOUT);
    }
    await saveCertificateTemplateUrl(tpl.previewUrl);
    toast({ title: `Selected "${tpl.name}"` });
  };

  // Layout Designer
  const updateField = (key: CertFieldKey, patch: Partial<CertFieldLayout>) => {
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const moveField = (key: CertFieldKey, x: number, y: number) => {
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], x, y } }));
  };

  const handleSaveLayout = async () => {
    setSavingLayout(true);
    try {
      await Promise.all([
        saveCertificateLayout(layout),
        saveCertificateCommonText(commonText),
      ]);
      toast({ title: "Layout & Common Text Saved! ✨" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingLayout(false);
    }
  };

  const resetToOfficialKvLayout = async () => {
    setLayout(OFFICIAL_KV_LAYOUT);
    setTemplateUrl(OFFICIAL_KV_TEMPLATE_URL);
    await Promise.all([
      saveCertificateLayout(OFFICIAL_KV_LAYOUT),
      saveCertificateTemplateUrl(OFFICIAL_KV_TEMPLATE_URL),
    ]);
    toast({ title: "Reset Complete", description: "Bilingual KV Sulur template restored." });
  };

  const getCertRenderData = (cert: CertificateRow): CertificateRenderData => ({
    studentName: `${cert.profiles?.first_name || ""} ${cert.profiles?.last_name || ""}`.trim() || "Student",
    nameHindi: cert.name_hindi || cert.profiles?.hindi_name || null,
    studentClass: cert.profiles?.student_class || null,
    classHindi: cert.class_hindi || cert.profiles?.student_class || null,
    eventName: cert.event_id ? events.find((e) => e.id === cert.event_id)?.title : null,
    eventHindi: cert.event_hindi || null,
    during: cert.during_text || null,
    title: cert.title,
    titleHindi: cert.title_hindi || null,
    commonText: cert.common_text || commonText || null,
    description: cert.description || null,
    issuedAt: cert.issued_at,
    templateUrl: cert.template_url || templateUrl,
    certNumber: cert.certificate_no,
  });

  // Download High-Resolution PDF
  const downloadPdf = async (cert: CertificateRow) => {
    setGeneratingPdf(true);
    try {
      const data = getCertRenderData(cert);
      await generateCertificatePdf(
        data,
        layout,
        `${(cert.profiles?.first_name || "Student").replace(/\s+/g, "_")}_${(cert.title || "Certificate").replace(/\s+/g, "_")}.pdf`
      );
      toast({ title: "PDF Exported! 📄", description: "2K Print Resolution Generated" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintAdmin = async (cert: CertificateRow) => {
    try {
      const data = getCertRenderData(cert);
      await printCertificateDirect(data, layout);
    } catch {
      window.print();
    }
  };

  const selectedLayoutField = layout[selectedField] || {
    x: 50,
    y: 50,
    fontSize: 15,
    visible: true,
    align: "center" as const,
    color: "#0f172a",
    bold: true,
    fontFamily: "sans" as const,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-4 rounded-xl border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
            <Award className="h-7 w-7 text-amber-500" /> Certificate Management & Studio
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bilingual certificate issuance, batch awarding, custom plain text, and layout customizer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openIssueDialog} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Issue Certificate
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-amber-200/60 bg-amber-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Awarded</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{rows.length}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-200/60 bg-blue-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Students Honored</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{new Set(rows.map((r) => r.user_id)).size}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-200/60 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bilingual Support</p>
              <p className="text-sm font-bold text-emerald-700 mt-1">English + हिंदी</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Type className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-purple-200/60 bg-purple-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Design</p>
              <p className="text-xs font-semibold text-purple-700 mt-1.5 truncate max-w-[140px]">
                {templateUrl === OFFICIAL_KV_TEMPLATE_URL ? "KV Sulur Official" : "Custom / Preset"}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="issued" className="space-y-4">
        <TabsList className="bg-muted/80 p-1">
          <TabsTrigger value="issued" className="gap-2">
            <Award className="h-4 w-4" /> Issued Certificates ({rows.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Palette className="h-4 w-4" /> Template Studio
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-2">
            <LayoutTemplate className="h-4 w-4" /> Bilingual Layout & Plain Text
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Issued Certificates List */}
        <TabsContent value="issued" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">Issued Certificates</CardTitle>
                  <CardDescription>Search and filter by English/Hindi names, admission number, or class.</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9 text-xs"
                      placeholder="Search English / Hindi name, class, ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="h-9 w-32 text-xs">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {availableClasses.map((c) => (
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRows.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg">
                  <Award className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="font-medium text-sm text-foreground">No certificates found</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Click "Issue Certificate" to reward students.</p>
                  <Button size="sm" onClick={openIssueDialog}>
                    <Plus className="h-4 w-4 mr-1.5" /> Issue Certificate
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRows.map((r) => (
                    <Card key={r.id} className="hover:border-primary/40 transition-colors border shadow-sm">
                      <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-foreground">
                                {r.profiles?.first_name} {r.profiles?.last_name || ""}
                              </p>
                              {(r.name_hindi || r.profiles?.hindi_name) && (
                                <Badge variant="secondary" className="text-[11px] font-normal text-primary">
                                  {r.name_hindi || r.profiles?.hindi_name}
                                </Badge>
                              )}
                              {r.profiles?.student_class && (
                                <Badge variant="outline" className="text-[10px]">
                                  Class {r.profiles.student_class}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium text-primary mt-1">
                              {r.title} {r.title_hindi ? `· ${r.title_hindi}` : ""}
                            </p>
                            {r.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                            {r.certificate_no || "ID: KV-CERT"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                          <span>Awarded {new Date(r.issued_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-primary"
                              onClick={() => setPreviewCert(r)}
                            >
                              <Eye className="h-4 w-4 mr-1" /> Preview & Print
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Template Studio */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Certificate Template Studio
                  </CardTitle>
                  <CardDescription>
                    Switch between the official KV Sulur template, vector styles, or upload your own background.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild disabled={uploadingTemplate}>
                    <label htmlFor="certUploadManager" className="cursor-pointer">
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {uploadingTemplate ? "Uploading…" : "Upload Custom Template"}
                    </label>
                  </Button>
                  <input
                    id="certUploadManager"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleTemplateUpload}
                  />
                  <Button variant="ghost" size="sm" onClick={resetToOfficialKvLayout}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset to Official KV Sulur
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BUILTIN_TEMPLATES.map((t) => {
                  const isActive = templateUrl === t.previewUrl;
                  return (
                    <Card
                      key={t.id}
                      onClick={() => selectPresetTemplate(t)}
                      className={`cursor-pointer overflow-hidden transition-all hover:shadow-md ${
                        isActive ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="relative aspect-[1.416] w-full bg-slate-100 overflow-hidden border-b">
                        <img src={t.previewUrl} alt={t.name} className="w-full h-full object-cover" />
                        {isActive && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        )}
                        {t.isOfficial && (
                          <div className="absolute top-2 left-2 bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                            OFFICIAL BILINGUAL
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Drag & Drop Layout & Plain Text Studio */}
        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" /> Bilingual Layout & Plain Text Studio
                  </CardTitle>
                  <CardDescription>
                    Calibrate positions for English lines, Hindi lines, and configure common plain text for all certificates.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={resetToOfficialKvLayout}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset to Calibrated KV Sulur
                  </Button>
                  <Button onClick={handleSaveLayout} disabled={savingLayout} size="sm">
                    <Save className="h-4 w-4 mr-1.5" /> {savingLayout ? "Saving…" : "Save Layout & Plain Text"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
              {/* Field Control Sidebar */}
              <div className="space-y-4 order-2 xl:order-1">
                {/* Common Plain Text Section */}
                <div className="rounded-xl border p-3.5 bg-amber-500/5 space-y-2 border-amber-200">
                  <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Plain Text (Common for All Certificates)
                  </Label>
                  <Input
                    value={commonText}
                    onChange={(e) => setCommonText(e.target.value)}
                    placeholder="e.g. During Library Reading Month / पठन माह"
                    className="text-xs bg-white"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Show this text on all certificates:</span>
                    <label className="flex items-center gap-1 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layout.commonText.visible}
                        onChange={(e) => updateField("commonText", { visible: e.target.checked })}
                      />
                      Enable
                    </label>
                  </div>
                </div>

                {/* Field Selection List */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Fields (Drag to Reposition)</Label>
                  <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
                    {CERT_FIELD_LABELS.map(({ key, label, group }) => {
                      const active = selectedField === key;
                      const fieldCfg = layout[key] || { visible: false };
                      const shown = fieldCfg.visible;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedField(key)}
                          className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                            active ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted/60"
                          } ${!shown ? "opacity-40" : ""}`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[10px] px-1 py-0.2 rounded bg-muted font-mono">{group}</span>
                            <span className="truncate">{label}</span>
                          </div>
                          <label
                            className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={shown}
                              onChange={(e) => updateField(key, { visible: e.target.checked })}
                            />
                            Show
                          </label>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Field Customizer Box */}
                <div className="rounded-xl border bg-muted/30 p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <p className="text-xs font-bold text-foreground truncate max-w-[200px]">
                      {CERT_FIELD_LABELS.find((f) => f.key === selectedField)?.label}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedLayoutField.x.toFixed(0)}% × {selectedLayoutField.y.toFixed(0)}%
                    </Badge>
                  </div>

                  {/* Font Color Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.value}
                          type="button"
                          onClick={() => updateField(selectedField, { color: swatch.value })}
                          className={`h-6 w-6 rounded-full border-2 transition-transform ${
                            selectedLayoutField.color === swatch.value ? "scale-110 border-primary" : "border-transparent"
                          }`}
                          style={{ backgroundColor: swatch.value }}
                          title={swatch.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedLayoutField.color || "#0f172a"}
                        onChange={(e) => updateField(selectedField, { color: e.target.value })}
                        className="h-6 w-7 rounded cursor-pointer border p-0"
                        title="Custom Color"
                      />
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Font Family</Label>
                    <Select
                      value={selectedLayoutField.fontFamily || "sans"}
                      onValueChange={(v) => updateField(selectedField, { fontFamily: v as any })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sans">Modern Sans (Clean)</SelectItem>
                        <SelectItem value="serif">Formal Serif (Academic / देवनागरी)</SelectItem>
                        <SelectItem value="display">Cinzel Display</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font Size Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <Label className="text-xs">Font Size</Label>
                      <span className="font-mono text-muted-foreground">{selectedLayoutField.fontSize}px</span>
                    </div>
                    <Input
                      type="range"
                      min={10}
                      max={36}
                      value={selectedLayoutField.fontSize}
                      onChange={(e) => updateField(selectedField, { fontSize: Number(e.target.value) || 14 })}
                      className="h-6 p-0"
                    />
                  </div>

                  {/* Bold & Align */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Weight</Label>
                      <Button
                        type="button"
                        variant={selectedLayoutField.bold ? "secondary" : "outline"}
                        size="sm"
                        className="w-full h-8 text-xs font-bold"
                        onClick={() => updateField(selectedField, { bold: !selectedLayoutField.bold })}
                      >
                        {selectedLayoutField.bold ? "Bold" : "Normal"}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alignment</Label>
                      <Select
                        value={selectedLayoutField.align}
                        onValueChange={(v) => updateField(selectedField, { align: v as any })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveLayout} disabled={savingLayout} className="w-full shadow">
                  <Save className="h-4 w-4 mr-2" /> {savingLayout ? "Saving…" : "Save Layout & Plain Text"}
                </Button>
              </div>

              {/* Interactive Preview Canvas */}
              <div className="space-y-2 order-1 xl:order-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Interactive Certificate Canvas
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Click and drag fields onto blanks</p>
                </div>
                <div className="shadow-lg rounded-xl overflow-hidden border">
                  <CertificateCanvas
                    editable
                    layout={layout}
                    selectedField={selectedField}
                    onSelectField={setSelectedField}
                    onMoveField={moveField}
                    data={{
                      studentName: "Aarav Sharma",
                      nameHindi: "आरव शर्मा",
                      studentClass: "8-A",
                      classHindi: "8-A",
                      eventName: "National Reading Month Competition",
                      eventHindi: "राष्ट्रीय पठन माह प्रतियोगिता",
                      during: "वर्ष 2026-2027",
                      title: "First Position",
                      titleHindi: "प्रथम स्थान",
                      commonText: commonText || "PM SHRI KV AFS SULUR LIBRARY",
                      description: "For securing top position in library reading activities",
                      issuedAt: new Date().toISOString(),
                      templateUrl,
                      certNumber: "KVS-LIB-2026-0042",
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Issuing Modal with Search & Bulk Issuance */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-amber-500" /> Issue Bilingual Certificate
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode Switcher: 3 Modes */}
            <div className="grid grid-cols-3 gap-2 bg-muted p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                className={`py-1.5 rounded-md transition-all ${
                  issueMode === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIssueMode("single")}
              >
                1. Single Student
              </button>
              <button
                type="button"
                className={`py-1.5 rounded-md transition-all ${
                  issueMode === "class" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIssueMode("class")}
              >
                2. Entire Class
              </button>
              <button
                type="button"
                className={`py-1.5 rounded-md transition-all ${
                  issueMode === "multi" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIssueMode("multi")}
              >
                3. Multi-Select Students ({selectedStudentIds.length})
              </button>
            </div>

            {/* Recipient Selection with Live Search */}
            {issueMode === "class" ? (
              <div className="space-y-1.5">
                <Label>Select Class for Batch Award *</Label>
                <Select value={targetClass} onValueChange={setTargetClass}>
                  <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((c) => {
                      const count = students.filter((s) => s.student_class === c).length;
                      return (
                        <SelectItem key={c} value={c}>
                          Class {c} ({count} approved students)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">
                    {issueMode === "single" ? "Search & Select Student *" : "Select Students to Award (Multi-Select) *"}
                  </Label>
                  {issueMode === "multi" && (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleSelectAllFiltered}>
                        Select All Filtered ({filteredIssueStudents.length})
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={handleClearSelection}>
                        Clear ({selectedStudentIds.length})
                      </Button>
                    </div>
                  )}
                </div>

                {/* Search Bar & Class Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9 text-xs"
                      placeholder="Type student name, admission no, roll no…"
                      value={issueSearch}
                      onChange={(e) => setIssueSearch(e.target.value)}
                    />
                  </div>
                  <Select value={issueClassFilter} onValueChange={setIssueClassFilter}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {availableClasses.map((c) => (
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Student Results List */}
                <div className="max-h-48 overflow-y-auto border rounded-lg bg-background divide-y">
                  {filteredIssueStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">No students match your search.</div>
                  ) : (
                    filteredIssueStudents.map((s) => {
                      const isSelected =
                        issueMode === "single"
                          ? form.user_id === s.id
                          : selectedStudentIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (issueMode === "single") handleSelectSingleStudent(s);
                            else toggleStudentSelection(s.id);
                          }}
                          className={`p-2 px-3 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/50 transition-colors ${
                            isSelected ? "bg-primary/10 font-semibold" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {issueMode === "multi" ? (
                              isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <div className={`h-3 w-3 rounded-full border ${isSelected ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                            )}
                            <div>
                              <span>{s.first_name} {s.last_name || ""}</span>
                              {s.hindi_name && (
                                <span className="ml-1.5 text-primary text-[11px]">({s.hindi_name})</span>
                              )}
                              {s.admission_number && (
                                <span className="ml-1.5 text-muted-foreground font-mono text-[10px]">[{s.admission_number}]</span>
                              )}
                            </div>
                          </div>
                          {s.student_class && (
                            <Badge variant="outline" className="text-[10px]">Class {s.student_class}</Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* If single student selected, allow editing Hindi Name right here */}
                {issueMode === "single" && selectedStudent && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">English Name</Label>
                      <Input
                        disabled
                        value={`${selectedStudent.first_name} ${selectedStudent.last_name || ""}`}
                        className="h-8 text-xs bg-muted/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-primary font-semibold">छात्र का नाम (Hindi Name) *</Label>
                      <Input
                        value={form.name_hindi}
                        onChange={(e) => setForm((f) => ({ ...f, name_hindi: e.target.value }))}
                        placeholder="e.g. आरव शर्मा"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Award Preset Chips */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold">Quick Award Presets (Sets English & Hindi)</Label>
              <div className="flex flex-wrap gap-1.5">
                {AWARD_PRESETS.map((preset) => (
                  <button
                    key={preset.titleEng}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      form.title === preset.titleEng
                        ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bilingual Titles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Position / Title (English) *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. First Position"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-primary font-semibold">स्थान / उपाधि (Hindi Title) *</Label>
                <Input
                  value={form.title_hindi}
                  onChange={(e) => setForm((f) => ({ ...f, title_hindi: e.target.value }))}
                  placeholder="e.g. प्रथम स्थान"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Bilingual Events */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Event / Competition (English)</Label>
                <Select
                  value={form.event_id || "none"}
                  onValueChange={(v) => {
                    const evt = events.find((e) => e.id === v);
                    setForm((f) => ({
                      ...f,
                      event_id: v === "none" ? "" : v,
                      event_name: evt ? evt.title : "",
                    }));
                  }}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Link event" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / No Event</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">प्रतियोगिता का नाम (Hindi Event)</Label>
                <Input
                  value={form.event_hindi}
                  onChange={(e) => setForm((f) => ({ ...f, event_hindi: e.target.value }))}
                  placeholder="e.g. राष्ट्रीय पठन माह प्रतियोगिता"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* During Period & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">During Period (Line 6)</Label>
                <Input
                  value={form.during_text}
                  onChange={(e) => setForm((f) => ({ ...f, during_text: e.target.value }))}
                  placeholder="e.g. August 2026"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Certificate ID Ref</Label>
                <Input
                  value={form.certificate_no}
                  onChange={(e) => setForm((f) => ({ ...f, certificate_no: e.target.value }))}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date (दिनांक)</Label>
                <Input
                  type="date"
                  value={form.issued_at}
                  onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description / Remarks (Optional)</Label>
              <Textarea
                rows={1}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="For outstanding participation in reading..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssue} disabled={issuing}>
              {issuing
                ? "Issuing Certificates…"
                : issueMode === "single"
                ? "Issue Certificate"
                : issueMode === "class"
                ? `Batch Issue to Class ${targetClass}`
                : `Batch Issue to (${selectedStudentIds.length}) Students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview & Print Modal */}
      <Dialog open={!!previewCert} onOpenChange={(o) => !o && setPreviewCert(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" /> Certificate Preview
              </span>
              {previewCert?.certificate_no && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {previewCert.certificate_no}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewCert && (
            <div className="space-y-4">
              <div className="shadow-lg rounded-xl overflow-hidden border bg-white">
                <CertificateCanvas
                  canvasRef={previewCanvasRef}
                  layout={layout}
                  data={{
                    studentName: `${previewCert.profiles?.first_name || ""} ${previewCert.profiles?.last_name || ""}`.trim() || "Student",
                    nameHindi: previewCert.name_hindi || previewCert.profiles?.hindi_name,
                    studentClass: previewCert.profiles?.student_class,
                    classHindi: previewCert.class_hindi || previewCert.profiles?.student_class,
                    eventName: previewCert.event_id ? events.find((e) => e.id === previewCert.event_id)?.title : null,
                    eventHindi: previewCert.event_hindi,
                    during: previewCert.during_text,
                    title: previewCert.title,
                    titleHindi: previewCert.title_hindi,
                    commonText: previewCert.common_text || commonText,
                    description: previewCert.description,
                    issuedAt: previewCert.issued_at,
                    templateUrl: previewCert.template_url || templateUrl,
                    certNumber: previewCert.certificate_no,
                  }}
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Awarded to: <strong className="text-foreground">{previewCert.profiles?.first_name} {previewCert.profiles?.last_name || ""}</strong>
                  {previewCert.name_hindi || previewCert.profiles?.hindi_name ? ` (${previewCert.name_hindi || previewCert.profiles?.hindi_name})` : ""}
                  {previewCert.profiles?.student_class ? ` · Class ${previewCert.profiles.student_class}` : ""}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (previewCert.certificate_no) {
                        navigator.clipboard.writeText(previewCert.certificate_no);
                        toast({ title: "Copied!", description: "Certificate ID copied." });
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1.5" /> Copy ID
                  </Button>
                  <Button variant="outline" onClick={() => handlePrintAdmin(previewCert)}>
                    <Printer className="h-4 w-4 mr-1.5" /> Print
                  </Button>
                  <Button onClick={() => downloadPdf(previewCert)} disabled={generatingPdf}>
                    <Download className="h-4 w-4 mr-1.5" /> {generatingPdf ? "Exporting PDF…" : "Download PDF"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


