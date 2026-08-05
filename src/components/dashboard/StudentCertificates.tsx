import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface StudentCertificatesProps {
  userId: string;
  userName?: string;
}

export default function StudentCertificates({ userId, userName }: StudentCertificatesProps) {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("issued_certificates")
        .select("*")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false });
      setCerts(data || []);
      setLoading(false);
    })();
  }, [userId]);

  const downloadPdf = async () => {
    if (!certRef.current || !preview) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, "PNG", 0, 0, pageW, pageH);
      pdf.save(`${preview.title || "certificate"}.pdf`);
    } finally {
      setDownloading(false);
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
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> My Certificates
        </h2>
        <p className="text-sm text-muted-foreground">Certificates awarded by the library.</p>
      </div>

      {certs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No certificates yet. Participate in library events to earn one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.title}</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(c.issued_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary">Awarded</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setPreview(c)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> View / Download PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div
                ref={certRef}
                className="relative aspect-[1.414] w-full overflow-hidden rounded-lg border bg-white"
                style={
                  preview.template_url
                    ? { backgroundImage: `url(${preview.template_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { background: "linear-gradient(135deg,#f8fafc,#e2e8f0)" }
                }
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/40">
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-700 mb-2">Certificate of Recognition</p>
                  <p className="text-3xl font-serif font-bold text-slate-900 mb-1">{userName || "Student"}</p>
                  <p className="text-sm text-slate-700 max-w-md mb-3">{preview.description || `Awarded for: ${preview.title}`}</p>
                  <p className="text-base font-semibold text-slate-800">{preview.title}</p>
                  <p className="text-xs text-slate-600 mt-4">
                    {new Date(preview.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadPdf} disabled={downloading} className="flex-1">
                  <Download className="h-4 w-4 mr-2" /> {downloading ? "Generating..." : "Download PDF"}
                </Button>
                <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
