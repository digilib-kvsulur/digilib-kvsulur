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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        let cachedRole: string | null = null;
        try {
          const cached = localStorage.getItem("dlms_user_profile");
          if (cached) cachedRole = JSON.parse(cached)?.role;
        } catch {}

        if (cachedRole) {
          switch (cachedRole) {
            case "admin": navigate("/admin-dashboard", { replace: true }); return;
            case "teacher": navigate("/teacher-dashboard", { replace: true }); return;
            case "student": navigate("/student-dashboard", { replace: true }); return;
          }
        }

        supabase.from("profiles").select("role").eq("id", session.user.id).single().then(({ data }) => {
          if (data?.role === "admin") navigate("/admin-dashboard", { replace: true });
          else if (data?.role === "teacher") navigate("/teacher-dashboard", { replace: true });
          else navigate("/student-dashboard", { replace: true });
        });
      }
    }).catch((error) => {
      if (isTemporaryServiceFailure(error)) setAuthUnavailable(true);
    });
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
              title: "🎉 +250 XP Welcome Bonus!",
              description: inviterName
                ? `${inviterName} invited you — both of you earned 250 XP!`
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
                  ? "You can’t claim a reward using your own invite link."
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
            <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
              {authUnavailable && (
                <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">
                    Sign-in services are temporarily unavailable or busy. Please be patient, wait a few minutes, and try again. Your password may still be correct; you do not need to reset it because of this message.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span><strong className="text-foreground font-semibold">Students:</strong> Sign in with your 5-digit Admission No.</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-xs sm:text-sm font-medium text-foreground">Admission No. / Email / Phone</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="e.g. 12345 or your email"
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
      <LibraryBot
        context="login"
        suggestedPrompts={["Show me the login steps", "I need my 5-digit admission number", "Forgot my password", "Sign in is not working", "Check service status", "Recent Championship Winners", "About the Developer", "Who is the Principal?", "Who is the Librarian?"]}
      />
    </div>
  );
};

export default Login;
