import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LifeBuoy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendTicketEmail } from "@/lib/ticketEmail";
import { InChatConversation } from "./InChatConversation";

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

  const handleCreateTicket = async (answers: Record<string, string>) => {
    const category = answers.category;
    const subject = answers.subject.trim();
    const description = answers.description.trim();
    const admission = answers.admission || currentUser?.admission_number || "";
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

    if (!ticketResult) throw new Error("The ticket was not created. Please try again.");
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
      ticket_number: ticketResult.ticket_number || `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
      subject: subject.trim(),
      category,
      status: ticketResult.status || "Open",
    });
  };

  const handleTrackTicket = async (answers: Record<string, string>) => {
    const ticketNumber = answers.ticket_number.trim().toUpperCase();
    const { data, error } = await supabase
      .from("support_tickets")
      .select("ticket_number, status, subject, category, created_at, admin_notes")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`No ticket found for “${ticketNumber}”. Check the number and try again.`);
    const createdAt = new Date(data.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const note = data.admin_notes ? ` Librarian reply: ${data.admin_notes}` : "";
    return `Ticket ${data.ticket_number} is **${(data.status || "open").replace(/_/g, " ")}**. Subject: ${data.subject}. Category: ${(data.category || "general").replace(/_/g, " ")}. Created ${createdAt}.${note}`;
  };

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
        <InChatConversation
          title="Support Desk"
          subtitle="A few quick questions, one at a time"
          showHeader={false}
          onClose={onClose}
          onSubmit={handleCreateTicket}
          submitLabel="Submit ticket"
          initialAnswers={currentUser?.admission_number ? { admission: currentUser.admission_number } : {}}
          steps={[
            { key: "category", question: "What do you need help with?", type: "choice", options: CATEGORIES.map((cat) => ({ label: `${cat.emoji} ${cat.label}`, value: cat.value })) },
            ...(!currentUser?.admission_number ? [{ key: "admission", question: "What is your admission number? You can skip this if you don’t know it.", type: "text" as const, placeholder: "Admission number", optional: true }] : []),
            { key: "subject", question: "Give the issue a short title.", type: "text", maxLength: 150, placeholder: "For example: Book return not updated" },
            { key: "description", question: "Please describe what happened and what help you need.", type: "textarea", maxLength: 2000, placeholder: "Add the details here…" },
          ]}
          summary={(answers) => [
            `Category: ${CATEGORIES.find((cat) => cat.value === answers.category)?.label || answers.category}`,
            `Subject: ${answers.subject}`,
            `Details: ${answers.description}`,
          ]}
        />
      ) : (
        <InChatConversation
          title="Track a Ticket"
          subtitle="Enter your ticket number"
          showHeader={false}
          onClose={onClose}
          onSubmit={handleTrackTicket}
          submitLabel="Check status"
          steps={[{ key: "ticket_number", question: "What is the ticket number you received?", type: "text", placeholder: "For example: TKT-2026-12345", maxLength: 40 }]}
          summary={(answers) => [`Ticket number: ${answers.ticket_number.toUpperCase()}`]}
        />
      )}
    </div>
  );
};
