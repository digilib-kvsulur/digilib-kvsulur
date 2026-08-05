import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StudentCertificatesProps {
  userId: string;
  userName?: string;
}

export default function StudentCertificates({ userId, userName }: StudentCertificatesProps) {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any | null>(null);

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

  const handlePrint = () => {
    window.print();
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
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(c.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">Awarded</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setPreview(c)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> View / Print
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl print:max-w-none print:shadow-none print:border-0">
          <DialogHeader className="print:hidden">
            <DialogTitle>Certificate</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div
                id="certificate-preview"
                className="relative aspect-[1.414] w-full overflow-hidden rounded-lg border bg-muted/20"
                style={
                  preview.template_url
                    ? {
                        backgroundImage: `url(${preview.template_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/5">
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-700/90 mb-2">
                    Certificate of Recognition
                  </p>
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-1">
                    {userName || "Student"}
                  </p>
                  <p className="text-sm text-slate-700 max-w-md mb-3">
                    {preview.description || `Awarded for: ${preview.title}`}
                  </p>
                  <p className="text-base font-semibold text-slate-800">{preview.title}</p>
                  <p className="text-xs text-slate-600 mt-4">
                    {new Date(preview.issued_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Button onClick={handlePrint} className="w-full print:hidden">
                <Printer className="h-4 w-4 mr-2" /> Print Certificate
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
