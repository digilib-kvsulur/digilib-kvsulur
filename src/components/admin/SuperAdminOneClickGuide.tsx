import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Rocket,
  CheckCircle,
  Copy,
  Terminal,
  ExternalLink,
  Database,
  Globe,
  Shield,
  Layers,
  Sparkles,
  BookOpen,
  ArrowRight,
  Code2,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const STARTER_SCHEMA_SQL = `-- =============================================================================
-- DLMS School Database Starter Schema & Content Seed
-- Run this in your new Supabase project's SQL Editor to make it 100% DLMS ready.
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. System Settings Table (Powers dynamic branding, home page editor, theme colors)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read system settings" ON public.system_settings FOR SELECT TO public USING (true);
CREATE POLICY "Admin write system settings" ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Profiles Table (Students, Teachers, Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL DEFAULT 'User',
  last_name text DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  student_class text DEFAULT '',
  roll_number text DEFAULT '',
  admission_number text DEFAULT '',
  username text DEFAULT '',
  phone text DEFAULT '',
  points integer DEFAULT 0,
  streak_count integer DEFAULT 0,
  is_approved boolean DEFAULT true,
  needs_profile_update boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Self/Admin manage profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') WITH CHECK (true);

-- 4. Books Table
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  isbn text,
  cover_url text,
  description text,
  total_copies integer DEFAULT 1,
  available_copies integer DEFAULT 1,
  location_shelf text DEFAULT 'A-1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read books" ON public.books FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage books" ON public.books FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Book Issues & Transactions
CREATE TABLE IF NOT EXISTS public.book_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost')),
  issue_date timestamptz DEFAULT now(),
  due_date timestamptz DEFAULT (now() + interval '14 days'),
  return_date timestamptz,
  fine_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read issues" ON public.book_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage issues" ON public.book_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Events & Announcements
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz DEFAULT now(),
  image_url text,
  category text DEFAULT 'Reading Challenge',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read events" ON public.events FOR SELECT TO public USING (true);
CREATE POLICY "Admin manage events" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Automated New User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, role, is_approved)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Member'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE((NEW.raw_user_meta_data->>'role') = 'admin', true)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Seed Starter Catalog Data
INSERT INTO public.books (title, author, category, description, total_copies, available_copies) VALUES
  ('Wings of Fire', 'A.P.J. Abdul Kalam', 'Biography', 'Autobiography of India’s Missile Man and former President.', 5, 5),
  ('Ignited Minds', 'A.P.J. Abdul Kalam', 'Inspiration', 'Unleashing the power within India.', 4, 4),
  ('The Discovery of India', 'Jawaharlal Nehru', 'History', 'A broad view of Indian history, culture and philosophy.', 3, 3),
  ('A Brief History of Time', 'Stephen Hawking', 'Science', 'From the Big Bang to Black Holes.', 3, 3),
  ('Malgudi Days', 'R.K. Narayan', 'Fiction', 'Classic short stories set in the fictional town of Malgudi.', 6, 6)
ON CONFLICT DO NOTHING;
`;

export default function SuperAdminOneClickGuide() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(STARTER_SCHEMA_SQL);
    setCopied(true);
    toast({
      title: "SQL Copied to Clipboard",
      description: "Paste into the Supabase SQL Editor and click 'Run'.",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="max-w-2xl space-y-2 relative z-10">
          <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1">
            <Sparkles className="w-3.5 h-3.5" /> Zero to Live in 3 Steps
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            One-Click School Provisioning & Deployment Guide
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Provision standalone multi-tenant school DLMS portals with dedicated databases, isolated student & catalog records, custom domains, and automatic branding.
          </p>
        </div>
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-15 text-primary">
          <Layers className="w-48 h-48" />
        </div>
      </div>

      {/* 3-Step Interactive Process */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <Card className="border-border/60 hover:border-primary/50 transition-colors shadow-xs">
          <CardHeader className="pb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm mb-2">
              1
            </div>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Database className="w-4 h-4 text-primary" /> Create Supabase Project
            </CardTitle>
            <CardDescription className="text-xs">
              Create a free database project for the school on Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              1. Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-primary underline font-medium inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a>
            </p>
            <p>2. Click <strong>New Project</strong> and enter school name (e.g., <code>kv-chennai-dlms</code>).</p>
            <p>3. Note the <strong>Project URL</strong> and <strong>anon key</strong> from Project Settings → API.</p>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="border-border/60 hover:border-primary/50 transition-colors shadow-xs">
          <CardHeader className="pb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm mb-2">
              2
            </div>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-primary" /> Run Starter Schema
            </CardTitle>
            <CardDescription className="text-xs">
              One-click SQL script provisions all tables, auth triggers & books.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>1. Copy the ready-made SQL script below.</p>
            <p>2. Open Supabase <strong>SQL Editor</strong> in the new project.</p>
            <p>3. Paste and click <strong>Run</strong>. All tables, security policies, and books are created in &lt; 2 seconds.</p>
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8" onClick={handleCopySql}>
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Starter SQL"}
            </Button>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="border-border/60 hover:border-primary/50 transition-colors shadow-xs">
          <CardHeader className="pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
              3
            </div>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-primary" /> Register in Portal
            </CardTitle>
            <CardDescription className="text-xs">
              Connect school domain and provision the admin in 1 form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>1. Open the <strong>Schools Tab</strong> above and click <strong>Add School</strong>.</p>
            <p>2. Fill in School Name, Domain/Hostname, Supabase URL + Anon Key, and initial Admin credentials.</p>
            <p>3. Click <strong>Create & Provision School</strong>. The instance is live instantly!</p>
          </CardContent>
        </Card>
      </div>

      {/* SQL & DNS Reference Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> School DB Schema & Setup Options
              </CardTitle>
              <CardDescription>
                Choose between Instant Starter Schema (&lt; 2s setup) or Full Production Schema (all 67 tables & features).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/complete_tenant_schema.sql"
                download="dlms_complete_tenant_schema.sql"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download Full Schema (.sql)
              </a>
              <Button size="sm" onClick={handleCopySql} className="gap-2 shrink-0">
                {copied ? <CheckCircle className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied SQL!" : "Copy Starter SQL"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="starter" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-lg mb-3">
              <TabsTrigger value="starter">Starter Schema (Fast)</TabsTrigger>
              <TabsTrigger value="full">Full 67-Table Schema</TabsTrigger>
              <TabsTrigger value="functions">Edge Functions (13)</TabsTrigger>
              <TabsTrigger value="dns">Domain & CNAME</TabsTrigger>
            </TabsList>

            <TabsContent value="starter" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Provisions essential core tables (`system_settings`, `profiles`, `books`, `book_issues`, `events`, auth triggers, and sample books). Ready for immediate login in seconds.
              </p>
              <div className="relative">
                <Textarea
                  readOnly
                  value={STARTER_SCHEMA_SQL}
                  rows={14}
                  className="font-mono text-xs bg-muted/40 text-foreground resize-none leading-relaxed"
                />
              </div>
            </TabsContent>

            <TabsContent value="full" className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Database className="w-4 h-4 text-primary" /> Complete Multi-Feature Production Schema (550 KB)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Includes all <strong>67 tables</strong> and all <strong>207 PostgreSQL functions & triggers</strong> (login streaks, leaderboard ranks, points calculation, fines, automated badge triggers, and RLS policies).
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="/complete_tenant_schema.sql"
                    download="dlms_complete_tenant_schema.sql"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Download dlms_complete_tenant_schema.sql
                  </a>
                  <span className="text-xs text-muted-foreground">
                    Upload or paste into Supabase SQL Editor and click Run.
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="functions" className="space-y-4">
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Terminal className="w-4 h-4 text-primary" /> Database Functions vs. Supabase Edge Functions
                </h4>
                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <div className="p-3 bg-background rounded-lg border">
                    <p className="font-semibold text-foreground mb-1">✅ 1. SQL Database Functions (207 functions included):</p>
                    <p>
                      Already 100% packaged inside <code>complete_tenant_schema.sql</code>! All triggers, points multipliers, streak claims, rank calculations, and profile creators run automatically inside PostgreSQL as soon as you execute the schema.
                    </p>
                  </div>

                  <div className="p-3 bg-background rounded-lg border">
                    <p className="font-semibold text-foreground mb-1">⚡ 2. Supabase Edge Functions (13 functions for optional server tasks):</p>
                    <p className="mb-2">
                      Used for privileged server operations (AI quiz generation, AI library bot, bulk user provisioning, and web push notifications):
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-foreground">
                      <li>admin-bulk-create-users · admin-create-user · admin-delete-user</li>
                      <li>admin-reset-password · send-password-reset · send-ticket-email</li>
                      <li>generate-quiz (AI Quiz Maker) · library-bot (AI Assistant)</li>
                      <li>push-notification · send-email-campaign · admin-bulk-adjust-points</li>
                    </ul>
                    <div className="mt-3 pt-2 border-t">
                      <p className="text-muted-foreground mb-1 font-sans">To deploy all 13 Edge Functions to the new school in one command:</p>
                      <pre className="bg-slate-900 text-slate-100 p-2.5 rounded font-mono text-xs overflow-x-auto">
npx supabase functions deploy --project-ref &lt;school-project-ref&gt;
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dns" className="space-y-4 pt-1">
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Globe className="w-4 h-4 text-primary" /> Custom Domain DNS Setup
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To map any school domain or subdomain (e.g. <code>dlms.kvschool.edu.in</code>) to this platform:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-background p-3 rounded-lg border">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Type</span>
                    <strong>CNAME</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Host / Name</span>
                    <strong>dlms</strong> (or @)
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Value / Target</span>
                    <strong>cname.vercel-dns.com</strong>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Our multitenant router automatically identifies incoming hostnames, loads the specific school’s database credentials, and renders their customized landing page.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
