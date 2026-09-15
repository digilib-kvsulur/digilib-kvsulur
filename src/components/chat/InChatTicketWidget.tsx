import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, X, Ticket, Loader2, Search, AlertCircle, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendTicketEmail } from "@/lib/ticketEmail";

interface InChatTicketWidgetProps {
  currentUser: any;
  onClose: () => void;
  onTicketCreated: (ticketInfo: {
    ticket_number: string;
    subject: string;
    category: string;
    status: string;
  }) => void;
  initialMode?: "create" | "track";
}

const CATEGORIES = [
  { value: "book_issue",       label: "Book issue / return",       emoji: "📚" },
  { value: "fine_inquiry",     label: "Overdue fine query",         emoji: "💰" },
  { value: "account_login",    label: "Account & login issue",      emoji: "🔑" },
  { value: "quiz_points",      label: "XP, badges & quiz",          emoji: "🏆" },
  { value: "certificate",      label: "Certificate inquiry",        emoji: "📜" },
  { value: "study_materials",  label: "Study hub / NCERT",          emoji: "📖" },
  { value: "other",            label: "General inquiry",            emoji: "💬" },
];

export const InChatTicketWidget = ({
  currentUser,
  onClose,
  onTicketCreated,
  initialMode = "create",
}: InChatTicketWidgetProps) => {
  const [mode, setMode] = useState<"create" | "track">(initialMode);

  // Create form
  const [category, setCategory] = useState("book_issue");
  const [admission, setAdmission] = useState(currentUser?.admission_number || "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Track form
  const [trackTicketNo, setTrackTicketNo] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState<any | null>(null);
  const [trackError, setTrackError] = useState("");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg("Please fill in both the subject and description.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const fullName = currentUser
        ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
        : "Student";

      let ticketResult: any = null;

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "submit_public_support_ticket",
        {
          p_admission: admission.trim() || currentUser?.admission_number || "—",
          p_full_name: fullName || "Student",
          p_email: currentUser?.email || null,
          p_student_class: currentUser?.student_class || null,
          p_role: currentUser?.role || "student",
          p_category: category,
          p_priority: "normal",
          p_subject: subject.trim().slice(0, 150),
          p_description: description.trim().slice(0, 2000),
        }
      );

      if (!rpcError && rpcData) {
        ticketResult = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from("support_tickets")
          .insert({
            user_id: currentUser?.id || null,
            admission_number: admission.trim() || currentUser?.admission_number || null,
            full_name: fullName || "Student",
            email: currentUser?.email || null,
            student_class: currentUser?.student_class || null,
            role: currentUser?.role || "student",
            category,
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
          }).catch(() => {});
        }
        onTicketCreated({
          ticket_number:
            ticketResult.ticket_number ||
            `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
          subject: subject.trim(),
          category,
          status: ticketResult.status || "Open",
        });
      }
    } catch (err: any) {
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
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("ticket_number", trackTicketNo.trim().toUpperCase())
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setTrackError(`No ticket found for "${trackTicketNo.trim().toUpperCase()}".`);
      } else {
        setTrackedTicket(data);
      }
    } catch (err: any) {
      setTrackError(err.message || "Could not look up ticket.");
    } finally {
      setTracking(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.value === category);

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-3 text-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/15 via-primary/10 to-transparent border-b border-border/50 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <LifeBuoy className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-[11px] text-foreground">Support Desk</p>
            <p className="text-[9px] text-muted-foreground">We're here to help</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mode Toggle */}
          <div className="flex bg-muted/70 rounded-lg p-0.5">
            {(["create", "track"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setErrorMsg("");
                  setTrackError("");
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                  mode === m
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "create" ? "New Ticket" : "Track"}
              </button>
            ))}
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
        <form onSubmit={handleCreateSubmit} className="p-3 space-y-2.5">
          {/* Category */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Category</p>
            <div className="grid grid-cols-2 gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[10px] text-left transition-all ${
                    category === cat.value
                      ? "border-primary/60 bg-primary/10 text-primary font-semibold shadow-xs"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span className="leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Admission number — compact inline */}
          {!currentUser?.admission_number && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                Admission number <span className="opacity-60">(optional)</span>
              </p>
              <Input
                placeholder="e.g. 13412"
                value={admission}
                onChange={(e) => setAdmission(e.target.value)}
                className="h-8 text-xs font-mono rounded-xl border-border/60"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">Subject</p>
            <Input
              placeholder="Brief summary of your issue..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 text-xs rounded-xl border-border/60 focus-visible:ring-primary/30"
              required
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-[10px] font-medium text-muted-foreground">Details</p>
              <span className="text-[9px] text-muted-foreground/60">{description.length}/1000</span>
            </div>
            <Textarea
              placeholder="Describe what happened and what you need help with..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              className="text-xs min-h-[52px] p-2 rounded-xl border-border/60 focus-visible:ring-primary/30 resize-none"
              required
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-destructive flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-2 py-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" /> {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={submitting || !subject.trim() || !description.trim()}
            className="w-full h-9 text-xs rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-xs"
          >
            {submitting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Submitting...</>
            ) : (
              <><Ticket className="h-3.5 w-3.5 mr-1.5" /> Submit Support Ticket</>
            )}
          </Button>
        </form>
      ) : (
        <div className="p-3 space-y-2.5">
          <form onSubmit={handleTrackSubmit} className="flex gap-1.5">
            <Input
              placeholder="e.g. TKT-2026-12345"
              value={trackTicketNo}
              onChange={(e) => setTrackTicketNo(e.target.value)}
              className="h-8 text-xs font-mono rounded-xl border-border/60 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={tracking || !trackTicketNo.trim()}
              className="h-8 text-xs rounded-xl px-3"
            >
              {tracking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </Button>
          </form>

          {trackError && (
            <p className="text-[11px] text-destructive flex items-center gap-1.5 bg-destructive/5 border border-destructive/20 rounded-lg px-2 py-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" /> {trackError}
            </p>
          )}

          {trackedTicket && (
            <div className="bg-muted/40 rounded-xl border border-border/60 overflow-hidden animate-in fade-in">
              {/* Ticket header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono font-bold text-primary text-[11px]">
                    {trackedTicket.ticket_number}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${
                    trackedTicket.status === "resolved" || trackedTicket.status === "closed"
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : trackedTicket.status === "in_progress"
                      ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                      : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                  }`}
                >
                  {(trackedTicket.status || "open").toUpperCase()}
                </span>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                <p className="font-semibold text-[11px] text-foreground">{trackedTicket.subject}</p>
                <p className="text-[10px] text-muted-foreground">
                  Category: {trackedTicket.category?.replace(/_/g, " ")}
                  &nbsp;·&nbsp;
                  {new Date(trackedTicket.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {trackedTicket.admin_notes && (
                  <div className="mt-1 p-2 bg-primary/5 border border-primary/20 rounded-lg text-[10px]">
                    <p className="font-semibold text-primary mb-0.5">Librarian reply</p>
                    <p className="text-foreground/80 leading-relaxed">{trackedTicket.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
