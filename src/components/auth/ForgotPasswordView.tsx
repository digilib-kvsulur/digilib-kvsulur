import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  ArrowLeft,
  Mail,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  HelpCircle,
  RefreshCw,
  Ticket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
  onUseDefaultPassword?: (admissionNumber: string) => void;
  initialIdentifier?: string;
}

interface AccountRecoveryData {
  user_id: string;
  auth_email: string;
  first_name: string;
  last_name?: string;
  role: string;
  student_class?: string;
  admission_number?: string;
  has_personal_email: boolean;
  masked_email?: string;
  is_dummy_email: boolean;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onBackToLogin,
  onUseDefaultPassword,
  initialIdentifier = "",
}) => {
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [isSearching, setIsSearching] = useState(false);
  const [accountData, setAccountData] = useState<AccountRecoveryData | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Email link state
  const [emailSent, setEmailSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Librarian ticket state
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [submittedTicketNo, setSubmittedTicketNo] = useState<string | null>(null);
  const [studentNote, setStudentNote] = useState("");

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // If initialIdentifier provided on mount, auto-search
  useEffect(() => {
    if (initialIdentifier.trim()) {
      handleLookup(initialIdentifier.trim());
    }
  }, [initialIdentifier]);

  // Step 1: Look up account details
  const handleLookup = async (idToSearch?: string) => {
    const query = (idToSearch || identifier).trim();
    if (!query) {
      toast({
        title: "Input required",
        description: "Please enter your admission number, email, or username",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setAccountData(null);
    setEmailSent(false);
    setSubmittedTicketNo(null);

    try {
      // First try enhanced RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_account_recovery_options", {
        identifier: query,
      });

      if (!rpcErr && rpcData && rpcData.length > 0) {
        setAccountData(rpcData[0]);
        setIsSearching(false);
        return;
      }

      // Fallback to find_user_by_identifier
      const { data: legacyData, error: legacyErr } = await supabase.rpc("find_user_by_identifier", {
        identifier: query,
      });

      if (legacyErr || !legacyData || legacyData.length === 0) {
        setNotFound(true);
      } else {
        const user = legacyData[0];
        const isDummy =
          user.email?.includes("@kvschool.in") ||
          user.email?.includes("@internal") ||
          user.email?.includes("@dummy");

        // Try getting profile details
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, role, student_class, admission_number, email")
          .eq("id", user.id)
          .maybeSingle();

        const profileEmail = prof?.email && !prof.email.includes("@kvschool.in") ? prof.email : null;
        const targetEmail = profileEmail || (!isDummy ? user.email : null);
        let masked = undefined;

        if (targetEmail && targetEmail.includes("@")) {
          const parts = targetEmail.split("@");
          const u = parts[0];
          masked = u.length <= 2 ? `${u[0]}***@${parts[1]}` : `${u[0]}***${u[u.length - 1]}@${parts[1]}`;
        }

        setAccountData({
          user_id: user.id,
          auth_email: user.email,
          first_name: prof?.first_name || "User",
          last_name: prof?.last_name || "",
          role: prof?.role || "student",
          student_class: prof?.student_class || undefined,
          admission_number: prof?.admission_number || query,
          has_personal_email: !!targetEmail,
          masked_email: masked,
          is_dummy_email: isDummy && !profileEmail,
        });
      }
    } catch (e: any) {
      console.error("Account recovery lookup error:", e);
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Step 2A: Send recovery email
  const handleSendEmail = async () => {
    if (!accountData || cooldown > 0) return;

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(accountData.auth_email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      setCooldown(60);
      toast({
        title: "Password Reset Link Dispatched",
        description: `Sent to ${accountData.masked_email || "your registered email address"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Email Dispatch Failed",
        description: err.message || "Failed to send reset email. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Step 2B: Request reset from Librarian
  const handleRequestLibrarianReset = async () => {
    if (!accountData) return;

    setIsSubmittingTicket(true);
    try {
      const adm = accountData.admission_number || identifier;
      const fullName = `${accountData.first_name || ""} ${accountData.last_name || ""}`.trim() || "Student";
      const studentClass = accountData.student_class || "Unspecified";

      const subject = `Password Reset Request: ${adm} (${fullName})`;
      const description = `Student requested password reset assistance for account: ${fullName} (Admission: ${adm}, Class: ${studentClass}). ${
        studentNote.trim() ? `Student Note: "${studentNote.trim()}"` : ""
      } Please reset their account to Welcome@123 or provide a temporary password.`;

      const { data, error } = await supabase.rpc("submit_public_support_ticket", {
        p_admission: adm,
        p_full_name: fullName,
        p_email: accountData.has_personal_email ? accountData.auth_email : null,
        p_student_class: studentClass,
        p_role: accountData.role || "student",
        p_category: "account",
        p_subject: subject,
        p_description: description,
        p_priority: "high",
      });

      if (error) throw error;

      const ticketNumber = Array.isArray(data) ? data[0]?.ticket_number : (data as any)?.ticket_number;
      setSubmittedTicketNo(ticketNumber || "SUBMITTED");
      toast({
        title: "Request Sent to Librarian!",
        description: `Ticket ${ticketNumber || ""} created. The library teacher will assist you shortly.`,
      });
    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message || "Could not submit reset request. Please visit the library desk.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Account Recovery</h3>
        <p className="text-xs text-slate-500 mt-1">
          Recover your KV Sulur DLMS password via email or student verification.
        </p>
      </div>

      {/* Account Lookup Input */}
      {!accountData ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="recIdentifier" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Admission No. / Email / Username
            </Label>
            <Input
              id="recIdentifier"
              type="text"
              placeholder="e.g. 12345 or your username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (notFound) setNotFound(false);
              }}
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-indigo-500 font-medium"
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-500">
              Students: Enter your 5-digit admission number. Teachers/Staff: Enter your email or username.
            </p>
          </div>

          {notFound && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>Account Not Found</span>
              </div>
              <p className="text-[11px] text-red-600">
                We couldn't find an account matching "{identifier}". Please double-check your admission number or contact the library teacher.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSearching || !identifier.trim()}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Looking Up Account…
              </span>
            ) : (
              "Find My Account"
            )}
          </Button>
        </form>
      ) : (
        /* Account Found - Smart Recovery Options */
        <div className="space-y-4 animate-in fade-in">
          {/* User Preview Badge */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                {accountData.first_name[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">
                  {accountData.first_name} {accountData.last_name || ""}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase font-bold bg-white text-indigo-700 border-indigo-200">
                    {accountData.role}
                  </Badge>
                  {accountData.student_class && (
                    <span>Class {accountData.student_class}</span>
                  )}
                  {accountData.admission_number && (
                    <span>• Adm: {accountData.admission_number}</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAccountData(null);
                setEmailSent(false);
                setSubmittedTicketNo(null);
              }}
              className="text-[11px] h-7 px-2 text-slate-500 hover:text-slate-800"
            >
              Change
            </Button>
          </div>

          {/* Flow A: Dummy Student Email without Personal Mailbox */}
          {accountData.is_dummy_email && !accountData.has_personal_email ? (
            <div className="space-y-3.5">
              {/* Option 1: Default Password Reminder */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Student Default Password</span>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Student accounts are initialized with the default password:{" "}
                  <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-950 font-black">
                    Welcome@123
                  </strong>
                </p>
                {onUseDefaultPassword && (
                  <Button
                    type="button"
                    onClick={() => onUseDefaultPassword(accountData.admission_number || identifier)}
                    className="w-full h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                  >
                    Try Default Password Now
                  </Button>
                )}
              </div>

              {/* Option 2: Request Reset from Librarian */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <GraduationCap className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Request Reset from School Librarian</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  If you changed your password previously and forgot it, the librarian can reset it for you.
                </p>

                {submittedTicketNo ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1 animate-in zoom-in-95">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-emerald-900">Reset Request Dispatched!</p>
                    <p className="text-[11px] text-emerald-700">
                      Ticket Reference: <strong className="font-mono font-black">{submittedTicketNo}</strong>
                    </p>
                    <p className="text-[10px] text-emerald-600 pt-1">
                      The librarian has been notified and will reset your password.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Optional note for the librarian (e.g. Class 10-A Roll 14)"
                      value={studentNote}
                      onChange={(e) => setStudentNote(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-white"
                    />
                    <Button
                      type="button"
                      disabled={isSubmittingTicket}
                      onClick={handleRequestLibrarianReset}
                      className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
                    >
                      {isSubmittingTicket ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting Request…
                        </span>
                      ) : (
                        "Send Reset Request to Librarian"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Flow B: Real Email Available (Teacher / Staff / Registered Student) */
            <div className="space-y-3.5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Send Recovery Email</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We'll send a password recovery link to your registered email:
                </p>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 text-center select-all">
                  {accountData.masked_email || accountData.auth_email}
                </div>

                {emailSent ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-center animate-in zoom-in-95">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-emerald-900">Check Your Inbox!</p>
                    <p className="text-[11px] text-emerald-700">
                      A password reset link has been dispatched. Remember to check your Spam / Junk folder.
                    </p>
                    {cooldown > 0 ? (
                      <p className="text-[10px] text-slate-400 pt-1">
                        Resend available in <strong className="text-indigo-600 font-mono">{cooldown}s</strong>
                      </p>
                    ) : (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleSendEmail}
                        className="text-xs font-bold text-indigo-600 p-0 h-auto"
                      >
                        Resend Reset Link
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    disabled={isSendingEmail || cooldown > 0}
                    onClick={handleSendEmail}
                    className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
                  >
                    {isSendingEmail ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Dispatching Link…
                      </span>
                    ) : (
                      "Send Password Reset Link"
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Back to Login */}
      <div className="pt-2 text-center border-t border-slate-100">
        <Button
          variant="ghost"
          onClick={onBackToLogin}
          type="button"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Sign In
        </Button>
      </div>
    </div>
  );
};
