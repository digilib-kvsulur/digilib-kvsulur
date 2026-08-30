import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, UserPlus, GraduationCap, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Register = () => {
  const registrationsTemporarilyClosed = true;
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
    role: "", studentClass: "", rollNumber: "", admissionNumber: "", username: "", phone: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const getClassOptions = () => {
    const options = [];
    for (let grade = 6; grade <= 10; grade++)
      for (const section of ['A', 'B', 'C', 'D', 'E'])
        options.push({ value: `${grade}${section}`, label: `${grade}th ${section}` });
    for (let grade = 11; grade <= 12; grade++)
      for (const section of ['A', 'B', 'C'])
        options.push({ value: `${grade}${section}`, label: `${grade}th ${section}` });
    return options;
  };

  const handleInputChange = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const canProceedStep1 = formData.firstName.trim() && formData.email.trim() && formData.role &&
    (formData.role === "teacher" || (formData.studentClass && formData.rollNumber.trim() && formData.admissionNumber.trim()));
  const canProceedStep2 = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceedStep1 || !canProceedStep2) return;
    if (formData.role === "student" && (!formData.studentClass || !formData.rollNumber || !formData.admissionNumber)) {
      toast({ title: "Missing Student Info", description: "Please provide class, roll number, and admission number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName, last_name: formData.lastName, role: formData.role,
            student_class: formData.studentClass, roll_number: formData.rollNumber,
            admission_number: formData.admissionNumber,
            username: formData.username.trim() || null, phone: formData.phone.trim() || null,
          }
        }
      });
      if (authError) { toast({ title: "Registration Failed", description: authError.message, variant: "destructive" }); return; }
      if (authData.user) {
        toast({ title: "Registration Successful!", description: "Your account is pending admin approval." });
        navigate("/login");
      }
    } catch (error) {
      toast({ title: "Registration Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const classOptions = getClassOptions();

  // Temporary notice while student accounts are supplied by the school.
  if (registrationsTemporarilyClosed) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-xl shadow-indigo-100/50 sm:p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Student accounts are ready</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          All student users have already been created. Please sign in using your 5-digit admission number and the default password below.
        </p>
        <div className="my-6 rounded-2xl bg-indigo-50 px-5 py-4 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Default password</p>
          <p className="mt-1 text-lg font-extrabold text-indigo-950">Welcome@123</p>
        </div>
        <Button onClick={() => navigate("/login")} className="h-11 w-full rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700">
          Go to Login
        </Button>
        <button onClick={() => navigate("/")} className="mt-4 text-sm font-semibold text-slate-600 hover:text-indigo-600">
          Back to home
        </button>
      </section>
    </main>
  );

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'gradient-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
            {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
          {s < 3 && <div className={`w-8 h-0.5 rounded-full transition-all ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex animate-in fade-in duration-300">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0VjZoLTJ2OGgtOFYyaC0ydjEyaDEwem0wIDBoLTJ2OGgtOHYtOGgtMnYxMGgxMlYxNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="absolute top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 w-full">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm border border-white/10">
              <GraduationCap className="h-10 w-10 text-primary-foreground" />
            </div>
            <h2 className="text-4xl font-extrabold text-primary-foreground mb-4">Join the Community</h2>
            <p className="text-primary-foreground/80 text-lg mb-10">Create your account and start your gamified reading journey today.</p>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "500+", label: "Students" },
                { value: "1000+", label: "Books" },
                { value: "50+", label: "Quizzes" },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                  <p className="text-2xl font-bold text-primary-foreground">{s.value}</p>
                  <p className="text-xs text-primary-foreground/60">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Multi-step Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background overflow-y-auto">
        <div className="w-full max-w-[440px] animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">DLMS KV Sulur</h1>
              <p className="text-xs text-muted-foreground">Create Account</p>
            </div>
          </div>

          <div className="mb-2">
            <h2 className="text-3xl font-extrabold text-foreground mb-1">Create Account</h2>
            <p className="text-muted-foreground text-sm">
              {step === 1 ? "Tell us about yourself" : step === 2 ? "Set your credentials" : "Almost done! Review & submit"}
            </p>
          </div>

          {stepIndicator}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">First Name *</Label>
                    <Input placeholder="John" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} className="h-11 rounded-xl" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Last Name (Optional)</Label>
                    <Input placeholder="Doe" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Email *</Label>
                  <Input type="email" placeholder="your.email@example.com" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} className="h-11 rounded-xl" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Role *</Label>
                  <Select value={formData.role} onValueChange={(v) => handleInputChange("role", v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select your role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.role === "student" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Class & Section *</Label>
                        <Select value={formData.studentClass} onValueChange={(v) => handleInputChange("studentClass", v)}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{classOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Roll Number *</Label>
                        <Input placeholder="001" value={formData.rollNumber} onChange={(e) => handleInputChange("rollNumber", e.target.value)} className="h-11 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Admission Number *</Label>
                      <Input placeholder="Enter admission number" value={formData.admissionNumber} onChange={(e) => handleInputChange("admissionNumber", e.target.value)} className="h-11 rounded-xl" />
                    </div>
                  </>
                )}
                <Button type="button" className="w-full h-12 rounded-xl gradient-primary border-0 font-semibold shadow-lg" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Credentials */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Username (Optional)</Label>
                    <Input placeholder="john_doe" value={formData.username} onChange={(e) => handleInputChange("username", e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone (Optional)</Label>
                    <Input type="tel" placeholder="+91 98765..." value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Password *</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} className="h-11 rounded-xl pr-11" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="flex gap-1 mt-1">
                      {[formData.password.length >= 6, /[A-Z]/.test(formData.password), /[0-9]/.test(formData.password)].map((ok, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-success' : 'bg-muted'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Confirm Password *</Label>
                  <Input type="password" placeholder="Re-enter password" value={formData.confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} className="h-11 rounded-xl" required />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(1)}>Back</Button>
                  <Button type="button" className="flex-1 h-12 rounded-xl gradient-primary border-0 font-semibold shadow-lg" disabled={!canProceedStep2} onClick={() => setStep(3)}>Continue</Button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-muted/50 rounded-2xl p-5 space-y-3">
                  <h3 className="font-semibold text-sm text-foreground mb-3">Review Your Details</h3>
                  {[
                    { label: "Name", value: `${formData.firstName} ${formData.lastName}` },
                    { label: "Email", value: formData.email },
                    { label: "Role", value: formData.role.charAt(0).toUpperCase() + formData.role.slice(1) },
                    ...(formData.role === "student" ? [
                      { label: "Class", value: formData.studentClass },
                      { label: "Roll No.", value: formData.rollNumber },
                      { label: "Admission No.", value: formData.admissionNumber },
                    ] : []),
                    ...(formData.username ? [{ label: "Username", value: formData.username }] : []),
                    ...(formData.phone ? [{ label: "Phone", value: formData.phone }] : []),
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>

                <Alert className="border-warning/20 bg-warning/5 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-xs">Your account will require admin approval before you can login.</AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl gradient-primary border-0 font-semibold shadow-lg" disabled={loading}>
                    {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Creating...</span> : 'Create Account'}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button variant="link" className="p-0 h-auto text-primary font-semibold" onClick={() => navigate("/login")}>Sign in</Button>
            </p>
          </div>
          <div className="text-center mt-3">
            <Button variant="link" className="p-0 h-auto text-muted-foreground text-xs" onClick={() => navigate("/")}>
              <ArrowLeft className="h-3 w-3 mr-1" /> Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
