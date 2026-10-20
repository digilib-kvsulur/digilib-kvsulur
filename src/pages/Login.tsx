// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, AlertCircle, ArrowLeft, Star, Eye, EyeOff, Sparkles, Shield, Zap } from "lucide-react";
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
        try {
          // Call claim_invite_reward(p_code) which credits both claimer and inviter atomically
          const { data: claimResult, error: claimErr } = await supabase.rpc("claim_invite_reward", { p_code: refCode });
          if (!claimErr && claimResult && (claimResult as any).success) {
            try { localStorage.removeItem("dlms_invite_ref"); } catch {}
            const inviterName = (claimResult as any).inviter_name;
            toast({
              title: "ðŸŽ‰ +250 XP Welcome Bonus!",
              description: inviterName
                ? `${inviterName} invited you â€” both of you earned 250 XP!`
                : "You and your classmate both earned 250 XP!",
            });
            // Refresh profile so updated points are reflected in local storage and state immediately
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
                  ? "You canâ€™t claim a reward using your own invite link."
                  : "The invite link could not be matched to a student account. Ask your friend to share a fresh link.",
                variant: "destructive",
              });
            }
          } else if (claimErr) {
            // Fallback for older database schema using p_inviter_id
            const { data: inviterRows } = await supabase.rpc("resolve_invite_code", { p_code: refCode });
            if (inviterRows && inviterRows.length > 0) {
              const inviterId = inviterRows[0].inviter_id;
              const { data: fallbackResult } = await supabase.rpc("claim_invite_reward", { p_inviter_id: inviterId });
              if (fallbackResult && (fallbackResult as any).success) {
                try { localStorage.removeItem("dlms_invite_ref"); } catch {}
                toast({
                  title: "ðŸŽ‰ +250 XP Welcome Bonus!",
                  description: "Invite reward credited successfully!",
                });
              }
            }
          }
        } catch (inviteErr) {
          console.error("Invite claim error (non-fatal):", inviteErr);
        }
      }
      // --- End invite reward ---

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
    <div className="flex min-h-dvh animate-in fade-in duration-300 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* Left Panel - Immersive Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0VjZoLTJ2OGgtOFYyaC0ydjEyaDEwem0wIDBoLTJ2OGgtOHYtOGgtMnYxMGgxMlYxNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="absolute inset-y-0 right-0 z-10 w-2 bg-indigo-700/90" />
        
        <div className="absolute top-10 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10 w-full">
          <div className="flex items-center gap-3">
            {/* Dual Logo Placeholders */}
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 shadow-sm backdrop-blur-sm">
              {/* PM SHRI Logo Slot */}
              <div className="relative flex h-10 w-10 items-center justify-center" title="PM SHRI Logo">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="relative z-10 h-full w-full object-contain drop-shadow-sm" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <Sparkles className="h-5 w-5 text-amber-500 absolute hidden" />
              </div>
              {/* KV Logo Slot */}
              <div className="relative z-10 flex h-10 w-10 items-center justify-center" title="KV Logo">
                <img src="/logos/kv.png" alt="KV" className="relative z-10 h-full w-full object-contain drop-shadow-sm" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <BookOpen className="h-5 w-5 text-indigo-600 absolute hidden" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-foreground leading-tight">PM SHRI KV AFS SULUR</h1>
              <p className="text-xs text-primary-foreground/70">Digital Library Management System</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center max-w-md py-4">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-primary-foreground mb-3 leading-tight">
              Your Reading<br />Adventure<br />Starts Here ✨
            </h2>
            <p className="text-primary-foreground/80 text-base xl:text-lg mb-6">
              Track progress, earn rewards, and discover new worlds through reading.
            </p>
            <div className="space-y-4">
              {[
                { icon: Sparkles, title: "Gamified Experience", desc: "Earn XP, level up, and unlock achievements" },
                { icon: Shield, title: "Smart Tracking", desc: "AI-powered reading analytics and insights" },
                { icon: Zap, title: "Daily Challenges", desc: "Complete missions and climb the leaderboard" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/25 transition-colors shrink-0">
                    <item.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary-foreground">{item.title}</h3>
                    <p className="text-xs text-primary-foreground/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {recentUsers.length > 0
                ? recentUsers.slice(0, 5).map((u, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${u.color} border-2 border-white/40 flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                      {u.initials}
                    </div>
                  ))
                : [...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-[10px] font-bold text-primary-foreground backdrop-blur-sm">
                      {['R', 'A', 'V', 'K'][i]}
                    </div>
                  ))
              }
            </div>
            <p className="text-xs text-primary-foreground/70">
              {recentUsers.length > 0 ? `${recentUsers.length * 80}+ active readers` : "Join 500+ active readers"}
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex-1 overflow-y-auto bg-gradient-to-br from-muted/50 via-background to-primary/5 px-4 py-4 sm:px-8 sm:py-6 lg:flex lg:items-center lg:justify-center lg:px-6 lg:py-3">
        <div className="mx-auto flex min-h-full w-full max-w-[460px] flex-col justify-center animate-fade-in lg:min-h-0 lg:py-2">
          {/* Mobile Logo */}
          <div className="mb-4 flex items-center gap-3 px-1 lg:hidden sm:mb-5">
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white p-1 shadow-xs" title="PM SHRI Logo">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <Sparkles className="absolute hidden h-4 w-4 text-amber-500" />
              </div>
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white p-1 shadow-xs" title="KV Logo">
                <img src="/logos/kv.png" alt="KV" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden'); }} />
                <BookOpen className="absolute hidden h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-foreground">PM SHRI KV AFS SULUR</h1>
              <p className="text-[11px] text-muted-foreground">Digital Library Management System</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-xl shadow-primary/5 backdrop-blur sm:rounded-3xl sm:p-6 lg:p-5">
          {!showForgotPassword && (
            <div className="mb-4 sm:mb-5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Sign In</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Access your library account</p>
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
            <div className="space-y-3.5 sm:space-y-4">
              {/* Google Sign-in Option */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
                className="h-11 sm:h-12 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
              >
                {isGoogleLoading ? (
                  <span className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <span className="w-4 h-4 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin" />
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
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">Continue with Google</span>
                  </>
                )}
              </Button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative bg-card/95 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Or sign in with ID
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
                {authUnavailable && (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs leading-relaxed">
                      Sign-in services are temporarily unavailable or busy. Please be patient, wait a few minutes, and try again. Your password may still be correct; you do not need to reset it because of this message.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-xs sm:text-sm font-medium text-foreground">Admission No. / Email / Phone</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="5-digit Admission No. or email / phone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 rounded-xl bg-background/90 border-border/80 text-sm sm:h-12"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-foreground">Password</Label>
                    <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary" onClick={() => setShowForgotPassword(true)} type="button">
                      Forgot password?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl bg-background/90 border-border/80 pr-11 text-sm sm:h-12" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <TurnstileCaptcha onToken={setCaptchaToken} resetKey={captchaResetKey} />

                <Button type="submit" className="h-11 w-full rounded-xl gradient-primary border-0 text-sm sm:text-base font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.99] sm:h-12" disabled={isLoading || !captchaToken}>
                  {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Signing in...</span> : 'Sign In'}
                </Button>
              </form>
            </div>
          )}

          <div className="mt-4 pt-3.5 border-t border-border/60 text-center sm:mt-5 sm:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button variant="link" className="p-0 h-auto text-primary font-semibold text-xs sm:text-sm hover:underline" onClick={() => setShowRegistrationNotice(true)}>
                Create Account
              </Button>
            </p>
          </div>

          <div className="text-center mt-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Home
            </Button>
          </div>
          </div>
        </div>
      </div>
      {showRegistrationNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-5" role="dialog" aria-modal="true" aria-labelledby="registration-notice-title">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 id="registration-notice-title" className="text-xl font-extrabold text-slate-900">Student accounts are ready</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">All student users have already been created. Use your 5-digit admission number and the default password <strong>Welcome@123</strong> to log in.</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowRegistrationNotice(false)}>Close</Button>
              <Button className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate('/register')}>Continue</Button>
            </div>
          </div>
        </div>
      )}
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
        suggestedPrompts={["Show me the login steps", "I need my 5-digit admission number", "Forgot my password", "Sign in is not working", "Check service status", "Recent Championship Winners", "About the Developer", "Who is the Principal?", "Who is the Librarian?"]}
      />
    </div>
  );
};

export default Login;
