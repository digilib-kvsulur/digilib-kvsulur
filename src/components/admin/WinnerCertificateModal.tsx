import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles, Printer, Save, CheckCircle2, Eye, Sliders, Palette, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  generateCertificatePdf,
  printCertificateDirect,
  type CertificateRenderData,
} from "@/components/certificates/certificateGenerator";
import {
  fetchCertificateTemplateUrl,
  fetchCertificateLayout,
  fetchCertificateCommonText,
  DEFAULT_CERTIFICATE_LAYOUT,
  type CertificateLayout,
} from "@/lib/librarySettings";
import CertificateCanvas from "@/components/certificates/CertificateCanvas";
import { OFFICIAL_KV_TEMPLATE_URL } from "@/components/certificates/BuiltinTemplates";
import { sendAutoEmail } from "@/lib/autoEmail";

export interface WinnerCertModalData {
  userId: string;
  studentName: string;
  studentClass?: string;
  admissionNumber?: string;
  awardTitle: string;
  awardTitleHindi?: string;
  eventSubtitle?: string;
  eventSubtitleHindi?: string;
  description?: string;
  certificateId?: string | null;
  issuedAt?: string;
  unlockAt?: string;
}

interface WinnerCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WinnerCertModalData | null;
  onCertificateIssued?: (certId: string) => void;
}

function generateCertNo(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KVS-LIB-2026-${rand}`;
}

export const WinnerCertificateModal: React.FC<WinnerCertificateModalProps> = ({
  open,
  onOpenChange,
  data,
  onCertificateIssued,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [templateUrl, setTemplateUrl] = useState<string>(OFFICIAL_KV_TEMPLATE_URL);
  const [layout, setLayout] = useState<CertificateLayout>(DEFAULT_CERTIFICATE_LAYOUT);
  const [commonText, setCommonText] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    title_hindi: "",
    name_hindi: "",
    event_name: "",
    event_hindi: "",
    during_text: "वर्ष 2026-2027 / Year 2026-2027",
    description: "",
    certificate_no: generateCertNo(),
    issued_at: new Date().toISOString().slice(0, 10),
    unlock_at: "",
  });

  useEffect(() => {
    if (open && data) {
      loadTemplateAndLayout();
      setForm({
        title: data.awardTitle || "First Position",
        title_hindi: data.awardTitleHindi || "प्रथम स्थान",
        name_hindi: "",
        event_name: data.eventSubtitle || "Digital Library Activity",
        event_hindi: data.eventSubtitleHindi || data.eventSubtitle || "डिजिटल लाइब्रेरी गतिविधि",
        during_text: `वर्ष 2026-2027 / ${data.eventSubtitle || "Year 2026-2027"}`,
        description: data.description || `Awarded to ${data.studentName} for outstanding excellence.`,
        certificate_no: generateCertNo(),
        issued_at: data.issuedAt || new Date().toISOString().slice(0, 10),
        unlock_at: data.unlockAt || "",
      });

      // Fetch student Hindi name if available
      if (data.userId) {
        supabase
          .from("profiles")
          .select("hindi_name")
          .eq("id", data.userId)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof?.hindi_name) {
              setForm((prev) => ({ ...prev, name_hindi: prof.hindi_name }));
            }
          });
      }
    }
  }, [open, data]);

  const loadTemplateAndLayout = async () => {
    try {
      const [tpl, lay, commText] = await Promise.all([
        fetchCertificateTemplateUrl(),
        fetchCertificateLayout(),
        fetchCertificateCommonText(),
      ]);
      setTemplateUrl(tpl || OFFICIAL_KV_TEMPLATE_URL);
      setLayout(lay);
      setCommonText(commText);
    } catch (e) {
      console.error(e);
    }
  };

  if (!data) return null;

  const renderData: CertificateRenderData = {
    certNumber: form.certificate_no,
    issuedAt: form.issued_at,
    studentName: data.studentName,
    nameHindi: form.name_hindi || undefined,
    studentClass: data.studentClass ? `${data.studentClass}` : undefined,
    classHindi: data.studentClass ? `${data.studentClass}` : undefined,
    eventName: form.event_name,
    eventHindi: form.event_hindi || form.event_name,
    during: form.during_text,
    title: form.title,
    titleHindi: form.title_hindi,
    description: form.description,
    commonText: commonText || undefined,
    templateUrl: templateUrl,
  };

  const handleSaveAndIssue = async () => {
    setSaving(true);
    try {
      const certNo = form.certificate_no || generateCertNo();

      let certId = data.certificateId;

      const certPayload = {
        title: form.title,
        title_hindi: form.title_hindi || null,
        name_hindi: form.name_hindi || null,
        class_hindi: data.studentClass || null,
        event_hindi: form.event_hindi || form.event_name || null,
        during_text: form.during_text || null,
        description: form.description || null,
        issued_at: form.issued_at,
        unlock_at: form.unlock_at || null,
        template_url: templateUrl,
        common_text: commonText || null,
        bilingual_data: {
          event_name: form.event_name,
          event_hindi: form.event_hindi || form.event_name,
          award_title: form.title,
          award_title_hindi: form.title_hindi,
        },
      };

      if (certId) {
        // Update existing certificate
        const { error } = await supabase
          .from("issued_certificates")
          .update(certPayload)
          .eq("id", certId);

        if (error) throw error;
      } else {
        // Create new certificate
        const { data: created, error } = await supabase
          .from("issued_certificates")
          .insert({
            ...certPayload,
            user_id: data.userId,
            certificate_no: certNo,
          })
          .select("id")
          .single();

        if (error) throw error;
        if (created) certId = created.id;
      }

      // Send automated email notification to student
      sendAutoEmail({
        recipientId: data.userId,
        preset: "certificate_notice",
        customMessage: `Certificate Issued: "${form.title}" for ${form.event_name || "Library Event"}. Log in to view and print your e-certificate!`,
        details: {
          title: form.title,
          event: form.event_name,
          issuedAt: form.issued_at,
        },
      });

      toast({
        title: "🎉 Certificate Issued & Emailed!",
        description: `Successfully issued e-certificate for ${data.studentName}.`,
      });

      if (certId && onCertificateIssued) {
        onCertificateIssued(certId);
      }

      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err?.message || "Could not issue certificate.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    try {
      await printCertificateDirect(renderData, templateUrl, layout);
    } catch (err: any) {
      toast({ title: "Print Error", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 border-2 border-indigo-500/30 rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/5 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Award className="h-6 w-6 text-indigo-600" />
            Customise &amp; Issue E-Certificate: {data.studentName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Real-time live certificate preview with bilingual typography and custom styling.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Recipient Details
              </span>
              <p className="text-sm font-bold text-foreground">{data.studentName}</p>
              <p className="text-xs text-muted-foreground">
                Class {data.studentClass || "—"} · Admn #{data.admissionNumber || "—"}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold">Award Title (English)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. First Position / Best Library User"
                  className="h-8 text-xs mt-1 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Award Title (Hindi / हिंदी)</Label>
                <Input
                  value={form.title_hindi}
                  onChange={(e) => setForm({ ...form, title_hindi: e.target.value })}
                  placeholder="e.g. प्रथम स्थान / श्रेष्ठ पाठक"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Student Name in Hindi (optional)</Label>
                <Input
                  value={form.name_hindi}
                  onChange={(e) => setForm({ ...form, name_hindi: e.target.value })}
                  placeholder="e.g. राहुल शर्मा"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Event / Subtitle (English)</Label>
                <Input
                  value={form.event_name}
                  onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                  placeholder="e.g. Annual Reading Month Competition"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Event / Subtitle (Hindi / प्रतियोगिता)</Label>
                <Input
                  value={form.event_hindi}
                  onChange={(e) => setForm({ ...form, event_hindi: e.target.value })}
                  placeholder="e.g. राष्ट्रीय पठन माह प्रतियोगिता"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">During Text / Academic Year</Label>
                <Input
                  value={form.during_text}
                  onChange={(e) => setForm({ ...form, during_text: e.target.value })}
                  placeholder="e.g. वर्ष 2026-2027 / Year 2026-2027"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Certificate Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold">Issued Date</Label>
                  <Input
                    type="date"
                    value={form.issued_at}
                    onChange={(e) => setForm({ ...form, issued_at: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Unlock Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.unlock_at}
                    onChange={(e) => setForm({ ...form, unlock_at: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Preview Column */}
          <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-indigo-500" />
                  Live Certificate Canvas Preview
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {layout.canvasWidth} x {layout.canvasHeight} px
                </Badge>
              </div>

              <div className="border-2 border-indigo-200 dark:border-indigo-900 rounded-xl overflow-hidden bg-slate-900 shadow-md p-2 flex items-center justify-center min-h-[300px]">
                <div className="w-full transform scale-95 origin-center">
                  <CertificateCanvas
                    templateUrl={templateUrl}
                    layout={layout}
                    data={renderData}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 text-xs font-semibold">
                <Printer className="h-4 w-4 mr-1.5 text-muted-foreground" /> Direct Print PDF
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={saving}
                onClick={handleSaveAndIssue}
                className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? "Saving..." : "📜 Save & Issue E-Certificate"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WinnerCertificateModal;
