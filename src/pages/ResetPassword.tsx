import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Info
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isVerifying, setIsVerifying] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // 1. Thorough session and recovery token verification
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        setIsVerifying(true);
        setError(null);

        // Check if there is an error in the URL hash (Supabase implicit flow error format)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
          const errorDesc = hashParams.get("error_description");
          const errorType = hashParams.get("error");
          if (errorDesc || errorType) {
            if (isMounted) {
              setError(
                errorDesc?.replace(/\+/g, " ") ||
                "This password reset link has expired or has already been used. Please request a new one."
              );
              setIsVerifying(false);
            }
            return;
          }
        }

        // Check URL query parameters for PKCE code or OTP token_hash
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const code = searchParams.get("code");
        const queryError = searchParams.get("error_description") || searchParams.get("error");

        if (queryError) {
          if (isMounted) {
            setError(queryError.replace(/\+/g, " ") || "The reset link is invalid or expired.");
            setIsVerifying(false);
          }
          return;
        }

        // Verify OTP if token_hash is present
        if (tokenHash && type === "recovery") {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (otpError) {
            console.warn("OTP verification error:", otpError.message);
            if (isMounted) {
              setError("This password reset link is invalid or has expired. Please request a new one.");
              setIsVerifying(false);
            }
            return;
          }
        } else if (code) {
          // Exchange PKCE code for session
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (codeError) {
            console.warn("Code exchange error:", codeError.message);
            if (isMounted) {
              setError("This verification code is invalid or has expired. Please request a new one.");
              setIsVerifying(false);
            }
            return;
          }
        }

        // Check current session state
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setSessionValid(true);
          setIsVerifying(false);
          // Clean the sensitive hash / token from address bar without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // Give onAuthStateChange a short window to process any in-flight recovery tokens
        const timeout = setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (isMounted) {
            if (retrySession) {
              setSessionValid(true);
            } else {
              setError("This password reset link has expired or is invalid. Please request a new one.");
            }
            setIsVerifying(false);
          }
        }, 1200);

        return () => clearTimeout(timeout);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to verify reset link. Please request a new one.");
          setIsVerifying(false);
        }
      }
    };

    // Listen to Supabase Auth state changes for PASSWORD_RECOVERY or SIGNED_IN
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        if (isMounted) {
          setSessionValid(true);
          setIsVerifying(false);
          setError(null);
        }
      }
    });

    verifySession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  // 2. Countdown redirect on success
  useEffect(() => {
    if (!isDone) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isDone, navigate]);

  // 3. Password Requirements & Strength Calculation
  const requirements: PasswordRequirement[] = [
    { id: "length", label: "At least 8 characters", met: password.length >= 8 },
    { id: "lower", label: "One lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { id: "upper", label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { id: "number", label: "One number (0-9)", met: /[0-9]/.test(password) },
    { id: "special", label: "One special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const isMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isValid = metCount >= 4 && isMatch;

  const getStrengthLabel = () => {
    if (metCount <= 1) return { text: "Very Weak", color: "bg-red-500", textCol: "text-red-600", width: "20%" };
    if (metCount === 2) return { text: "Weak", color: "bg-orange-500", textCol: "text-orange-600", width: "40%" };
    if (metCount === 3) return { text: "Fair", color: "bg-amber-500", textCol: "text-amber-600", width: "60%" };
    if (metCount === 4) return { text: "Strong", color: "bg-indigo-600", textCol: "text-indigo-600", width: "80%" };
    return { text: "Very Strong", color: "bg-emerald-600", textCol: "text-emerald-600", width: "100%" };
  };

  const strength = getStrengthLabel();

  // 4. Handle Password Update
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setIsDone(true);
      toast({
        title: "Password Updated Successfully!",
        description: "You can now sign in with your new password.",
      });

      // Clear sensitive address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again or request a new link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/70 py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-3">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">PM SHRI KV AFS SULUR</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Digital Library Security</p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden">
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

          {isVerifying ? (
            /* Verifying Token State */
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Verifying Security Link</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Validating your password reset token with the library authentication server…
                </p>
              </div>
            </div>
          ) : isDone ? (
            /* Success State */
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Security Verified
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Password Reset!</h2>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Your new password has been saved securely. Redirecting to login in{" "}
                  <span className="font-extrabold text-indigo-600 font-mono">{countdown}</span>s…
                </p>
              </div>

              <div className="pt-3">
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
                >
                  Sign In Now
                </Button>
              </div>
            </div>
          ) : error && !sessionValid ? (
            /* Expired / Invalid Token State */
            <div className="py-4 space-y-5">
              <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600">
                <AlertCircle className="h-7 w-7" />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">Link Expired or Invalid</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
                  {error}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2 font-semibold text-slate-700">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Why does this happen?</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-500">
                  <li>Password reset links can only be used once.</li>
                  <li>Links automatically expire after 1 hour for security.</li>
                  <li>A newer reset link may have been requested.</li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => navigate("/login?forgot=true")}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
                >
                  Request a New Reset Link
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className="w-full h-10 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Sign In
                </Button>
              </div>
            </div>
          ) : (
            /* Set New Password Form */
            <>
              <div className="mb-6">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600 shadow-xs">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Set New Password</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create a strong, memorable password for your KV Sulur DLMS account.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-5 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl pr-10 border-slate-200 focus-visible:ring-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Password Strength:</span>
                      <span className={`font-bold ${strength.textCol}`}>{strength.text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>

                    {/* Requirements Checklist */}
                    <div className="grid grid-cols-1 gap-1 pt-1.5">
                      {requirements.map((req) => (
                        <div key={req.id} className="flex items-center gap-2 text-[11px]">
                          {req.met ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                          )}
                          <span className={req.met ? "text-emerald-700 font-medium" : "text-slate-500"}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`h-11 rounded-xl pr-10 border-slate-200 focus-visible:ring-indigo-500 ${
                        isMatch
                          ? "border-emerald-400 focus-visible:ring-emerald-500"
                          : isMismatch
                          ? "border-red-300 focus-visible:ring-red-400"
                          : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium">
                      {isMatch ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                          <Check className="h-3.5 w-3.5" /> Passwords match perfectly
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <X className="h-3.5 w-3.5" /> Passwords do not match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="w-full h-11 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving Password…
                    </span>
                  ) : (
                    "Reset & Save Password"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Remember your password? Sign in
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
