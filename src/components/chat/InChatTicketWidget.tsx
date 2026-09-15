import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, X, Ticket, Loader2, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendTicketEmail } from "@/lib/ticketEmail";

interface InChatTicketWidgetProps {
  currentUser: any;
  onClose: () => void;
  onTicketCreated: (ticketInfo: { ticket_number: string; subject: string; category: string; status: string }) => void;
  initialMode?: "create" | "track";
}

export const InChatTicketWidget = ({
  currentUser,
  onClose,
  onTicketCreated,
  initialMode = "create"
}: InChatTicketWidgetProps) => {
  const [mode, setMode] = useState<"create" | "track">(initialMode);
  
  // Create form state
  const [category, setCategory] = useState("book_issue");
  const [admission, setAdmission] = useState(currentUser?.admission_number || "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Track state
  const [trackTicketNo, setTrackTicketNo] = useState("");
  const [trackAdmission, setTrackAdmission] = useState(currentUser?.admission_number || "");
  const [tracking, setTracking] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState<any | null>(null);
  const [trackError, setTrackError] = useState("");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg("Please provide both a subject and details.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      const fullName = currentUser
        ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
        : "Student";

      let ticketResult: any = null;

      // Try RPC first if available, or direct insert
      const { data: rpcData, error: rpcError } = await supabase.rpc("submit_public_support_ticket", {
        p_admission: admission.trim() || currentUser?.admission_number || "—",
        p_full_name: fullName || "Student",
        p_email: currentUser?.email || null,
        p_student_class: currentUser?.student_class || null,
        p_role: currentUser?.role || "student",
        p_category: category,
        p_priority: "normal",
        p_subject: subject.trim().slice(0, 150),
        p_description: description.trim().slice(0, 2000),
      });

      if (!rpcError && rpcData) {
        ticketResult = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      } else {
        // Fallback to direct table insertion
        const { data: insertData, error: insertError } = await supabase
          .from("support_tickets")
          .insert({
            user_id: currentUser?.id || null,
            admission_number: admission.trim() || currentUser?.admission_number || null,
            full_name: fullName || "Student",
            email: currentUser?.email || null,
            student_class: currentUser?.student_class || null,
            role: currentUser?.role || "student",
            category: category,
            priority: "normal",
            subject: subject.trim().slice(0, 150),
            description: description.trim().slice(0, 2000),
          })
          .select("id, ticket_number, status")
          .single();

        if (insertError) throw insertError;
        ticketResult = insertData;
      }

      if (ticketResult) {
        if (currentUser?.email) {
          sendTicketEmail({
            type: "created",
            ticket_id: ticketResult.id,
            ticket_number: ticketResult.ticket_number,
            to_email: currentUser.email,
            full_name: fullName,
            subject: subject.trim(),
            status: "open",
          }).catch(err => console.warn("Email notify failed:", err));
        }

        onTicketCreated({
          ticket_number: ticketResult.ticket_number || `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
          subject: subject.trim(),
          category,
          status: ticketResult.status || "Open"
        });
      }
    } catch (err: any) {
      console.error("Support ticket error:", err);
      setErrorMsg(err.message || "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTicketNo.trim()) {
      setTrackError("Please enter your ticket number.");
      return;
    }
    setTrackError("");
    setTracking(true);
    setTrackedTicket(null);

    try {
      const cleanTicketNo = trackTicketNo.trim().toUpperCase();
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("ticket_number", cleanTicketNo)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setTrackError(`No ticket found matching "${cleanTicketNo}".`);
      } else {
        setTrackedTicket(data);
      }
    } catch (err: any) {
      setTrackError(err.message || "Could not track ticket.");
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="p-3 bg-card border border-primary/30 rounded-2xl shadow-lg space-y-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs">
      {/* Header with Mode Toggle & Close */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <LifeBuoy className="h-4 w-4 text-primary" />
          <span>Support Desk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-muted/60 p-0.5 rounded-lg text-[10px]">
            <button
              type="button"
              onClick={() => { setMode("create"); setErrorMsg(""); }}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                mode === "create" ? "bg-background shadow-xs text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              New Ticket
            </button>
            <button
              type="button"
              onClick={() => { setMode("track"); setTrackError(""); }}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                mode === "track" ? "bg-background shadow-xs text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Track
            </button>
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
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreateSubmit} className="space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs h-7.5 px-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden"
            >
              <option value="book_issue">📚 Book Issue / Return Issue</option>
              <option value="fine_inquiry">💰 Overdue Fine Query</option>
              <option value="account_login">🔑 Account & Login Issue</option>
              <option value="quiz_points">🏆 XP, Badges & Quiz Discrepancy</option>
              <option value="certificate">📜 Certificate Inquiry</option>
              <option value="study_materials">📖 Study Hub & NCERT Request</option>
              <option value="other">💬 General Library Inquiry</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Admission Number (Optional)</label>
            <Input
              placeholder="e.g. 13412"
              value={admission}
              onChange={(e) => setAdmission(e.target.value)}
              className="h-7.5 text-xs font-mono rounded-lg"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Subject</label>
            <Input
              placeholder="Summary of your issue..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-7.5 text-xs rounded-lg"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Description</label>
            <Textarea
              placeholder="Explain clearly what you need help with..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs min-h-[50px] p-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary outline-hidden resize-none"
              required
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3 shrink-0" /> {errorMsg}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-7 text-xs flex-1 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !subject.trim() || !description.trim()}
              className="h-7 text-xs flex-1 rounded-lg bg-primary text-primary-foreground font-semibold"
            >
              {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Ticket className="h-3 w-3 mr-1" />}
              Submit Ticket
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-2.5">
          <form onSubmit={handleTrackSubmit} className="flex gap-1.5">
            <Input
              placeholder="Ticket No (e.g. TKT-2026-1024)"
              value={trackTicketNo}
              onChange={(e) => setTrackTicketNo(e.target.value)}
              className="h-7.5 text-xs font-mono rounded-lg flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={tracking || !trackTicketNo.trim()}
              className="h-7.5 text-xs rounded-lg px-2.5"
            >
              {tracking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            </Button>
          </form>

          {trackError && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" /> {trackError}
            </p>
          )}

          {trackedTicket && (
            <div className="p-2.5 bg-muted/50 rounded-xl border border-border space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">{trackedTicket.ticket_number}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  trackedTicket.status === "resolved" || trackedTicket.status === "closed"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                }`}>
                  {trackedTicket.status?.toUpperCase() || "OPEN"}
                </span>
              </div>
              <p className="font-medium text-foreground text-xs">{trackedTicket.subject}</p>
              {trackedTicket.admin_notes && (
                <div className="mt-1.5 p-1.5 bg-background rounded-md border text-[11px]">
                  <span className="font-semibold text-primary">Librarian Response:</span>
                  <p className="text-muted-foreground mt-0.5">{trackedTicket.admin_notes}</p>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground flex justify-between pt-1">
                <span>Category: {trackedTicket.category}</span>
                <span>{new Date(trackedTicket.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
