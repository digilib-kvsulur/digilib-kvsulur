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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  fetchCertificateTemplateUrl,
  saveCertificateTemplateUrl,
  fetchCertificateLayout,
  saveCertificateLayout,
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
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    admission_number: string | null;
    student_class: string | null;
  };
}

const AWARD_PRESETS = [
  { label: "🥇 First Position (प्रथम)", title: "First Position / प्रथम स्थान" },
  { label: "🥈 Second Position (द्वितीय)", title: "Second Position / द्वितीय स्थान" },
  { label: "🥉 Third Position (तृतीय)", title: "Third Position / तृतीय स्थान" },
  { label: "🎖️ Certificate of Merit", title: "Certificate of Merit / योग्यता प्रमाण-पत्र" },
  { label: "🌟 Star Reader of the Month", title: "Star Reader of the Month / माह का श्रेष्ठ पाठक" },
  { label: "📚 Book Review Champion", title: "Best Book Reviewer / पुस्तक समीक्षा पुरस्कार" },
  { label: "💡 Quiz Top Scorer", title: "Library Quiz Master / प्रश्नोत्तरी विजेता" },
  { label: "🤝 Library Volunteer", title: "Library Volunteer / पुस्तकालय स्वयंसेवक" },
  { label: "📜 Participation Award", title: "Certificate of Participation / सहभागिता प्रमाण-पत्र" },
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
  const [selectedField, setSelectedField] = useState<CertFieldKey>("name");
  const [savingLayout, setSavingLayout] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Issuing Form State
  const [issuing, setIssuing] = useState(false);
  const [issueMode, setIssueMode] = useState<"single" | "class">("single");
  const [targetClass, setTargetClass] = useState("");
  const [form, setForm] = useState({
    user_id: "",
    title: "First Position / प्रथम स्थान",
    description: "For outstanding achievement in the library competition.",
    event_id: "",
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
      const [{ data: certs }, tpl, lay] = await Promise.all([
        supabase.from("issued_certificates").select("*").order("issued_at", { ascending: false }),
        fetchCertificateTemplateUrl(),
        fetchCertificateLayout(),
      ]);
      setTemplateUrl(tpl || OFFICIAL_KV_TEMPLATE_URL);
      setLayout(lay);
      const list = (certs as any[]) || [];
      const userIds = Array.from(new Set(list.map((c) => c.user_id)));
      let profileMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, admission_number, student_class")
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
      title: "First Position / प्रथम स्थान",
      description: "For outstanding achievement in the library competition.",
      event_id: "",
      certificate_no: generateCertNo(),
      issued_at: new Date().toISOString().slice(0, 10),
    });
    setIssueMode("single");
    setTargetClass("");

    const [{ data: studs }, { data: evts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, admission_number, student_class")
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

  // Available classes for filtering and batch issuing
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

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (targetClass && s.student_class !== targetClass) return false;
        if (!q) return true;
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        return (
          name.includes(q) ||
          (s.admission_number || "").toLowerCase().includes(q) ||
          (s.student_class || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 100);
  }, [students, search, targetClass]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (classFilter !== "all" && r.profiles?.student_class !== classFilter) return false;
      if (!q) return true;
      const name = `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.certificate_no || "").toLowerCase().includes(q) ||
        (r.profiles?.admission_number || "").toLowerCase().includes(q) ||
        (r.profiles?.student_class || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, classFilter]);

  // Selected student details for live preview in dialog
  const selectedStudent = useMemo(() => {
    if (!form.user_id) return null;
    return students.find((s) => s.id === form.user_id) || null;
  }, [students, form.user_id]);

  const selectedEvent = useMemo(() => {
    if (!form.event_id) return null;
    return events.find((e) => e.id === form.event_id) || null;
  }, [events, form.event_id]);

  const handleIssue = async () => {
    if (issueMode === "single" && !form.user_id) {
      toast({ title: "Student required", description: "Please select a student.", variant: "destructive" });
      return;
    }
    if (issueMode === "class" && !targetClass) {
      toast({ title: "Class required", description: "Please select a class for batch issuance.", variant: "destructive" });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "Title required", description: "Please enter a certificate title or select a preset.", variant: "destructive" });
      return;
    }

    setIssuing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const targetStudents =
        issueMode === "single"
          ? students.filter((s) => s.id === form.user_id)
          : students.filter((s) => s.student_class === targetClass);

      if (targetStudents.length === 0) {
        toast({ title: "No students found", description: "No approved students in selected class.", variant: "destructive" });
        return;
      }

      const inserts = targetStudents.map((s, idx) => ({
        user_id: s.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_id: form.event_id || null,
        template_url: templateUrl,
        issued_by: user?.id || null,
        issued_at: new Date(form.issued_at).toISOString(),
        certificate_no: `${form.certificate_no.replace(/-\d+$/, "")}-${String(idx + 1).padStart(4, "0")}`,
      }));

      const { error } = await supabase.from("issued_certificates").insert(inserts);
      if (error) throw error;

      // Dispatch notifications in bulk
      const notifications = targetStudents.map((s) => ({
        target_user_id: s.id,
        sent_by: user?.id || s.id,
        title: "🏆 Certificate Awarded!",
        message: `You received: "${form.title.trim()}". View and download it on your dashboard!`,
        type: "success",
      }));
      await supabase.from("notifications").insert(notifications);

      toast({
        title: "Certificates issued! 🎉",
        description: `Successfully awarded to ${targetStudents.length} student${targetStudents.length > 1 ? "s" : ""}.`,
      });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Failed to issue", description: e.message, variant: "destructive" });
    } finally {
      setIssuing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this issued certificate?")) return;
    const { error } = await supabase.from("issued_certificates").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Certificate deleted" });
      load();
    }
  };

  // Upload Custom Certificate Template
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image (PNG, JPG, WebP).", variant: "destructive" });
      return;
    }
    setUploadingTemplate(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `templates/custom-cert-${Date.now()}.${ext}`;

      // Upload to storage bucket 'certificates'
      const { error: uploadError } = await supabase.storage.from("certificates").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      let publicUrl = "";
      if (uploadError) {
        console.warn("Storage upload warning, using local data URL fallback:", uploadError);
        // Fallback: Read as base64 data URL so user isn't stuck
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
      toast({ title: "Template updated! 🎨", description: "New certificate design is now active." });
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
    toast({ title: `Selected "${tpl.name}"`, description: "Certificate template applied." });
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
      await saveCertificateLayout(layout);
      toast({ title: "Layout saved! ✨", description: "Field coordinates and styles updated." });
    } catch (e: any) {
      toast({ title: "Error saving layout", description: e.message, variant: "destructive" });
    } finally {
      setSavingLayout(false);
    }
  };

  const resetToOfficialKvLayout = async () => {
    setLayout(OFFICIAL_KV_LAYOUT);
    setTemplateUrl(OFFICIAL_KV_TEMPLATE_URL);
    await saveCertificateLayout(OFFICIAL_KV_LAYOUT);
    await saveCertificateTemplateUrl(OFFICIAL_KV_TEMPLATE_URL);
    toast({ title: "Reset Complete", description: "Restored official PM SHRI KV Sulur layout & template." });
  };

  // Download PDF
  const downloadPdf = async (cert: CertificateRow) => {
    if (!previewCanvasRef.current) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(previewCanvasRef.current, {
        scale: 3, // High DPI for crisp printing
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, "PNG", 0, 0, pageW, pageH);
      pdf.save(`${cert.profiles?.first_name || "Student"}_Certificate.pdf`);
      toast({ title: "PDF Downloaded! 📄" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Stats
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    return rows.filter((r) => {
      const d = new Date(r.issued_at);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    }).length;
  }, [rows]);

  const uniqueStudentsAwarded = useMemo(() => {
    return new Set(rows.map((r) => r.user_id)).size;
  }, [rows]);

  const selectedLayoutField = layout[selectedField] || {
    x: 50,
    y: 50,
    fontSize: 16,
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
            Issue, design, and print official merit certificates for students & reading stars.
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
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">This Month</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{thisMonthCount}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-200/60 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Students Honored</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{uniqueStudentsAwarded}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-purple-200/60 bg-purple-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Template</p>
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
            <LayoutTemplate className="h-4 w-4" /> Drag & Drop Layout
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Issued Certificates List */}
        <TabsContent value="issued" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">All Issued Certificates</CardTitle>
                  <CardDescription>Search, preview, print, or download certificates awarded to students.</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9"
                      placeholder="Search student, class, ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="h-9 w-32">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {availableClasses.map((c) => (
                        <SelectItem key={c} value={c}>
                          Class {c}
                        </SelectItem>
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
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    {search || classFilter !== "all"
                      ? "Try changing your search or filter settings."
                      : "Issue certificates to recognize student achievements in library events."}
                  </p>
                  <Button size="sm" onClick={openIssueDialog}>
                    <Plus className="h-4 w-4 mr-1.5" /> Issue First Certificate
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRows.map((r) => (
                    <Card key={r.id} className="hover:border-primary/40 transition-colors border shadow-sm">
                      <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground">
                                {r.profiles?.first_name} {r.profiles?.last_name || ""}
                              </p>
                              {r.profiles?.student_class && (
                                <Badge variant="outline" className="text-[11px] font-normal">
                                  Class {r.profiles.student_class}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-medium text-primary mt-1">{r.title}</p>
                            {r.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                            {r.certificate_no || "ID: KV-CERT"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                          <span>Issued {new Date(r.issued_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-primary"
                              onClick={() => setPreviewCert(r)}
                              title="Preview & Download"
                            >
                              <Eye className="h-4 w-4 mr-1" /> Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(r.id)}
                              title="Delete Certificate"
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
                    Select official KV Sulur template, choose built-in vector themes, or upload your own school design.
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
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset to KV Sulur Default
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Gallery Grid */}
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
                            OFFICIAL
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

              {/* Live Preview of Active Template */}
              <div className="border rounded-xl p-4 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Active Certificate Preview
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Landscape A4
                  </Badge>
                </div>
                <div className="max-w-2xl mx-auto shadow-md rounded-lg overflow-hidden">
                  <CertificateCanvas
                    layout={layout}
                    data={{
                      studentName: "Aarav Sharma",
                      studentClass: "8-A",
                      eventName: "National Reading Month 2026",
                      title: "First Position / प्रथम स्थान",
                      description: "For securing the highest points in library activities",
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

        {/* Tab 3: Drag & Drop Layout Designer */}
        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" /> Visual Layout & Typography Studio
                  </CardTitle>
                  <CardDescription>
                    Drag fields to align exactly with certificate blank lines. Adjust text colors, fonts, and sizes.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={resetToOfficialKvLayout}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-calibrate for KV Sulur
                  </Button>
                  <Button onClick={handleSaveLayout} disabled={savingLayout} size="sm">
                    <Save className="h-4 w-4 mr-1.5" /> {savingLayout ? "Saving…" : "Save Layout"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
              {/* Field Control Sidebar */}
              <div className="space-y-4 order-2 xl:order-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">Certificate Fields</Label>
                  <div className="flex flex-col gap-1">
                    {CERT_FIELD_LABELS.map(({ key, label }) => {
                      const active = selectedField === key;
                      const fieldCfg = layout[key] || { visible: false };
                      const shown = fieldCfg.visible;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedField(key)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            active ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted/60"
                          } ${!shown ? "opacity-40" : ""}`}
                        >
                          <span className="truncate">{label}</span>
                          <label
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-2 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={shown}
                              onChange={(e) => updateField(key, { visible: e.target.checked })}
                              className="rounded text-primary"
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
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {CERT_FIELD_LABELS.find((f) => f.key === selectedField)?.label}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedLayoutField.x.toFixed(0)}% × {selectedLayoutField.y.toFixed(0)}%
                    </Badge>
                  </div>

                  {/* Font Color Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Text Color</Label>
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
                    <Label className="text-xs">Typography</Label>
                    <Select
                      value={selectedLayoutField.fontFamily || "sans"}
                      onValueChange={(v) => updateField(selectedField, { fontFamily: v as any })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sans">Modern Sans (Clean)</SelectItem>
                        <SelectItem value="serif">Formal Serif (Academic)</SelectItem>
                        <SelectItem value="display">Cinzel Display (Classical)</SelectItem>
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
                        {selectedLayoutField.bold ? "Bold Text" : "Normal"}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alignment</Label>
                      <Select
                        value={selectedLayoutField.align}
                        onValueChange={(v) => updateField(selectedField, { align: v as any })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
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
                  <Save className="h-4 w-4 mr-2" /> {savingLayout ? "Saving…" : "Save Field Layout"}
                </Button>
              </div>

              {/* Interactive Preview Canvas */}
              <div className="space-y-2 order-1 xl:order-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Interactive Certificate Canvas
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Click and drag fields directly on the design</p>
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
                      studentClass: "8-A",
                      eventName: "National Reading Month 2026",
                      title: "First Position / प्रथम स्थान",
                      description: "For outstanding performance in reading and quiz",
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

      {/* Issuing Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" /> Issue Certificate of Merit
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode Switcher: Single Student vs Entire Class */}
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
              <button
                type="button"
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  issueMode === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIssueMode("single")}
              >
                Individual Student
              </button>
              <button
                type="button"
                className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                  issueMode === "class" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setIssueMode("class")}
              >
                Batch by Class ({targetClass ? `${students.filter((s) => s.student_class === targetClass).length} students` : "Select Class"})
              </button>
            </div>

            {/* Recipient Selection */}
            {issueMode === "single" ? (
              <div className="space-y-1.5">
                <Label>Select Student *</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm((f) => ({ ...f, user_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search or select student" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {filteredStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name || ""}
                        {s.student_class ? ` · Class ${s.student_class}` : ""}
                        {s.admission_number ? ` (${s.admission_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Select Class for Batch Award *</Label>
                <Select value={targetClass} onValueChange={setTargetClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class to award all students" />
                  </SelectTrigger>
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
            )}

            {/* Award Preset Chips */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quick Award Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {AWARD_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, title: preset.title }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      form.title === preset.title
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Event */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Award / Position Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. First Position / प्रथम स्थान"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Associated Event (Optional)</Label>
                <Select
                  value={form.event_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, event_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link library event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / No Event</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Certificate ID & Issue Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Certificate ID / Ref No</Label>
                <Input
                  value={form.certificate_no}
                  onChange={(e) => setForm((f) => ({ ...f, certificate_no: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Issue</Label>
                <Input
                  type="date"
                  value={form.issued_at}
                  onChange={(e) => setForm((f) => ({ ...f, issued_at: e.target.value }))}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description / Remarks (Optional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="For securing top position in reading marathon..."
              />
            </div>

            {/* Modal Live Preview */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Live Certificate Preview</p>
              <div className="max-w-md mx-auto shadow rounded overflow-hidden">
                <CertificateCanvas
                  layout={layout}
                  data={{
                    studentName: selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name || ""}` : "Student Name",
                    studentClass: selectedStudent?.student_class || targetClass || "8-A",
                    eventName: selectedEvent?.title || "Library Event",
                    title: form.title,
                    description: form.description,
                    issuedAt: form.issued_at,
                    templateUrl,
                    certNumber: form.certificate_no,
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssue} disabled={issuing}>
              {issuing ? "Issuing Certificates…" : issueMode === "single" ? "Issue Certificate" : `Batch Issue to Class ${targetClass}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview & Print / PDF Modal */}
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
                    studentClass: previewCert.profiles?.student_class,
                    eventName: previewCert.event_id ? events.find((e) => e.id === previewCert.event_id)?.title : null,
                    title: previewCert.title,
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
                  {previewCert.profiles?.student_class ? ` (Class ${previewCert.profiles.student_class})` : ""}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (previewCert.certificate_no) {
                        navigator.clipboard.writeText(previewCert.certificate_no);
                        toast({ title: "Copied!", description: "Certificate ID copied to clipboard." });
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1.5" /> Copy ID
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
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

