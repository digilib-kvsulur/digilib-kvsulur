import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Loader2,
  Mail,
  Lock,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfilePasswordResetCardProps {
  userEmail?: string;
  googleEmail?: string;
}

export default function ProfilePasswordResetCard({ userEmail, googleEmail }: ProfilePasswordResetCardProps) {
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: window.location.href,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Google Linking Failed",
        description: err.message || "Failed to link Google account.",
        variant: "destructive",
      });
      setLinkingGoogle(false);
    }
  };

  // Requirements checks
  const requirements = [
    { id: "length", label: "At least 8 characters", met: newPassword.length >= 8 },
    { id: "lower", label: "One lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
    { id: "upper", label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
    { id: "number", label: "One number (0-9)", met: /[0-9]/.test(newPassword) },
    { id: "special", label: "One special symbol (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isStrongEnough = newPassword.length >= 8 && metCount >= 3;
  const canSubmit = isStrongEnough && isMatch && !updating;

  const getStrength = () => {
    if (!newPassword) return { percent: 0, text: "Enter password", color: "bg-muted", textCol: "text-muted-foreground" };
    if (metCount <= 1) return { percent: 20, text: "Very Weak", color: "bg-red-500", textCol: "text-red-500" };
    if (metCount === 2) return { percent: 40, text: "Weak", color: "bg-orange-500", textCol: "text-orange-500" };
    if (metCount === 3) return { percent: 60, text: "Moderate", color: "bg-amber-500", textCol: "text-amber-500" };
    if (metCount === 4) return { percent: 80, text: "Strong", color: "bg-indigo-500", textCol: "text-indigo-500" };
    return { percent: 100, text: "Very Strong", color: "bg-emerald-500", textCol: "text-emerald-500" };
  };

  const strength = getStrength();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated Successfully! ðŸ”",
        description: "Your new password has been saved. Please use it on your next login.",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Failed to Update Password",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendRecoveryEmail = async () => {
    if (!userEmail) {
      toast({
        title: "No Email Found",
        description: "Your profile does not have a registered email.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.functions.invoke("send-password-reset", {
        body: { identifier: userEmail, redirectTo: redirectUrl },
      });
      if (error) throw error;

      toast({
        title: "Reset Link Sent! âœ‰ï¸",
        description: `We've sent a password reset link to ${userEmail}.`,
      });
    } catch (err: any) {
      const isRateLimit = err.message?.toLowerCase().includes("rate limit") || err.status === 429;
      toast({
        title: isRateLimit ? "Email Rate Limit" : "Failed to Send Email",
        description: isRateLimit
          ? "Supabase email rate limit reached. Please wait a few minutes before requesting another email."
          : err.message || "Could not send reset email.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Card className="border-border/40 bg-card/80 backdrop-blur-md shadow-md">
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-indigo-500" /> Security & Password
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Set a custom new password or send a recovery link to your registered email
            </CardDescription>
          </div>
          {userEmail && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendRecoveryEmail}
              disabled={sendingEmail}
              className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-border/60 hover:bg-muted/40"
            >
              {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 text-indigo-500" />}
              Send Reset Link to Email
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {/* Google Sign-in Connection Status */}
        <div className="rounded-xl border border-border/50 bg-muted/30 p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border/60 shadow-xs shrink-0">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Google Account
                  {googleEmail ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Not Linked
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {googleEmail ? googleEmail : "Link your Google account for easy 1-click sign-in"}
                </p>
              </div>
            </div>

            {!googleEmail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
                className="rounded-lg text-xs font-semibold shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {linkingGoogle ? "Connecting..." : "Link Google Account"}
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" /> New Password
              </Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 rounded-lg h-9 text-sm border-border/60"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-500" /> Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 rounded-lg h-9 text-sm border-border/60"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Password strength & requirements */}
          {newPassword.length > 0 && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Strength:</span>
                <span className={`font-bold ${strength.textCol}`}>{strength.text}</span>
              </div>
              <Progress value={strength.percent} className="h-1.5 bg-border/40" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                {requirements.map((req) => (
                  <div key={req.id} className="flex items-center gap-1.5">
                    {req.met ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-1" />
                    )}
                    <span className={req.met ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>

              {confirmPassword.length > 0 && (
                <div className="pt-1 border-t border-border/20 flex items-center gap-1.5 text-xs">
                  {isMatch ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-destructive font-semibold flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold text-xs gap-1.5 px-5"
            >
              {updating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Password...
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" /> Update Password
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
