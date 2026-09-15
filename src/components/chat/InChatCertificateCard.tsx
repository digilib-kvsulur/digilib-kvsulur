import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Award, FileText, X, Loader2, Sparkles, ExternalLink, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InChatCertificateCardProps {
  currentUser: any;
  onClose: () => void;
  onNavigateToCertificates?: () => void;
}

export const InChatCertificateCard = ({
  currentUser,
  onClose,
  onNavigateToCertificates,
}: InChatCertificateCardProps) => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    loadCertificates();
  }, [currentUser]);

  const loadCertificates = async () => {
    if (!currentUser?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("issued_certificates")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      setCertificates(data || []);
    } catch (err) {
      console.error("Certificate fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 text-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20">
            <Award className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-[11px] text-foreground">
              Issued Certificates
              <span className="ml-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                {loading ? "…" : certificates.length}
              </span>
            </p>
            <p className="text-[9px] text-muted-foreground">Official KV Sulur recognitions</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-3 space-y-2.5">
        {!currentUser?.id ? (
          <p className="text-muted-foreground py-1">
            🔒 Sign in to view your issued library certificates.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            <span className="text-[11px]">Loading certificates...</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center py-5 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
            <FileText className="h-7 w-7 text-muted-foreground/25 mb-1.5" />
            <p className="text-[11px] font-semibold text-foreground">No certificates yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] leading-relaxed">
              Participate in Library Reading Weeks, Book Quizzes & Events to earn official certificates!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-0.5">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-2.5 bg-background rounded-xl border border-border/60 hover:border-emerald-500/30 transition-colors shadow-xs"
                  style={{ borderLeftWidth: 3, borderLeftColor: "#10b981" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px] min-w-0">
                      <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="truncate">{cert.title || "Certificate of Excellence"}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0 font-mono">
                      {new Date(cert.issued_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {cert.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-4">{cert.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/40">
                    <span className="text-[9px] font-mono text-muted-foreground/70">ID: {cert.id.slice(0, 8)}…</span>
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="h-2.5 w-2.5" /> Verified Official
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Download CTA */}
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-2.5 py-2 text-[10px]">
              <span className="text-foreground leading-snug">
                Download PDF in <strong>Student Dashboard → Certificates</strong>
              </span>
              {onNavigateToCertificates && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavigateToCertificates}
                  className="h-6 text-[10px] text-primary hover:text-primary px-2 shrink-0 ml-2"
                >
                  Open <ExternalLink className="h-2.5 w-2.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
