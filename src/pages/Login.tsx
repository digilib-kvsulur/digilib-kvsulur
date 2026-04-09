import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, AlertCircle, ArrowLeft, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const getClassOptions = () => {
    const options = [];
    for (let grade = 6; grade <= 10; grade++) {
      for (let section of ['A', 'B', 'C', 'D', 'E']) {
        options.push({ value: `${grade}${section}`, label: `${grade}th ${section}` });
      }
    }
    for (let grade = 11; grade <= 12; grade++) {
      for (let section of ['A', 'B', 'C']) {
        options.push({ value: `${grade}${section}`, label: `${grade}th ${section}` });
      }
    }
    return options;
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!identifier || !password || !firstName || !lastName || !role) {
      toast({ title: "Missing Information", description: "Please fill in all required fields", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address for signup", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    try {
      const phoneNumber = phone.trim() || null;
      const usernameValue = username.trim() || null;
      const { error } = await supabase.auth.signUp({
        email: identifier,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { first_name: firstName, last_name: lastName, role, student_class: studentClass, roll_number: rollNumber, username: usernameValue, phone: phoneNumber }
        }
      });
      if (error) {
        toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      toast({ title: "Sign Up Successful", description: "Your account will need admin approval before you can log in." });
      setIsSignUp(false);
    } catch (error) {
      console.error('Sign up error:', error);
      toast({ title: "Sign Up Failed", description: "An unexpected error occurred", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!resetEmail) {
      toast({ title: "Missing Email", description: "Please enter your email address", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) {
        toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reset Email Sent", description: "Check your email for password reset instructions" });
        setShowForgotPassword(false);
        setResetEmail("");
      }
    } catch (error) {
      toast({ title: "Reset Failed", description: "An unexpected error occurred", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const classOptions = getClassOptions();

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-primary-foreground">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
            <BookOpen className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4 text-center">PM SHRI KV AFS SULUR</h1>
          <p className="text-xl font-light mb-8 text-center opacity-90">Digital Library Management System</p>
          <div className="space-y-4 max-w-sm">
            {["Track your reading journey", "Earn points & climb the leaderboard", "Take quizzes & complete challenges"].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <Star className="h-4 w-4" />
                </div>
                <span className="text-sm opacity-90">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden w-14 h-14 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">{isSignUp ? 'Create Account' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Join the PM SHRI KV Sulur Digital Library' : 'Sign in to your library account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSignUp && !showForgotPassword && (
              <Alert className="mb-4 border-primary/20 bg-primary/5">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">Login with email, username, or phone number</AlertDescription>
              </Alert>
            )}

            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email Address</Label>
                  <Input id="resetEmail" type="email" placeholder="Enter your email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full gradient-primary border-0" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Email'}
                </Button>
                <div className="text-center">
                  <Button variant="link" className="p-0 h-auto text-primary text-sm" onClick={() => setShowForgotPassword(false)} type="button">
                    <ArrowLeft className="h-3 w-3 mr-1" /> Back to Login
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-xs">First Name</Label>
                        <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="role" className="text-xs">Role</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="admin">Admin (Library In-charge)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-xs">Username (Optional)</Label>
                        <Input id="username" placeholder="john_doe" value={username} onChange={(e) => setUsername(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs">Phone (Optional)</Label>
                        <Input id="phone" type="tel" placeholder="+91 98765..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                    </div>
                    {role === 'student' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="studentClass" className="text-xs">Class & Section</Label>
                          <Select value={studentClass} onValueChange={setStudentClass}>
                            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                            <SelectContent>
                              {classOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="rollNumber" className="text-xs">Roll Number</Label>
                          <Input id="rollNumber" placeholder="e.g., 123" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-xs">{isSignUp ? 'Email' : 'Email / Username / Phone'}</Label>
                  <Input
                    id="identifier"
                    type={isSignUp ? "email" : "text"}
                    placeholder={isSignUp ? "your.email@example.com" : "Email, username, or phone"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                {isSignUp && (
                  <Alert className="border-warning/20 bg-warning/5">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-xs">Your account will require admin approval</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full gradient-primary border-0 shadow-md" disabled={isLoading}>
                  {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </Button>

                {!isSignUp && (
                  <div className="text-center">
                    <Button variant="link" className="p-0 h-auto text-muted-foreground text-xs" onClick={() => setShowForgotPassword(true)} type="button">
                      Forgot password?
                    </Button>
                  </div>
                )}
              </form>
            )}

            <div className="text-center mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <Button variant="link" className="p-0 h-auto text-primary font-semibold" onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? "Sign in" : "Sign up"}
                </Button>
              </p>
            </div>

            <div className="text-center mt-3">
              <Button variant="link" className="p-0 h-auto text-muted-foreground text-xs" onClick={() => navigate("/")}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
