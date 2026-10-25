// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen, AlertCircle, ArrowLeft, Star, Eye, EyeOff, Sparkles,
  Shield, Zap, Lock, User, CheckCircle2, HelpCircle, GraduationCap,
  Trophy, Flame, Compass
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clearStoredAuthSession, isInvalidRefreshTokenError } from "@/lib/authCleanup";
import { ForgotPasswordView } from "@/components/auth/ForgotPasswordView";
import NotificationEmailDialog from "@/components/auth/NotificationEmailDialog";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";
import { LinkGoogleAccountModal } from "@/components/auth/LinkGoogleAccountModal";
import { LibraryBot } from "@/components/chat/LibraryBot";

const isTemporaryServiceFailure = (error: any) => {
  const rawStatus = error?.status ?? error?.context?.status;
  const status = rawStatus == null ? null : Number(rawStatus);
  const code = `${error?.code || ""}`.toUpperCase();
  const message = `${error?.message || ""} ${error?.name || ""}`.toLowerCase();
  return (status !== null && (status === 0 || status === 429 || status >= 500)) ||
    /^(08|57P|PGRST000|PGRST001|PGRST002)/.test(code) ||
    /failed to fetch|network error|timed? ?out|temporarily unavailable|service unavailable|server error|connection refused|upstream error|too many requests/.test(message);
};

const Login = () => {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegistrationNotice, setShowRegistrationNotice] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recentUsers, setRecentUsers] = useState<{ initials: string; color: string }[]>([]);
  const [pendingNotificationEmail, setPendingNotificationEmail] = useState<{ id: string; email?: string | null; role?: string } | null>(null);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const [unlinkedGoogleSession, setUnlinkedGoogleSession] = useState<{ email: string; id: string } | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async (session: any) => {
      if (!session?.user?.id || !mounted) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error && isTemporaryServiceFailure(error)) {
          setAuthUnavailable(true);
          return;
        }

        // Account is recognized if profile exists AND either has an admission number or is teacher/admin
        const isRecognized = profile && (Boolean(profile.admission_number) || profile.role === "admin" || profile.role === "teacher");

        if (isRecognized) {
          try {
            localStorage.setItem("dlms_user_profile", JSON.stringify(profile));
          } catch {}

          if (profile.role === "admin") navigate("/admin-dashboard", { replace: true });
          else if (profile.role === "teacher") navigate("/teacher-dashboard", { replace: true });
          else navigate("/student-dashboard", { replace: true });
        } else {
          // Google/OAuth session detected but not linked with a student admission number!
          const userEmail = session.user.email;
          if (userEmail) {
            setUnlinkedGoogleSession({ email: userEmail, id: session.user.id });
          }
        }
      } catch (err: any) {
        if (isTemporaryServiceFailure(err)) setAuthUnavailable(true);
      }
    };

    // 1. Mobile & PWA: Check URL search for PKCE auth code
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get("code");
    if (authCode) {
      supabase.auth.exchangeCodeForSession(authCode).then(({ data, error }) => {
        if (data?.session) {
          checkSession(data.session);
        }
      }).catch((err) => {
        console.warn("PKCE code exchange error:", err);
      });
    }

    // 2. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkSession(session);
    }).catch((error) => {
      if (isTemporaryServiceFailure(error)) setAuthUnavailable(true);
    });

    // 3. Listen to auth state changes (SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session) {
        checkSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const urlRef = searchParams.get("ref");
    if (urlRef) {
      try { localStorage.setItem("dlms_invite_ref", urlRef); } catch {}
    }
    if (searchParams.get("forgot") === "true") {
      setShowForgotPassword(true);
      const idParam = searchParams.get("identifier");
      if (idParam) setResetEmail(idParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadRecentUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("is_approved", true)
        .eq("role", "student")
        .order("created_at", { ascending: false })
        .limit(6);
      const palette = ["bg-indigo-400", "bg-violet-400", "bg-pink-400", "bg-sky-400", "bg-emerald-400", "bg-amber-400"];
      setRecentUsers(
        (data || []).map((u: any, i: number) => ({
          initials: `${(u.first_name || "?")[0]}${(u.last_name || "")[0] || ""}`.toUpperCase(),
          color: palette[i % palette.length],
        }))
      );
    };
    loadRecentUsers();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthUnavailable(false);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) {
        if (isTemporaryServiceFailure(error)) {
          setAuthUnavailable(true);
        } else {
          toast({
            title: "Google Sign-In Failed",
            description: error.message || "Failed to initialize Google sign-in.",
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      toast({
        title: "Google Sign-In Failed",
        description: err.message || "Could not connect to Google sign-in.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthUnavailable(false);
    if (!captchaToken) {
      toast({ title: "Verification required", description: "Complete the verification challenge before signing in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    if (!identifier || !password) {
      toast({ title: "Missing Information", description: "Please fill in all fields", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    try {
      const { data: userData, error: userError } = await supabase.rpc('find_user_by_identifier', { identifier });
      if (userError && isTemporaryServiceFailure(userError)) {
        setAuthUnavailable(true);
        setIsLoading(false);
        return;
      }
      if (userError || !userData || userData.length === 0) {
        toast({ title: "Login Failed", description: "Invalid credentials. Please check your email/username/phone and password.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const user = userData[0];
      if (!user.is_approved) {
        const isPolicyDeactivated = Boolean(user.community_warn_count && user.community_warn_count >= 3);
        toast({
          title: isPolicyDeactivated ? "Account Deactivated" : "Account Not Approved",
          description: isPolicyDeactivated
            ? "Your DLMS account has been deactivated due to repeated policy violations. Please contact the library administrator."
            : "Your account is pending admin approval.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
        options: { captchaToken },
      });
      if (error) {
        setCaptchaToken("");
        setCaptchaResetKey((key) => key + 1);
        if (isInvalidRefreshTokenError(error)) clearStoredAuthSession();
        const authMessage = error.message?.toLowerCase() || "";
        if (isTemporaryServiceFailure(error)) {
          setAuthUnavailable(true);
          setIsLoading(false);
          return;
        }
        const description = authMessage.includes("captcha")
          ? "Verification could not be confirmed. Please retry. If this continues, check that Turnstile is enabled for this Supabase project and its secret key matches this site key."
          : authMessage.includes("email not confirmed")
            ? "Please confirm your email address before signing in."
            : "Invalid credentials. Please check your email/username/phone and password.";
        toast({ title: "Login Failed", description, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (profile) {
        try { localStorage.setItem("dlms_user_profile", JSON.stringify(profile)); } catch {}
      }

      // --- Invite reward: claim +250 XP for BOTH user and inviter on first login ---
      let refCode = searchParams.get("ref");
      if (!refCode) {
        try { refCode = localStorage.getItem("dlms_invite_ref"); } catch {}
      }

      if (refCode && profile?.role === "student" && !(profile as any)?.invite_reward_claimed) {
        if (Number(profile.points || 0) > 0) {
          try { localStorage.removeItem("dlms_invite_ref"); } catch {}
        } else {
          try {
            const { data: claimResult, error: claimErr } = await supabase.rpc("claim_invite_reward", { p_code: refCode });
            if (!claimErr && claimResult && (claimResult as any).success) {
              try { localStorage.removeItem("dlms_invite_ref"); } catch {}
              const inviterName = (claimResult as any).inviter_name;
              toast({
                title: "🎉 +250 XP Welcome Bonus!",
                description: inviterName
                  ? `${inviterName} invited you — both of you earned 250 XP!`
                  : "You and your classmate both earned 250 XP!",
              });
              const { data: updatedProf } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
              if (updatedProf) {
                profile = updatedProf;
                try { localStorage.setItem("dlms_user_profile", JSON.stringify(updatedProf)); } catch {}
              }
            } else if (!claimErr && claimResult?.reason) {
              const reason = (claimResult as any).reason;
              if (reason === "already_claimed") {
                try { localStorage.removeItem("dlms_invite_ref"); } catch {}
              } else if (reason === "self_invite" || reason === "invalid_code") {
                try { localStorage.removeItem("dlms_invite_ref"); } catch {}
                toast({
                  title: "Invite could not be applied",
                  description: reason === "self_invite"
                    ? "You cannot claim a reward using your own invite link."
                    : "The invite link could not be matched to a student account. Ask your friend to share a fresh link.",
                  variant: "destructive",
                });
              }
            } else if (claimErr) {
              const { data: inviterRows } = await supabase.rpc("resolve_invite_code", { p_code: refCode });
              if (inviterRows && inviterRows.length > 0) {
                const inviterId = inviterRows[0].inviter_id;
                const { data: fallbackResult } = await supabase.rpc("claim_invite_reward", { p_inviter_id: inviterId });
                if (fallbackResult && (fallbackResult as any).success) {
                  try { localStorage.removeItem("dlms_invite_ref"); } catch {}
                  toast({
                    title: "🎉 +250 XP Welcome Bonus!",
                    description: "Invite reward credited successfully!",
                  });
                }
              }
            }
          } catch (inviteErr) {
            console.error("Invite claim error (non-fatal):", inviteErr);
          }
        }
      }

      const continueToDashboard = () => {
        switch (profile?.role) {
          case "admin": navigate("/admin-dashboard", { replace: true }); break;
          case "teacher": navigate("/teacher-dashboard", { replace: true }); break;
          case "student": navigate("/student-dashboard", { replace: true }); break;
          default: navigate("/", { replace: true });
        }
      };
      toast({ title: "Login Successful", description: "Welcome back!" });
      if (!profile?.needs_profile_update && !profile?.notification_email_confirmed_at) {
        setPendingNotificationEmail({ id: data.user.id, email: profile?.notification_email || profile?.email, role: profile?.role });
      } else {
        setTimeout(continueToDashboard, 100);
      }
    } catch (error) {
      setCaptchaToken("");
      setCaptchaResetKey((key) => key + 1);
      console.error('Login error:', error);
      if (isTemporaryServiceFailure(error)) {
        setAuthUnavailable(true);
        setIsLoading(false);
        return;
      }
      toast({ title: "Login Failed", description: "An unexpected error occurred", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-dvh w-full overflow-x-hidden bg-background">
      {/* Left Panel - Premium Brand Showcase (Desktop >= lg) */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white select-none">
        {/* Subtle grid texture & glowing mesh background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12 w-full">
          {/* School Header & Dual Logos */}
          <div className="flex items-center gap-3.5">
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 shadow-lg backdrop-blur-md">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-xs" title="PM SHRI Logo">
                <img
                  src="/logos/pm-shri.png"
                  alt="PM SHRI"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                    (e.target as HTMLElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <Sparkles className="absolute hidden h-5 w-5 text-amber-500" />
              </div>
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-xs" title="KV Logo">
                <img
                  src="/logos/kv.png"
                  alt="KV"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                    (e.target as HTMLElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <BookOpen className="absolute hidden h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wider uppercase text-white">PM SHRI KV AFS SULUR</h1>
                <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2 py-0.2 rounded-full">
                  DLMS
                </span>
              </div>
              <p className="text-xs text-white/70">Digital Library Management System</p>
            </div>
          </div>

          {/* Core Visual Value Pitch */}
          <div className="max-w-lg py-8 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/15 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Next-Gen Academic Super-App</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
                Read. Compete.<br />
                <span className="bg-gradient-to-r from-amber-300 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
                  Earn Prestige.
                </span>
              </h2>
              <p className="text-white/70 text-sm xl:text-base leading-relaxed">
                Connect your admission credentials to log reading hours, earn streak multipliers, and join school-wide quiz leagues.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="space-y-3 pt-2">
              {[
                {
                  icon: Flame,
                  title: "Daily Login Streaks",
                  desc: "Claim daily XP bonuses and maintain your reading streak",
                  color: "text-amber-400 bg-amber-400/15 border-amber-400/30",
                },
                {
                  icon: BookOpen,
                  title: "5,000+ Books & NCERT E-Books",
                  desc: "Full library search, issue history, and curriculum textbooks",
                  color: "text-sky-400 bg-sky-400/15 border-sky-400/30",
                },
                {
                  icon: Trophy,
                  title: "Live Quiz Leagues & Rewards",
                  desc: "Test your skills, unlock badge vault honors, and climb rank",
                  color: "text-purple-400 bg-purple-400/15 border-purple-400/30",
                },
              ].map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${feat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white">{feat.title}</h3>
                      <p className="text-[11px] text-white/60 leading-snug">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Proof Footer */}
          <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <div className="flex -space-x-2">
              {recentUsers.length > 0
                ? recentUsers.slice(0, 5).map((u, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full ${u.color} border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-xs`}
                    >
                      {u.initials}
                    </div>
                  ))
                : ["KV", "AF", "SU", "LU", "R"].map((initials, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white"
                    >
                      {initials}
                    </div>
                  ))}
            </div>
            <p className="text-xs text-white/70">
              Join <strong className="text-white font-bold">1,200+ students & staff</strong> active on DLMS
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12 relative overflow-y-auto min-h-dvh">
        {/* Subtle decorative radial glow behind form */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-[420px] space-y-6">
          {/* Mobile Header (Hidden on lg) */}
          <div className="flex flex-col items-center text-center gap-2.5 lg:hidden">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 border border-border/80 shadow-xs">
              <div className="h-9 w-9 p-0.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
              <div className="h-9 w-9 p-0.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                <img src="/logos/kv.png" alt="KV" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
            </div>
            <div>
              <h2 className="text-base font-black text-foreground uppercase tracking-tight">PM SHRI KV AFS SULUR</h2>
              <p className="text-xs text-muted-foreground">Digital Library Management System</p>
            </div>
          </div>

          {/* Form Card Container */}
          <div className="rounded-3xl border border-border/70 bg-card/80 p-6 sm:p-7 shadow-xl shadow-primary/5 backdrop-blur-xl">
            {!showForgotPassword && (
              <div className="mb-5 space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Sign In
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Welcome back! Enter your credentials to access your dashboard.
                </p>
              </div>
            )}

            {showForgotPassword ? (
              <ForgotPasswordView
                initialIdentifier={resetEmail || identifier}
                onBackToLogin={() => setShowForgotPassword(false)}
                onUseDefaultPassword={(adm) => {
                  setIdentifier(adm);
                  setPassword("Welcome@123");
                  setShowForgotPassword(false);
                  toast({
                    title: "Default Password Loaded",
                    description: "Your admission number and default password Welcome@123 have been prefilled. Click Sign In to log in.",
                  });
                }}
              />
            ) : (
              <div className="space-y-4">
                {/* Google Sign-in Option */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  className="h-11 sm:h-12 w-full rounded-2xl border border-border/80 bg-background hover:bg-muted font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
                >
                  {isGoogleLoading ? (
                    <span className="flex items-center gap-2 text-foreground">
                      <span className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                      Connecting Google...
                    </span>
                  ) : (
                    <>
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="text-foreground">Continue with Google</span>
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-3 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/70" />
                  </div>
                  <div className="relative bg-card px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Or sign in with ID
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {authUnavailable && (
                    <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 rounded-2xl">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-xs leading-relaxed">
                        Sign-in service is temporarily busy. Please wait a minute and retry.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Admission / Identifier Field */}
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Admission No. / Email / Phone</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="5-digit Admission No. (e.g. 13412)"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="h-11 sm:h-12 rounded-2xl bg-background/80 border-border/80 text-sm focus-visible:ring-primary shadow-2xs pl-3.5"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Password</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 sm:h-12 rounded-2xl bg-background/80 border-border/80 pr-11 text-sm focus-visible:ring-primary shadow-2xs pl-3.5"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Student Quick Helper Tip */}
                  <div className="rounded-xl bg-primary/5 border border-primary/15 p-2.5 flex items-start gap-2 text-[11px] text-muted-foreground leading-snug">
                    <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      First time login? Use your <strong>5-digit Admission No.</strong> as username and default password <strong>Welcome@123</strong>.
                    </span>
                  </div>

                  {/* Turnstile Captcha */}
                  <TurnstileCaptcha onToken={setCaptchaToken} resetKey={captchaResetKey} />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="h-11 sm:h-12 w-full rounded-2xl gradient-primary border-0 text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99] text-white"
                    disabled={isLoading || !captchaToken}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In to DLMS →"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* Bottom Account Links */}
            <div className="mt-5 pt-4 border-t border-border/60 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setShowRegistrationNotice(true)}
                  className="font-bold text-primary hover:underline ml-0.5"
                >
                  Create Account
                </button>
              </p>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Registration Notice Modal */}
      {showRegistrationNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="registration-notice-title">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 sm:p-7 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h2 id="registration-notice-title" className="text-lg font-black text-foreground">
                Student Accounts Pre-Created
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                All student library accounts are already active. Simply log in with your <strong>5-digit admission number</strong> and default password <strong>Welcome@123</strong>.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl font-bold h-10"
                onClick={() => setShowRegistrationNotice(false)}
              >
                Got It
              </Button>
              <Button
                className="flex-1 rounded-2xl font-bold h-10 bg-primary hover:bg-primary/90 text-white"
                onClick={() => navigate("/register")}
              >
                Register Other
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Notification Email Dialog */}
      {pendingNotificationEmail && (
        <NotificationEmailDialog
          open
          userId={pendingNotificationEmail.id}
          currentEmail={pendingNotificationEmail.email}
          onComplete={() => {
            const role = pendingNotificationEmail.role;
            setPendingNotificationEmail(null);
            if (role === "admin") navigate("/admin-dashboard", { replace: true });
            else if (role === "teacher") navigate("/teacher-dashboard", { replace: true });
            else if (role === "student") navigate("/student-dashboard", { replace: true });
            else navigate("/", { replace: true });
          }}
        />
      )}

      {/* Google Account Linking Modal */}
      {unlinkedGoogleSession && (
        <LinkGoogleAccountModal
          open={Boolean(unlinkedGoogleSession)}
          googleEmail={unlinkedGoogleSession.email}
          onSuccess={(studentProfile) => {
            setUnlinkedGoogleSession(null);
            const role = studentProfile?.role || "student";
            if (role === "admin") navigate("/admin-dashboard", { replace: true });
            else if (role === "teacher") navigate("/teacher-dashboard", { replace: true });
            else navigate("/student-dashboard", { replace: true });
          }}
          onCancel={async () => {
            try {
              await supabase.auth.signOut();
            } catch {}
            setUnlinkedGoogleSession(null);
          }}
        />
      )}

      <LibraryBot
        context="login"
        suggestedPrompts={[
          "Show me the login steps",
          "I need my 5-digit admission number",
          "Forgot my password",
          "Sign in is not working",
          "Check service status",
          "About the Developer",
          "Who is the Principal?",
          "Who is the Librarian?"
        ]}
      />
    </div>
  );
};

export default Login;
