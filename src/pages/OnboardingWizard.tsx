import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  School,
  User,
  Database,
  Palette,
  Rocket,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Globe,
  Mail,
  Lock,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";

// ─── Registry Supabase client (separate from tenant client) ───────────────────
const registryUrl = import.meta.env.VITE_REGISTRY_URL as string;
const registryKey = import.meta.env.VITE_REGISTRY_ANON_KEY as string;
const registrySupabase =
  registryUrl && registryKey
    ? createClient(registryUrl, registryKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;

// ─── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "School Info", icon: School },
  { id: 2, label: "Domain", icon: Globe },
  { id: 3, label: "Admin Account", icon: User },
  { id: 4, label: "Database", icon: Database },
  { id: 5, label: "Customize", icon: Palette },
  { id: 6, label: "Launch", icon: Rocket },
] as const;

const KV_REGIONS = [
  "Northern",
  "Southern",
  "Eastern",
  "Western",
  "Central",
  "North-Eastern",
] as const;

// ─── Form state shape ──────────────────────────────────────────────────────────
interface FormData {
  // Step 1
  schoolName: string;
  kvCode: string;
  region: string;
  state: string;
  city: string;
  contactName: string;
  contactEmail: string;
  // Step 2
  domain: string;
  // Step 3
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminConfirmPassword: string;
  // Step 4
  dbOption: "own" | "platform";
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseProjectRef: string;
  // Step 5
  tagline: string;
  primaryColor: string;
  logoUrl: string;
}

const initialFormData: FormData = {
  schoolName: "",
  kvCode: "",
  region: "",
  state: "",
  city: "",
  contactName: "",
  contactEmail: "",
  domain: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  adminConfirmPassword: "",
  dbOption: "platform",
  supabaseUrl: "",
  supabaseAnonKey: "",
  supabaseProjectRef: "",
  tagline: "",
  primaryColor: "#6366f1",
  logoUrl: "",
};

// ─── Inline error map ──────────────────────────────────────────────────────────
type Errors = Partial<Record<keyof FormData, string>>;

// ─── Step Indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => (
  <div className="flex items-center justify-center gap-0 mb-8 select-none">
    {STEPS.map((step, idx) => {
      const done = current > step.id;
      const active = current === step.id;
      const Icon = step.icon;
      return (
        <div key={step.id} className="flex items-center">
          {/* Circle */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done
                  ? "bg-primary border-primary text-primary-foreground"
                  : active
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {done ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <span
              className={`text-[10px] font-medium hidden sm:block ${
                active
                  ? "text-primary"
                  : done
                  ? "text-primary/70"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {/* Connector */}
          {idx < total - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors duration-300 ${
                current > step.id ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive font-medium">{error}</p>}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ── Per-step validation ──────────────────────────────────────────────────────
  const validate = (s: number): Errors => {
    const e: Errors = {};
    if (s === 1) {
      if (!form.schoolName.trim()) e.schoolName = "School name is required";
      if (!form.kvCode.trim()) e.kvCode = "KV code is required";
    }
    if (s === 2) {
      if (!form.domain.trim()) e.domain = "Domain is required";
      else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(form.domain.trim()))
        e.domain = "Enter a valid domain (e.g. dlms.kvsulur.in)";
    }
    if (s === 3) {
      if (!form.adminName.trim()) e.adminName = "Full name is required";
      if (!form.adminEmail.trim()) e.adminEmail = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail))
        e.adminEmail = "Enter a valid email address";
      if (!form.adminPassword) e.adminPassword = "Password is required";
      else if (form.adminPassword.length < 8)
        e.adminPassword = "Password must be at least 8 characters";
      if (!form.adminConfirmPassword)
        e.adminConfirmPassword = "Please confirm your password";
      else if (form.adminPassword !== form.adminConfirmPassword)
        e.adminConfirmPassword = "Passwords do not match";
    }
    if (s === 4 && form.dbOption === "own") {
      if (!form.supabaseUrl.trim()) e.supabaseUrl = "Supabase URL is required";
      if (!form.supabaseAnonKey.trim())
        e.supabaseAnonKey = "Anon key is required";
      if (!form.supabaseProjectRef.trim())
        e.supabaseProjectRef = "Project ref is required";
    }
    return e;
  };

  const handleNext = () => {
    const e = validate(step);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!registrySupabase) {
      toast.error("Registry not configured", {
        description:
          "VITE_REGISTRY_URL or VITE_REGISTRY_ANON_KEY env vars are missing.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const schoolPayload = {
        name: form.schoolName,
        kv_code: form.kvCode,
        region: form.region || null,
        state: form.state || null,
        city: form.city || null,
        contact_name: form.contactName || null,
        contact_email: form.contactEmail || null,
        hostname: form.domain,
        tagline: form.tagline || null,
        primary_color: form.primaryColor,
        logo_url: form.logoUrl || null,
        admin_name: form.adminName,
        admin_email: form.adminEmail,
        status: "pending" as const,
        db_provisioning: form.dbOption,
      };

      const { data: school, error: schoolError } = await registrySupabase
        .from("schools")
        .insert(schoolPayload)
        .select("id")
        .single();

      if (schoolError) throw schoolError;

      if (form.dbOption === "own" && school?.id) {
        const { error: connError } = await registrySupabase
          .from("school_connections")
          .insert({
            school_id: school.id,
            supabase_url: form.supabaseUrl,
            supabase_anon_key: form.supabaseAnonKey,
            supabase_project_ref: form.supabaseProjectRef,
          });
        if (connError) throw connError;
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error("Registration failed", {
        description: err?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  // ── Success state ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-foreground mb-2">
                  Application Submitted!
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your school has been registered. The Super Admin will review
                  and activate your DLMS.
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">
                      Your domain will be:
                    </span>{" "}
                    <span className="text-primary font-mono">{form.domain}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Database className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Next step: Point your domain&apos;s{" "}
                    <code className="bg-muted px-1 rounded text-xs">CNAME</code>{" "}
                    to{" "}
                    <code className="bg-muted px-1 rounded text-xs font-mono">
                      cname.vercel-dns.com
                    </code>
                  </p>
                </div>
                {form.contactEmail && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">
                      You&apos;ll receive an email at{" "}
                      <span className="font-medium text-foreground">
                        {form.contactEmail}
                      </span>{" "}
                      once activated.
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This may take 1–2 business days for manual review.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Ambient blobs */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-400 relative z-10">
        {/* Header branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase mb-3">
            <School className="w-3.5 h-3.5" />
            KV DLMS Platform
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">
            Register Your School
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your Digital Library Management System in minutes
          </p>
        </div>

        <Card className="border shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border">
            <StepIndicator current={step} total={STEPS.length} />
            <Progress value={progress} className="h-1.5 rounded-full" />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Step {step} of {STEPS.length} —{" "}
              <span className="font-semibold text-foreground">
                {STEPS[step - 1].label}
              </span>
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* ── Step 1: School Info ─────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <Field
                  label="School Name *"
                  error={errors.schoolName}
                  hint='e.g. "PM SHRI KV AFS Coimbatore"'
                >
                  <Input
                    placeholder="PM SHRI KV AFS Coimbatore"
                    value={form.schoolName}
                    onChange={(e) => set("schoolName", e.target.value)}
                    className={`h-11 rounded-xl ${errors.schoolName ? "border-destructive" : ""}`}
                  />
                </Field>
                <Field
                  label="KV Code *"
                  error={errors.kvCode}
                  hint='Unique identifier for your school. e.g. "KV-CBE-002"'
                >
                  <Input
                    placeholder="KV-CBE-002"
                    value={form.kvCode}
                    onChange={(e) => set("kvCode", e.target.value)}
                    className={`h-11 rounded-xl ${errors.kvCode ? "border-destructive" : ""}`}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Region">
                    <Select
                      value={form.region}
                      onValueChange={(v) => set("region", v)}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {KV_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="State">
                    <Input
                      placeholder="Tamil Nadu"
                      value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      placeholder="Coimbatore"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Contact Person Name">
                    <Input
                      placeholder="Librarian / Principal"
                      value={form.contactName}
                      onChange={(e) => set("contactName", e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </Field>
                  <Field label="Contact Email">
                    <Input
                      type="email"
                      placeholder="librarian@kvschool.in"
                      value={form.contactEmail}
                      onChange={(e) => set("contactEmail", e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 2: Domain ──────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Globe className="w-4 h-4" />
                    Your DLMS Domain
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enter the domain you own and will point to our servers.
                    Example:{" "}
                    <code className="bg-muted px-1 rounded">
                      dlms.kvsulur.in
                    </code>
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Preview: dlms.{form.schoolName
                      ? form.schoolName.toLowerCase().replace(/\s+/g, "") + ".in"
                      : "kvschoolname.in"}
                  </p>
                </div>

                <Field
                  label="Domain *"
                  error={errors.domain}
                  hint="Only enter the domain (no https://)"
                >
                  <Input
                    placeholder="dlms.kvsulur.in"
                    value={form.domain}
                    onChange={(e) =>
                      set("domain", e.target.value.toLowerCase().trim())
                    }
                    className={`h-11 rounded-xl font-mono ${errors.domain ? "border-destructive" : ""}`}
                  />
                </Field>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <p className="font-semibold mb-1">📌 DNS Setup Note</p>
                  After completing setup, add a{" "}
                  <strong>CNAME record</strong> pointing your domain to:{" "}
                  <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-mono">
                    cname.vercel-dns.com
                  </code>
                </div>
              </div>
            )}

            {/* ── Step 3: Admin Account ───────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
                  <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    You will be the{" "}
                    <span className="font-semibold text-foreground">
                      Library Administrator
                    </span>{" "}
                    for this school.
                  </p>
                </div>
                <Field label="Full Name *" error={errors.adminName}>
                  <Input
                    placeholder="Your full name"
                    value={form.adminName}
                    onChange={(e) => set("adminName", e.target.value)}
                    className={`h-11 rounded-xl ${errors.adminName ? "border-destructive" : ""}`}
                  />
                </Field>
                <Field label="Email *" error={errors.adminEmail}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="admin@kvschool.in"
                      value={form.adminEmail}
                      onChange={(e) => set("adminEmail", e.target.value)}
                      className={`h-11 rounded-xl pl-9 ${errors.adminEmail ? "border-destructive" : ""}`}
                    />
                  </div>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Password *"
                    error={errors.adminPassword}
                    hint="Min. 8 characters"
                  >
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={form.adminPassword}
                        onChange={(e) => set("adminPassword", e.target.value)}
                        className={`h-11 rounded-xl pl-9 ${errors.adminPassword ? "border-destructive" : ""}`}
                      />
                    </div>
                  </Field>
                  <Field
                    label="Confirm Password *"
                    error={errors.adminConfirmPassword}
                  >
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={form.adminConfirmPassword}
                        onChange={(e) =>
                          set("adminConfirmPassword", e.target.value)
                        }
                        className={`h-11 rounded-xl pl-9 ${errors.adminConfirmPassword ? "border-destructive" : ""}`}
                      />
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 4: Database ────────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <RadioGroup
                  value={form.dbOption}
                  onValueChange={(v) =>
                    set("dbOption", v as "own" | "platform")
                  }
                  className="space-y-3"
                >
                  {/* Option A — Own Supabase */}
                  <label
                    htmlFor="db-own"
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.dbOption === "own"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <RadioGroupItem
                      value="own"
                      id="db-own"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        I have my own Supabase project
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enter your existing project credentials. Full control
                        and instant setup.
                      </p>
                    </div>
                  </label>

                  {/* Option B — Platform provision */}
                  <label
                    htmlFor="db-platform"
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.dbOption === "platform"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <RadioGroupItem
                      value="platform"
                      id="db-platform"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        Request platform provisioning
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Our team will create a free Supabase project for you.
                        Recommended for new schools.
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {/* Conditional fields for own Supabase */}
                {form.dbOption === "own" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <Field
                      label="Supabase Project URL *"
                      error={errors.supabaseUrl}
                    >
                      <Input
                        placeholder="https://xxxx.supabase.co"
                        value={form.supabaseUrl}
                        onChange={(e) => set("supabaseUrl", e.target.value)}
                        className={`h-11 rounded-xl font-mono text-sm ${errors.supabaseUrl ? "border-destructive" : ""}`}
                      />
                    </Field>
                    <Field label="Anon Key *" error={errors.supabaseAnonKey}>
                      <Input
                        placeholder="eyJhbGciOiJIUzI1NiIs..."
                        value={form.supabaseAnonKey}
                        onChange={(e) =>
                          set("supabaseAnonKey", e.target.value)
                        }
                        className={`h-11 rounded-xl font-mono text-sm ${errors.supabaseAnonKey ? "border-destructive" : ""}`}
                      />
                    </Field>
                    <Field
                      label="Project Ref *"
                      error={errors.supabaseProjectRef}
                      hint="Found in your Supabase project settings URL"
                    >
                      <Input
                        placeholder="xxxxxxxxxxxxxxxxxxxx"
                        value={form.supabaseProjectRef}
                        onChange={(e) =>
                          set("supabaseProjectRef", e.target.value)
                        }
                        className={`h-11 rounded-xl font-mono text-sm ${errors.supabaseProjectRef ? "border-destructive" : ""}`}
                      />
                    </Field>
                  </div>
                )}

                {form.dbOption === "platform" && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 leading-relaxed animate-in fade-in duration-200">
                    <p className="font-semibold mb-1">ℹ️ What happens next?</p>
                    Our team will create a free Supabase project for you.
                    You&apos;ll receive an email once it&apos;s ready.{" "}
                    <strong>Note:</strong> This may take 1–2 business days.
                  </div>
                )}
              </div>
            )}

            {/* ── Step 5: Customize ───────────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Field
                      label="School Tagline"
                      hint='e.g. "Knowledge is Power"'
                    >
                      <input
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Knowledge is Power"
                        value={form.tagline}
                        onChange={(e) => set("tagline", e.target.value)}
                      />
                    </Field>
                    <Field label="Primary Color">
                      <div className="flex items-center gap-3 h-11 px-3 rounded-xl border border-input bg-background">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => set("primaryColor", e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-sm font-mono text-foreground">
                          {form.primaryColor}
                        </span>
                      </div>
                    </Field>
                    <Field
                      label="Logo URL"
                      hint="Optional — you can add this later from admin settings"
                    >
                      <Input
                        placeholder="https://example.com/logo.png"
                        value={form.logoUrl}
                        onChange={(e) => set("logoUrl", e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </Field>
                  </div>

                  {/* Live preview card */}
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      Preview
                    </p>
                    <div className="w-full rounded-2xl border shadow-md overflow-hidden">
                      {/* Card header with color */}
                      <div
                        className="h-16 flex items-center justify-center gap-3 px-4"
                        style={{ backgroundColor: form.primaryColor + "22" }}
                      >
                        {form.logoUrl ? (
                          <img
                            src={form.logoUrl}
                            alt="Logo"
                            className="h-10 w-10 object-contain rounded-xl border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: form.primaryColor }}
                          >
                            <School className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {form.schoolName || "Your School Name"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {form.tagline || "Your tagline here"}
                          </p>
                        </div>
                      </div>
                      {/* Sample button */}
                      <div className="p-3 bg-card flex justify-center">
                        <button
                          className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: form.primaryColor }}
                        >
                          Open Library
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 6: Launch / Summary ────────────────────────────────── */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="text-center pb-2">
                  <Rocket className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-foreground">
                    Ready to launch? 🚀
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Review your details below before submitting.
                  </p>
                </div>

                {/* Summary */}
                <div className="space-y-3">
                  {[
                    {
                      title: "School Info",
                      icon: School,
                      rows: [
                        ["Name", form.schoolName],
                        ["KV Code", form.kvCode],
                        form.region && ["Region", form.region],
                        form.city && form.state && ["Location", `${form.city}, ${form.state}`],
                        form.contactName && ["Contact", form.contactName],
                        form.contactEmail && ["Contact Email", form.contactEmail],
                      ].filter(Boolean) as [string, string][],
                    },
                    {
                      title: "Domain",
                      icon: Globe,
                      rows: [["Domain", form.domain]],
                    },
                    {
                      title: "Admin Account",
                      icon: User,
                      rows: [
                        ["Name", form.adminName],
                        ["Email", form.adminEmail],
                      ],
                    },
                    {
                      title: "Database",
                      icon: Database,
                      rows: [
                        [
                          "Setup",
                          form.dbOption === "own"
                            ? "Own Supabase project"
                            : "Platform provisioning (free)",
                        ],
                        ...(form.dbOption === "own"
                          ? [["Project URL", form.supabaseUrl] as [string, string]]
                          : []),
                      ],
                    },
                    {
                      title: "Customization",
                      icon: Palette,
                      rows: [
                        ["Primary Color", form.primaryColor],
                        form.tagline && ["Tagline", form.tagline],
                      ].filter(Boolean) as [string, string][],
                    },
                  ].map(({ title, icon: Icon, rows }) => (
                    <div
                      key={title}
                      className="rounded-xl border border-border p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Icon className="w-3.5 h-3.5" />
                        {title}
                      </div>
                      {rows.map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4 text-sm"
                        >
                          <span className="text-muted-foreground shrink-0">
                            {label}
                          </span>
                          <span className="text-foreground font-medium text-right truncate max-w-[60%]">
                            {label === "Primary Color" ? (
                              <span className="flex items-center gap-1.5 justify-end">
                                <span
                                  className="w-3 h-3 rounded-full border border-border inline-block"
                                  style={{ backgroundColor: value }}
                                />
                                {value}
                              </span>
                            ) : (
                              value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Navigation ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                className="rounded-xl gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>

              {step < STEPS.length ? (
                <Button onClick={handleNext} className="rounded-xl gap-1.5 gradient-primary border-0">
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-xl gap-1.5 gradient-primary border-0 min-w-[120px]"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" /> Submit
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          DLMS Platform · KV Schools Network
        </p>
      </div>
    </div>
  );
}
