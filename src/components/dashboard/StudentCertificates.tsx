import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Award,
  Download,
  Printer,
  Languages,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit3,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CertificateCanvas from "@/components/certificates/CertificateCanvas";
import {
  generateCertificatePdf,
  printCertificateDirect,
  type CertificateRenderData,
} from "@/components/certificates/certificateGenerator";
import {
  DEFAULT_CERTIFICATE_LAYOUT,
  fetchCertificateLayout,
  type CertificateLayout,
} from "@/lib/librarySettings";
import { toast } from "sonner";

interface StudentCertificatesProps {
  userId: string;
  userName?: string;
  studentClass?: string;
}

// Helper to fetch transliteration suggestions from Google Input Tools API (no API key required)
async function fetchHindiTransliterations(englishText: string): Promise<string[]> {
  if (!englishText.trim()) return [];
  try {
    const res = await fetch(
      `https://inputtools.google.com/request?text=${encodeURIComponent(englishText.trim())}&itc=hi-t-i0-und&num=5`
    );
    const json = await res.json();
    if (json[0] === "SUCCESS" && json[1]?.[0]?.[1]) {
      return json[1][0][1] as string[];
    }
  } catch (e) {
    console.warn("Could not fetch Hindi transliterations:", e);
  }
  return [];
}

export default function StudentCertificates({ userId, userName, studentClass }: StudentCertificatesProps) {
  const [certs, setCerts] = useState<any[]>([]);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<CertificateLayout>(DEFAULT_CERTIFICATE_LAYOUT);
  const [profileClass, setProfileClass] = useState<string | null>(studentClass || null);
  const [hindiName, setHindiName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Hindi name entry modal & transliteration state
  const [hindiDialogOpen, setHindiDialogOpen] = useState(false);
  const [pendingCert, setPendingCert] = useState<any | null>(null);
  const [hindiInput, setHindiInput] = useState("");
  const [transliterations, setTransliterations] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [savingHindi, setSavingHindi] = useState(false);

  const certRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [{ data: certList }, lay, { data: prof }] = await Promise.all([
        supabase
          .from("issued_certificates")
          .select("*")
          .eq("user_id", userId)
          .order("issued_at", { ascending: false }),
        fetchCertificateLayout(),
        supabase
          .from("profiles")
          .select("student_class, hindi_name")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      setLayout(lay);
      if (prof) {
        if (!studentClass && prof.student_class) setProfileClass(prof.student_class);
        if (prof.hindi_name) setHindiName(prof.hindi_name);
      }

      const list = certList || [];
      setCerts(list);

      const eventIds = Array.from(new Set(list.map((c: any) => c.event_id).filter(Boolean)));
      if (eventIds.length) {
        const { data: evts } = await supabase.from("library_events").select("id, title").in("id", eventIds);
        const map: Record<string, string> = {};
        (evts || []).forEach((e: any) => { map[e.id] = e.title; });
        setEvents(map);
      }
    } catch (err: any) {
      console.error("Error loading student certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, studentClass]);

  // Open Hindi Name Editor
  const openHindiEditor = (certToPreviewAfter?: any) => {
    setPendingCert(certToPreviewAfter || null);
    const initialVal = certToPreviewAfter?.name_hindi || hindiName || "";
    setHindiInput(initialVal);
    setTransliterations([]);
    setHindiDialogOpen(true);

    // Auto suggest if student hasn't entered anything yet
    if (!initialVal && userName) {
      loadTransliterationSuggestions(userName);
    }
  };

  const loadTransliterationSuggestions = async (name: string) => {
    setSuggesting(true);
    try {
      const suggestions = await fetchHindiTransliterations(name);
      setTransliterations(suggestions);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSaveHindiName = async () => {
    const trimmed = hindiInput.trim();
    if (!trimmed) {
      toast.error("कृपया अपना हिंदी नाम दर्ज करें / Please enter your name in Hindi");
      return;
    }

    setSavingHindi(true);
    try {
      // 1. Save to student's profile
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ hindi_name: trimmed })
        .eq("id", userId);

      if (profErr) throw profErr;

      // 2. Also backfill current user's issued_certificates where name_hindi is null
      await supabase
        .from("issued_certificates")
        .update({ name_hindi: trimmed })
        .eq("user_id", userId)
        .is("name_hindi", null);

      setHindiName(trimmed);

      // If active preview is open, update its name_hindi immediately
      if (preview) {
        setPreview((prev: any) => (prev ? { ...prev, name_hindi: trimmed } : null));
      }

      toast.success("हिंदी नाम सहेज लिया गया / Hindi Name Saved Successfully!", {
        description: `प्रमाणपत्र पर नाम: ${trimmed}`,
      });

      setHindiDialogOpen(false);

      // If opening a pending certificate, launch preview now
      if (pendingCert) {
        const updatedCert = { ...pendingCert, name_hindi: trimmed };
        setPendingCert(null);
        setPreview(updatedCert);
      }
    } catch (e: any) {
      toast.error("नाम सहेजने में त्रुटि / Failed to save Hindi name", {
        description: e.message,
      });
    } finally {
      setSavingHindi(false);
    }
  };

  // Student clicks "View / Download Certificate"
  const handleViewCertificate = (c: any) => {
    const isLocked = Boolean(c.unlock_at && new Date(c.unlock_at) > new Date());
    if (isLocked) {
      toast.error("🔒 Certificate Scheduled / समय से पहले बंद है", {
        description: `यह प्रमाणपत्र ${new Date(c.unlock_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} को अनलॉक होगा। (Unlocks on ${new Date(c.unlock_at).toLocaleString()})`,
        duration: 6000,
      });
      return;
    }

    const effectiveHindiName = c.name_hindi || hindiName;
    if (!effectiveHindiName) {
      // Prompt user to enter Hindi name before viewing
      openHindiEditor(c);
      toast.info("कृपया आगे बढ़ने से पहले अपना हिंदी नाम दर्ज करें / Please set your Hindi name first");
    } else {
      setPreview(c);
    }
  };

  const getActiveRenderData = (): CertificateRenderData | null => {
    if (!preview) return null;
    return {
      studentName: userName || "Student",
      nameHindi: preview.name_hindi || hindiName || null,
      studentClass: profileClass || preview.class_hindi || null,
      classHindi: preview.class_hindi || profileClass || null,
      eventName: preview.event_id && events[preview.event_id] ? events[preview.event_id] : null,
      eventHindi: preview.event_hindi || null,
      during: preview.during_text || null,
      title: preview.title,
      titleHindi: preview.title_hindi || null,
      commonText: preview.common_text || null,
      description: preview.description || null,
      issuedAt: preview.issued_at,
      templateUrl: preview.template_url,
      certNumber: preview.certificate_no,
    };
  };

  const handleDownloadPdf = async () => {
    const data = getActiveRenderData();
    if (!data) return;
    setDownloading(true);
    try {
      await generateCertificatePdf(
        data,
        layout,
        `${(userName || "Student").replace(/\s+/g, "_")}_Certificate.pdf`
      );
      toast.success("PDF प्रमाणपत्र डाउनलोड हो गया / Certificate Downloaded!");
    } catch (e: any) {
      toast.error("प्रमाणपत्र डाउनलोड में विफल / Failed to download PDF", { description: e.message });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    const data = getActiveRenderData();
    if (!data) return;
    try {
      await printCertificateDirect(data, layout);
    } catch (e: any) {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> My Certificates (मेरे प्रमाणपत्र)
          </h2>
          <p className="text-sm text-muted-foreground">
            Official bilingual certificates of merit awarded by PM SHRI KV AFS Sulur Library.
          </p>
        </div>
      </div>

      {/* Hindi Name Profile Card */}
      <Card className={`border ${hindiName ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${hindiName ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bilingual Certificate Identity
                </span>
                {hindiName ? (
                  <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready / तैयार
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px] gap-1">
                    <AlertCircle className="h-3 w-3" /> Action Required / आवश्यक
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium mt-0.5">
                {hindiName ? (
                  <>
                    छात्र का नाम (हिंदी में): <span className="font-bold text-base text-foreground underline decoration-emerald-500/50">{hindiName}</span>
                  </>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">
                    प्रमाणपत्र डाउनलोड करने से पहले कृपया अपना नाम हिंदी में दर्ज करें। (Please enter your Hindi name)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Bilingual Line 1 prints Hindi Name; Line 4 prints English Name: <span className="font-medium text-foreground">{userName || "Student"}</span>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={hindiName ? "outline" : "default"}
            className="shrink-0 gap-1.5"
            onClick={() => openHindiEditor()}
          >
            {hindiName ? <Edit3 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {hindiName ? "Edit Hindi Name / नाम बदलें" : "Set Hindi Name / नाम दर्ज करें"}
          </Button>
        </CardContent>
      </Card>

      {/* Certificates List */}
      {certs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No certificates yet. Participate in library events and reading challenges to earn one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {certs.map((c) => {
            const hasHindi = Boolean(c.name_hindi || hindiName);
            const isLocked = Boolean(c.unlock_at && new Date(c.unlock_at) > new Date());
            return (
              <Card key={c.id} className={`border-border/60 transition-colors shadow-sm ${isLocked ? "bg-amber-500/5 border-amber-300 dark:border-amber-700/40" : "hover:border-primary/40"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        {isLocked && <span title="Locked until scheduled time">🔒</span>}
                        {c.title}
                      </p>
                      {c.title_hindi && (
                        <p className="text-xs font-medium text-primary mt-0.5">{c.title_hindi}</p>
                      )}
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Awarded on {new Date(c.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isLocked ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300">
                          🔒 Unlocks {new Date(c.unlock_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          Awarded
                        </Badge>
                      )}
                      {c.certificate_no && (
                        <span className="text-[10px] font-mono text-muted-foreground">{c.certificate_no}</span>
                      )}
                    </div>
                  </div>

                  {isLocked && (
                    <div className="p-2 bg-amber-100/60 dark:bg-amber-950/40 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      🔒 <span>Available to view &amp; download on <strong>{new Date(c.unlock_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Languages className="h-3.5 w-3.5" />
                      {hasHindi ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {c.name_hindi || hindiName}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Hindi Name pending</span>
                      )}
                    </span>
                    <span className="font-mono text-[10px]">
                      {c.event_id && events[c.event_id] ? events[c.event_id] : (c.event_hindi || "Library Event")}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isLocked ? "outline" : hasHindi ? "default" : "outline"}
                    className={`w-full gap-1.5 ${isLocked ? "opacity-75" : ""}`}
                    onClick={() => handleViewCertificate(c)}
                  >
                    {isLocked ? (
                      <>🔒 Unlocks on {new Date(c.unlock_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>
                    ) : (
                      <><Download className="h-3.5 w-3.5" /> View / Download Certificate</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Hindi Name Entry & Transliteration Dialog */}
      <Dialog open={hindiDialogOpen} onOpenChange={setHindiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              <span>Enter Hindi Name / हिंदी नाम दर्ज करें</span>
            </DialogTitle>
            <DialogDescription>
              This name will be printed on Line 1 of your bilingual KV AFS Sulur library certificate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">English Name on Record</Label>
              <div className="p-2.5 rounded-md bg-muted/60 text-sm font-medium text-foreground">
                {userName || "Student"}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="hindi_input" className="text-xs font-semibold">
                  छात्र का नाम (हिंदी में) <span className="text-red-500">*</span>
                </Label>
                {userName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
                    onClick={() => loadTransliterationSuggestions(userName)}
                    disabled={suggesting}
                  >
                    {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Suggest / सुझाव
                  </Button>
                )}
              </div>

              <Input
                id="hindi_input"
                placeholder="उदा: राहुल कुमार, प्रिया शर्मा..."
                value={hindiInput}
                onChange={(e) => setHindiInput(e.target.value)}
                className="font-medium text-base"
                autoFocus
              />

              {/* Suggestions chips */}
              {transliterations.length > 0 && (
                <div className="space-y-1 pt-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Click to choose spelling:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {transliterations.map((cand) => (
                      <button
                        key={cand}
                        type="button"
                        onClick={() => setHindiInput(cand)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          hindiInput === cand
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/70 hover:bg-muted text-foreground border-border/80"
                        }`}
                      >
                        {cand}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Tip: You can also copy and paste Devanagari text directly from Google Translate or your keyboard.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setHindiDialogOpen(false)} disabled={savingHindi}>
              Cancel
            </Button>
            <Button onClick={handleSaveHindiName} disabled={savingHindi} className="gap-1.5">
              {savingHindi ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save & Apply / सहेजें
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview Modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <span>{preview?.title || "Certificate of Merit"}</span>
                {preview?.title_hindi && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({preview.title_hindi})
                  </span>
                )}
              </div>
              {preview?.certificate_no && (
                <Badge variant="outline" className="font-mono text-xs">
                  {preview.certificate_no}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Bilingual library merit certificate preview and download.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              {/* Quick Hindi Name Toolbar inside Preview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border text-xs">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    Bilingual Name: <strong>{userName || "Student"}</strong> /{" "}
                    <strong className="text-primary">{preview.name_hindi || hindiName || "—"}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 self-start sm:self-auto"
                  onClick={() => openHindiEditor(preview)}
                >
                  <Edit3 className="h-3 w-3" /> Change Hindi Name
                </Button>
              </div>

              {/* Certificate Canvas Render */}
              <div className="shadow-lg rounded-xl overflow-hidden border bg-white">
                <CertificateCanvas
                  canvasRef={certRef}
                  layout={layout}
                  data={{
                    studentName: userName || "Student",
                    nameHindi: preview.name_hindi || hindiName || null,
                    studentClass: profileClass,
                    classHindi: preview.class_hindi || profileClass || null,
                    eventName: preview.event_id ? events[preview.event_id] : null,
                    eventHindi: preview.event_hindi || (preview.event_id ? events[preview.event_id] : null),
                    during: preview.during_text || null,
                    title: preview.title,
                    titleHindi: preview.title_hindi || null,
                    commonText: preview.common_text || null,
                    description: preview.description || null,
                    issuedAt: preview.issued_at,
                    templateUrl: preview.template_url,
                    certNumber: preview.certificate_no,
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleDownloadPdf} disabled={downloading} className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  {downloading ? "Generating High-Res PDF…" : "Download High-Res PDF (A4)"}
                </Button>
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

