import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, AlertCircle, ArrowLeft, Star, Eye, EyeOff, Sparkles, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clearStoredAuthSession, isInvalidRefreshTokenError } from "@/lib/authCleanup";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

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
        toast({ title: "Login Failed", description: "Invalid credentials. Please check your email/username/phone and password.", variant: "destructive" });
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
        toast({ title: "Login Failed", description: "Invalid password. Please try again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      toast({ title: "Login Successful", description: "Welcome back!" });
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
      toast({ title: "Login Failed", description: "An unexpected error occurred", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!resetEmail) {
      toast({ title: "Missing Info", description: "Please enter your email, admission number, or username", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    try {
      // Look up the user's real auth email via their identifier (email / username / admission no.)
      // Bulk-imported students have a dummy auth email (e.g. 12345@kvschool.in), so we can't
      // send the reset directly to what the user types — we must resolve their auth email first.
      const { data: userData, error: lookupError } = await supabase.rpc('find_user_by_identifier', { identifier: resetEmail.trim() });

      if (lookupError || !userData || userData.length === 0) {
        toast({ title: "User Not Found", description: "No account found with that email, username, or admission number.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const authEmail = userData[0].email;
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reset Link Sent!", description: "A password reset link has been sent to the email on file for your account." });
        setShowForgotPassword(false);
        setResetEmail("");
      }
    } catch (error) {
      toast({ title: "Reset Failed", description: "An unexpected error occurred", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Immersive Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0VjZoLTJ2OGgtOFYyaC0ydjEyaDEwem0wIDBoLTJ2OGgtOHYtOGgtMnYxMGgxMlYxNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="absolute top-10 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            {/* Dual Logo Placeholders */}
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="relative w-11 h-11 rounded-full bg-white/20 border border-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                <img src="/logos/pm-shri.png" alt="PM SHRI" className="w-full h-full object-contain relative z-10" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <BookOpen className="h-5 w-5 text-primary-foreground absolute" />
              </div>
              <div className="relative w-11 h-11 rounded-full bg-white/20 border border-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm z-10">
                <img src="/logos/kv.png" alt="KV" className="w-full h-full object-contain relative z-10" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <BookOpen className="h-5 w-5 text-primary-foreground/70 absolute" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-primary-foreground leading-tight">KV Sulur Library</h1>
              <p className="text-xs text-primary-foreground/70">Digital Library System</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="text-4xl font-extrabold text-primary-foreground mb-4 leading-tight">
              Your Reading<br />Adventure<br />Starts Here ✨
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-10">
              Track progress, earn rewards, and discover new worlds through reading.
            </p>
            
            <div className="space-y-5">
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
          
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-[10px] font-bold text-primary-foreground backdrop-blur-sm">
                  {['A', 'B', 'C', 'D'][i]}
                </div>
              ))}
            </div>
            <p className="text-xs text-primary-foreground/70">Join 500+ active readers</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">KV Sulur Library</h1>
              <p className="text-xs text-muted-foreground">Digital Library System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to continue your reading journey</p>
          </div>

          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="text-sm font-medium">Email / Username / Admission Number</Label>
                <Input id="resetEmail" type="text" placeholder="e.g. 12345 or your username" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="h-12 rounded-xl" required />
                <p className="text-xs text-muted-foreground">Enter any identifier linked to your account. The reset link will be sent to the registered email on file.</p>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl gradient-primary border-0 text-base font-semibold shadow-lg hover:shadow-xl transition-all" disabled={isLoading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Sending...</span> : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <Button variant="link" className="p-0 h-auto text-primary text-sm" onClick={() => setShowForgotPassword(false)} type="button">
                  <ArrowLeft className="h-3 w-3 mr-1" /> Back to Login
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <Alert className="border-primary/20 bg-primary/5 rounded-xl">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs text-muted-foreground">Students: sign in with your 5-digit admission number. You can also use email, username, or phone.</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">Admission No. / Email / Username / Phone</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="e.g. 12345 or your email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary" onClick={() => setShowForgotPassword(true)} type="button">
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl pr-11" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl gradient-primary border-0 text-base font-semibold shadow-lg hover:shadow-xl transition-all" disabled={isLoading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Signing in...</span> : 'Sign In'}
              </Button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button variant="link" className="p-0 h-auto text-primary font-semibold" onClick={() => navigate('/register')}>
                Create Account
              </Button>
            </p>
          </div>

          <div className="text-center mt-4">
            <Button variant="link" className="p-0 h-auto text-muted-foreground text-xs" onClick={() => navigate("/")}>
              <ArrowLeft className="h-3 w-3 mr-1" /> Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
