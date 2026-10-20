import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Link2, Sparkles, LogOut, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LinkGoogleAccountModalProps {
  open: boolean;
  googleEmail: string;
  onSuccess: (studentProfile: any) => void;
  onCancel: () => void;
}

export const LinkGoogleAccountModal = ({
  open,
  googleEmail,
  onSuccess,
  onCancel,
}: LinkGoogleAccountModalProps) => {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  if (!open) return null;

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const adm = admissionNumber.trim();
    const pass = password.trim();

    if (!adm || !pass) {
      setErrorMsg("Please enter both your Admission Number and Password.");
      return;
    }

    setLoading(true);
    try {
      // 1. Invoke the secure Edge Function
      const { data, error } = await supabase.functions.invoke("link-student-google-account", {
        body: {
          admission_number: adm,
          password: pass,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to link account");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "🎉 Google Account Linked!",
        description: `Your Google account (${googleEmail}) is now linked to Admission No. ${adm}.`,
      });

      // 2. Sign in with the student's credentials so the active session is the student
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.student?.email || googleEmail,
        password: pass,
      });

      if (signInErr) {
        // Fallback: if session already updated or need to refetch profile
        console.warn("Post-link auto-login warning:", signInErr);
      }

      // Fetch the updated student profile
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("admission_number", adm)
        .maybeSingle();

      if (updatedProfile) {
        try {
          localStorage.setItem("dlms_user_profile", JSON.stringify(updatedProfile));
        } catch {}
      }

      onSuccess(updatedProfile || data.student);
    } catch (err: any) {
      console.error("Account linking error:", err);
      setErrorMsg(err.message || "Failed to link Google account. Please verify your credentials.");
      toast({
        title: "Linking Failed",
        description: err.message || "Could not link account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-card border border-border/80 p-6 shadow-2xl sm:p-7 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h2 id="link-modal-title" className="text-xl font-bold tracking-tight text-foreground">
              Link Student Account
            </h2>
            <p className="text-xs text-muted-foreground">
              Connect your Google sign-in to your library ID
            </p>
          </div>
        </div>

        {/* Current Google email pill */}
        <div className="rounded-xl bg-muted/60 border border-border/70 p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="truncate font-medium text-foreground">{googleEmail}</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Authenticated
          </span>
        </div>

        {errorMsg && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLink} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="link-admission-number" className="text-xs font-semibold text-foreground">
              Admission Number
            </Label>
            <Input
              id="link-admission-number"
              type="text"
              placeholder="e.g. 12345"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="h-11 rounded-xl bg-background border-border/80 text-sm"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="link-password" className="text-xs font-semibold text-foreground">
                Password
              </Label>
              <span className="text-[11px] text-muted-foreground">Default: Welcome@123</span>
            </div>
            <div className="relative">
              <Input
                id="link-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your student password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl bg-background border-border/80 pr-11 text-sm"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              Once linked, you can sign in anytime with just one click using Google!
            </span>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              className="h-11 w-full rounded-xl gradient-primary font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Verifying & Linking...
                </span>
              ) : (
                "Verify & Link Account"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
              onClick={onCancel}
              disabled={loading}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" /> Use different Google account / Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default LinkGoogleAccountModal;
