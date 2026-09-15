import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Award, FileText, Download, X, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InChatCertificateCardProps {
  currentUser: any;
  onClose: () => void;
  onNavigateToCertificates?: () => void;
}

export const InChatCertificateCard = ({
  currentUser,
  onClose,
  onNavigateToCertificates
}: InChatCertificateCardProps) => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    loadCertificates();
  }, [currentUser]);

  const loadCertificates = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
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
      console.error("Error fetching certificates in bot:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 bg-card border border-primary/30 rounded-2xl shadow-lg space-y-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Award className="h-4 w-4 text-primary" />
          <span>Issued Certificates ({certificates.length})</span>
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

      {!currentUser?.id ? (
        <p className="text-muted-foreground">🔒 Sign in to view your issued library certificates and accolades.</p>
      ) : loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading certificates...
        </div>
      ) : certificates.length === 0 ? (
        <div className="p-3 text-center bg-muted/20 rounded-xl border border-dashed text-muted-foreground text-[11px] space-y-1">
          <FileText className="h-6 w-6 mx-auto opacity-40 text-primary" />
          <p className="font-semibold text-foreground">No certificates issued yet</p>
          <p className="text-[10px]">
            Participate in Library Reading Weeks, Book Quizzes, and Events to earn official KV Sulur certificates!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-2 bg-background rounded-lg border border-border/70 flex flex-col gap-1 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="truncate">{cert.title || "Certificate of Excellence"}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 font-mono">
                    {new Date(cert.issued_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {cert.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{cert.description}</p>
                )}
                <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-0.5 border-t border-border/40 mt-0.5">
                  <span className="font-mono">ID: {cert.id.slice(0, 8)}...</span>
                  <span className="text-primary font-medium">Verified Official</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 bg-primary/5 rounded-xl border border-primary/20 text-[10px] text-foreground flex items-center justify-between">
            <span>Download High-Res PDF in <strong>Student Dashboard &gt; Certificates</strong></span>
            {onNavigateToCertificates && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToCertificates}
                className="h-6 text-[10px] text-primary hover:text-primary px-2"
              >
                Open <ExternalLink className="h-2.5 w-2.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
