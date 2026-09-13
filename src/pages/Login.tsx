import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen, AlertCircle, ArrowLeft, Star, Eye, EyeOff,
  Sparkles, Shield, Zap, CheckCircle2, Award, Users,
  Video, KeyRound, HelpCircle, GraduationCap, Check
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { clearStoredAuthSession, isInvalidRefreshTokenError } from "@/lib/authCleanup";
import { ForgotPasswordView } from "@/components/auth/ForgotPasswordView";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegistrationNotice, setShowRegistrationNotice] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [selectedRoleTab, setSelectedRoleTab] = useState<"student" | "teacher" | "admin">("student");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recentUsers, setRecentUsers] = useState<{ initials: string; color: string; name: string }[]>([]);

  useEffect(() => {
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
      const palette = ["bg-indigo-500", "bg-violet-500", "bg-rose-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500"];
      setRecentUsers(
        (data || []).map((u: any, i: number) => ({
          initials: `${(u.first_name || "?")[0]}${(u.last_name || "")[0] || ""}`.toUpperCase(),
          color: palette[i % palette.length],
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
        }))
      );
    };
    loadRecentUsers();
  }, []);

  // Detect identifier type for real-time visual feedback
  const getIdentifierType = () => {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    if (/^\d{4,6}$/.test(trimmed)) {
      return { type: "student", label: "Student Admission No. 🎓", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" };
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { type: "email", label: "Email Address ✉️", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" };
    }
    if (/^\+?\d{10,13}$/.test(trimmed)) {
      return { type: "phone", label: "Phone Number 📱", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" };
    }
    return { type: "username", label: "Username 👤", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" };
  };

  const detectedType = getIdentifierType();

  // Monitor Caps Lock key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!identifier || !password) {
      toast({ title: "Missing Information", description: "Please fill in all fields", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    try {
      const { data: userData, error: userError } = await supabase.rpc('find_user_by_identifier', { identifier });
      if (userError || !userData || userData.length === 0) {
        toast({ title: "Login Failed", description: "Invalid credentials. Please check your admission no / email / username and password.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const user = userData[0];
      if (!user.is_approved) {
        toast({ title: "Account Not Approved", description: "Your account is pending admin approval.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (error) {
        if (isInvalidRefreshTokenError(error)) clearStoredAuthSession();
        toast({ title: "Login Failed", description: "Invalid password. Please check your password or use default password.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      toast({ title: "Login Successful! 🎉", description: `Welcome back, ${profile?.first_name || 'Reader'}!` });
      setTimeout(() => {
        switch (profile?.role) {
          case "admin": navigate("/admin-dashboard", { replace: true }); break;
          case "teacher": navigate("/teacher-dashboard", { replace: true }); break;
          case "student": navigate("/student-dashboard", { replace: true }); break;
          default: navigate("/", { replace: true });
        }
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: "Login Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const applyStudentQuickFill = () => {
    setPassword("Welcome@123");
    toast({
      title: "Default Password Filled ✨",
      description: "Default student password 'Welcome@123' inserted. Enter your 5-digit Admission No to sign in.",
    });
  };

  return (
    <div className="min-h-screen flex animate-in fade-in duration-300 bg-background">
      {/* Left Panel - Immersive Branding & Showcase */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white">
        {/* Ambient background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(244,63,94,0.2),transparent_40%)]" />
        <div className="absolute top-10 -left-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE0VjZoLTJ2OGgtOFYyaC0ydjEyaDEwem0wIDBoLTJ2OGgtOHYtOGgtMnYxMGgxMlYxNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Header Branding */}
          <div className="flex items-center gap-3.5">
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 shadow-lg backdrop-blur-md">
              <div className="relative flex h-11 w-11 items-center justify-center">
                <img
                  src="/logos/pm-shri.png"
                  alt="PM SHRI"
                  className="h-full w-full object-contain drop-shadow"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div className="relative flex h-11 w-11 items-center justify-center">
                <img
                  src="/logos/kv.png"
                  alt="KV"
                  className="h-full w-full object-contain drop-shadow"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-white tracking-wide">PM SHRI KV AFS SULUR</h1>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[9px] px-1.5 h-4">DLMS 2.0</Badge>
              </div>
              <p className="text-xs text-white/70">Smart Digital Library & Academic Ecosystem</p>
            </div>
          </div>

          {/* Central Hero Headline & Feature Grid */}
          <div className="flex-1 flex flex-col justify-center max-w-lg my-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-indigo-200 backdrop-blur-sm w-fit mb-4">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Next-Gen School Library Management</span>
            </div>

            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Read. Discover. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-200">
                Level Up Daily.
              </span>
            </h2>

            <p className="text-white/80 text-sm leading-relaxed mb-8">
              Seamlessly borrow physical books, read NCERT materials, submit book reviews, watch educational reels, and earn XP badges.
            </p>

            {/* Feature Showcase Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { icon: BookOpen, title: "10,000+ Titles", desc: "Catalog & NCERT Books", color: "from-blue-500/20 to-indigo-500/10" },
                { icon: Award, title: "Gamified Rewards", desc: "Earn XP & Top Ranks", color: "from-amber-500/20 to-orange-500/10" },
                { icon: Video, title: "Student Reels", desc: "Share Knowledge Short Clips", color: "from-rose-500/20 to-pink-500/10" },
                { icon: Shield, title: "Bug Bounty Hub", desc: "Hunt Glitches & Earn XP", color: "from-emerald-500/20 to-teal-500/10" },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl bg-gradient-to-br ${item.color} border border-white/10 backdrop-blur-md flex items-center gap-3 hover:border-white/25 transition-all group`}
                >
                  <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                    <p className="text-[11px] text-white/60 truncate">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Active Student Community Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {recentUsers.length > 0
                  ? recentUsers.slice(0, 5).map((u, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full ${u.color} border-2 border-indigo-950 flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}
                        title={u.name}
                      >
                        {u.initials}
                      </div>
                    ))
                  : ['KV', 'AF', 'SL', 'DL'].map((text, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-indigo-950 flex items-center justify-center text-[10px] font-bold text-white">
                        {text}
                      </div>
                    ))
                }
              </div>
              <div>
                <p className="text-xs font-bold text-white">Active Student Community</p>
                <p className="text-[10px] text-white/60">500+ students actively learning & borrowing</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              <span>KV Sulur Library</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Modern Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[430px] space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Mobile Header Branding */}
          <div className="lg:hidden flex items-center gap-3 mb-6 p-3 rounded-2xl bg-muted/50 border border-border">
            <div className="flex shrink-0 items-center gap-1.5">
              <img src="/logos/pm-shri.png" alt="PM SHRI" className="h-8 w-8 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <img src="/logos/kv.png" alt="KV" className="h-8 w-8 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-foreground truncate">PM SHRI KV AFS SULUR</h1>
              <p className="text-[10px] text-muted-foreground truncate">Digital Library Management System</p>
            </div>
          </div>

          {!showForgotPassword && (
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Sign in to manage books, track reading XP, or explore resources
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
                  title: "Default Password Loaded ✨",
                  description: "Your admission number and default password Welcome@123 have been loaded. Click Sign In to log in.",
                });
              }}
            />
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Role Quick Guide Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border">
                {[
                  { id: "student", label: "Student", icon: GraduationCap, tip: "Use 5-digit Admission No." },
                  { id: "teacher", label: "Teacher", icon: Users, tip: "Use School Email or Username" },
                  { id: "admin", label: "Admin", icon: Shield, tip: "Use Admin Credentials" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedRoleTab(tab.id as any)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedRoleTab === tab.id
                        ? "bg-background text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Role Tip Alert */}
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-muted-foreground flex-1">
                  {selectedRoleTab === "student" && (
                    <span><strong>Students:</strong> Sign in with your <strong>5-digit Admission No.</strong> (e.g. 12345) and default password <strong>Welcome@123</strong>.</span>
                  )}
                  {selectedRoleTab === "teacher" && (
                    <span><strong>Teachers:</strong> Sign in using your registered school email address or teacher username.</span>
                  )}
                  {selectedRoleTab === "admin" && (
                    <span><strong>Library Admins:</strong> Sign in using your administrator credentials.</span>
                  )}
                </div>
              </div>

              {/* Identifier Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="identifier" className="text-xs font-bold text-foreground">
                    Admission No. / Email / Username
                  </Label>
                  {detectedType && (
                    <Badge variant="outline" className={`text-[10px] h-4 px-1.5 font-semibold ${detectedType.color}`}>
                      {detectedType.label}
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={selectedRoleTab === "student" ? "e.g. 12345" : "e.g. teacher@kvsulur.edu.in"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 rounded-xl text-sm transition-all focus:border-primary pr-9"
                    required
                    autoComplete="username"
                  />
                  {detectedType && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-foreground">
                    Password
                  </Label>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setShowForgotPassword(true)}
                    type="button"
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-11 rounded-xl text-sm pr-11 transition-all focus:border-primary"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Caps Lock Detection Warning */}
                {capsLockOn && (
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                    <AlertCircle className="h-3.5 w-3.5" /> Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Student Quick-Assist & Remember Me Row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(c) => setRememberMe(!!c)}
                    className="rounded-md"
                  />
                  <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                    Remember me
                  </label>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={applyStudentQuickFill}
                  className="h-7 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 rounded-lg gap-1"
                >
                  <KeyRound className="h-3 w-3" /> Auto-fill Welcome@123
                </Button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 rounded-xl gradient-primary text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] border-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in securely...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          )}

          {/* Account Status / Registration Notice Link */}
          <div className="pt-4 border-t border-border text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              New Student?{" "}
              <button
                type="button"
                className="text-primary font-bold hover:underline"
                onClick={() => setShowRegistrationNotice(true)}
              >
                Learn how student accounts work
              </button>
            </p>

            <div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs hover:text-foreground gap-1.5 h-8 rounded-lg"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Library Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Account Information Modal */}
      {showRegistrationNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">Student Accounts Pre-Registered</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All student accounts have already been provisioned by the PM SHRI KV Sulur Library team.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/60 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Your Username:</span>
                <span className="font-bold text-foreground">5-Digit Admission Number</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Default Password:</span>
                <Badge variant="secondary" className="font-mono font-bold text-xs bg-background">
                  Welcome@123
                </Badge>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-10 text-xs font-semibold"
                onClick={() => setShowRegistrationNotice(false)}
              >
                Got It
              </Button>
              <Button
                className="flex-1 rounded-xl h-10 text-xs font-semibold gradient-primary border-0"
                onClick={() => {
                  setShowRegistrationNotice(false);
                  setPassword("Welcome@123");
                }}
              >
                Use Default Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
