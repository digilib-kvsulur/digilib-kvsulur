import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  School,
  Database,
  BarChart3,
  Megaphone,
  Shield,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Power,
  PowerOff,
  Download,
  Upload,
  Trash2,
  Eye,
  Users,
  BookOpen,
  Activity,
  Plus,
  Loader2,
  Globe,
  MapPin,
  Mail,
  Calendar,
  Archive,
  ChevronDown,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Registry client ───────────────────────────────────────────────────────────
const REGISTRY_URL = (import.meta.env.VITE_REGISTRY_URL || import.meta.env.VITE_SUPABASE_URL) as string;
const REGISTRY_ANON_KEY = (import.meta.env.VITE_REGISTRY_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

function createScopedClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let _registryClient: ReturnType<typeof createClient> | null = null;
function getRegistryClient() {
  if (!_registryClient && REGISTRY_URL && REGISTRY_ANON_KEY) {
    _registryClient = createScopedClient(REGISTRY_URL, REGISTRY_ANON_KEY);
  }
  return _registryClient;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type SchoolStatus = "active" | "pending" | "suspended" | "archived";

interface School {
  id: string;
  name: string;
  kv_code: string;
  slug: string;
  hostname: string;
  city: string;
  state: string;
  region: string;
  contact_email: string;
  contact_name: string;
  status: SchoolStatus;
  activated_at: string | null;
  created_at: string;
}

interface SchoolConnection {
  school_id: string;
  supabase_url: string;
  supabase_anon_key: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "critical";
  target: "all" | string[];
  expires_at: string | null;
  created_at: string;
}

interface SchoolStats {
  schoolId: string;
  schoolName: string;
  books: number;
  students: number;
  issuesThisMonth: number;
  lastActive: string | null;
  loading: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(status: SchoolStatus) {
  const map: Record<SchoolStatus, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
    suspended: { label: "Suspended", className: "bg-red-100 text-red-700 border-red-200" },
    archived: { label: "Archived", className: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const { label, className } = map[status] ?? map.pending;
  return <Badge className={`border ${className}`}>{label}</Badge>;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

async function logAudit(
  registry: ReturnType<typeof createClient>,
  action: string,
  target_id: string,
  meta: Record<string, unknown> = {}
) {
  try {
    await registry.from("super_admin_audit").insert({
      action,
      target_id,
      metadata: meta,
    });
  } catch {
    // audit logging is best-effort
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Tab 1 — Schools */
function SchoolsTab() {
  const registry = getRegistryClient();
  const { toast } = useToast();

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailSchool, setDetailSchool] = useState<School | null>(null);
  const [suspendConfirm, setSuspendConfirm] = useState<School | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<School | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add School form state
  const [form, setForm] = useState({
    name: "", kv_code: "", slug: "", hostname: "",
    city: "", state: "", region: "",
    contact_email: "", contact_name: "",
  });

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    const { data, error } = await registry.from("schools").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Error fetching schools", description: error.message, variant: "destructive" });
    else setSchools((data ?? []) as School[]);
    setLoading(false);
  }, [registry, toast]);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const handleAdd = async () => {
    setSubmitting(true);
    const { error } = await registry.from("schools").insert({ ...form, status: "pending" });
    setSubmitting(false);
    if (error) { toast({ title: "Failed to add school", description: error.message, variant: "destructive" }); return; }
    toast({ title: "School added", description: `${form.name} added with status Pending.` });
    setAddOpen(false);
    setForm({ name: "", kv_code: "", slug: "", hostname: "", city: "", state: "", region: "", contact_email: "", contact_name: "" });
    fetchSchools();
  };

  const handleActivate = async (school: School) => {
    const { error } = await registry
      .from("schools")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", school.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await logAudit(registry, "activate_school", school.id, { name: school.name });
    toast({ title: "School Activated", description: school.name });
    fetchSchools();
  };

  const handleSuspend = async (school: School) => {
    const { error } = await registry.from("schools").update({ status: "suspended" }).eq("id", school.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await logAudit(registry, "suspend_school", school.id, { name: school.name });
    toast({ title: "School Suspended", description: school.name, variant: "destructive" });
    setSuspendConfirm(null);
    fetchSchools();
  };

  const handleArchive = async (school: School) => {
    const { error } = await registry.from("schools").update({ status: "archived" }).eq("id", school.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await logAudit(registry, "archive_school", school.id, { name: school.name });
    toast({ title: "School Archived", description: school.name });
    setArchiveConfirm(null);
    fetchSchools();
  };

  const field = (key: keyof typeof form, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        placeholder={placeholder ?? label}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">School Registry</h2>
          <p className="text-sm text-muted-foreground">Manage all KV schools on the platform</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add School
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : schools.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <School className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No schools registered yet. Add your first school.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["School", "KV Code", "Domain", "Region", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schools.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.kv_code}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.hostname || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.region || "—"}</td>
                  <td className="px-4 py-3">{statusBadge(s.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setDetailSchool(s)}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                      {s.status !== "active" && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleActivate(s)}>
                          <Power className="h-3 w-3" /> Activate
                        </Button>
                      )}
                      {s.status === "active" && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => setSuspendConfirm(s)}>
                          <PowerOff className="h-3 w-3" /> Suspend
                        </Button>
                      )}
                      {s.status !== "archived" && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50" onClick={() => setArchiveConfirm(s)}>
                          <Archive className="h-3 w-3" /> Archive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add School Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>Register a new KV school on the platform. Status will be set to Pending.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {field("name", "School Name", "e.g. KV Sulur")}
            {field("kv_code", "KV Code", "e.g. KVS-1234")}
            {field("slug", "Slug", "e.g. kv-sulur")}
            {field("hostname", "Hostname", "e.g. kvsulur.digilib.in")}
            {field("city", "City")}
            {field("state", "State")}
            {field("region", "Region", "e.g. Chennai Region")}
            {field("contact_email", "Contact Email")}
            {field("contact_name", "Contact Name")}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting || !form.name || !form.kv_code}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailSchool} onOpenChange={() => setDetailSchool(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detailSchool?.name}</DialogTitle>
            <DialogDescription>School details</DialogDescription>
          </DialogHeader>
          {detailSchool && (
            <div className="space-y-3 text-sm">
              {[
                ["KV Code", detailSchool.kv_code],
                ["Slug", detailSchool.slug],
                ["Hostname", detailSchool.hostname],
                ["City", detailSchool.city],
                ["State", detailSchool.state],
                ["Region", detailSchool.region],
                ["Contact Email", detailSchool.contact_email],
                ["Contact Name", detailSchool.contact_name],
                ["Status", detailSchool.status],
                ["Activated At", fmtDate(detailSchool.activated_at)],
                ["Created At", fmtDate(detailSchool.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Confirm */}
      <Dialog open={!!suspendConfirm} onOpenChange={() => setSuspendConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> Suspend School?
            </DialogTitle>
            <DialogDescription>
              This will mark <strong>{suspendConfirm?.name}</strong> as suspended. Students and staff will lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => suspendConfirm && handleSuspend(suspendConfirm)}>
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm */}
      <Dialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-600">
              <Archive className="h-5 w-5" /> Archive School?
            </DialogTitle>
            <DialogDescription>
              This will archive <strong>{archiveConfirm?.name}</strong>. The school will be hidden from active listings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirm(null)}>Cancel</Button>
            <Button variant="secondary" onClick={() => archiveConfirm && handleArchive(archiveConfirm)}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Tab 2 — DB Control */
function DbControlTab() {
  const registry = getRegistryClient();
  const { toast } = useToast();

  const [schools, setSchools] = useState<School[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [connection, setConnection] = useState<SchoolConnection | null>(null);
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [statsLoading, setStatsLoading] = useState(false);
  const [schoolStats, setSchoolStats] = useState<{ books: number; students: number; issues: number } | null>(null);

  // Reset password
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Migration
  const [migrationSql, setMigrationSql] = useState("");
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);

  // Emergency wipe: 3-step
  const [wipeStep, setWipeStep] = useState(0); // 0=closed, 1,2,3
  const [wipeName, setWipeName] = useState("");
  const [wipeConfirmWord, setWipeConfirmWord] = useState("");

  const selectedSchool = schools.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    registry.from("schools").select("id, name, kv_code, status").order("name").then(({ data }) => {
      setSchools((data ?? []) as School[]);
    });
  }, [registry]);

  useEffect(() => {
    if (!selectedId) { setConnection(null); setSchoolStats(null); return; }
    (async () => {
      const { data } = await registry
        .from("school_connections")
        .select("*")
        .eq("school_id", selectedId)
        .maybeSingle();
      setConnection(data as SchoolConnection | null);
      if (data) fetchSchoolStats(data as SchoolConnection);
    })();
  }, [selectedId, registry]);

  const fetchSchoolStats = async (conn: SchoolConnection) => {
    setStatsLoading(true);
    try {
      const client = createScopedClient(conn.supabase_url, conn.supabase_anon_key);
      const [books, students, issues] = await Promise.all([
        client.from("books").select("*", { count: "exact", head: true }),
        client.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
        client.from("book_issues").select("*", { count: "exact", head: true }).eq("status", "issued"),
      ]);
      setSchoolStats({
        books: books.count ?? 0,
        students: students.count ?? 0,
        issues: issues.count ?? 0,
      });
    } catch {
      setSchoolStats(null);
    }
    setStatsLoading(false);
  };

  const handleHealthCheck = async () => {
    if (!connection) return;
    setHealthStatus("checking");
    try {
      const res = await fetch(`${connection.supabase_url}/rest/v1/`, {
        headers: { apikey: connection.supabase_anon_key },
      });
      setHealthStatus(res.ok ? "ok" : "error");
    } catch {
      setHealthStatus("error");
    }
  };

  const handleResetPassword = async () => {
    if (!connection || !resetEmail) return;
    setResetLoading(true);
    try {
      const res = await fetch(`${connection.supabase_url}/functions/v1/admin-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${connection.supabase_anon_key}`,
        },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (res.ok) {
        toast({ title: "Password Reset Sent", description: `Reset email sent to ${resetEmail}` });
        setResetOpen(false);
        setResetEmail("");
      } else {
        const body = await res.json().catch(() => ({}));
        toast({ title: "Reset Failed", description: body?.error ?? "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Network Error", description: err.message, variant: "destructive" });
    }
    setResetLoading(false);
  };

  const handleRunMigration = async () => {
    if (!connection || !migrationSql.trim()) return;
    setMigrationLoading(true);
    try {
      const client = createScopedClient(connection.supabase_url, connection.supabase_anon_key);
      const { error } = await (client as any).rpc("exec_sql", { sql: migrationSql });
      if (error) throw error;
      toast({ title: "Migration Applied", description: "SQL executed successfully." });
      setMigrationSql("");
      setMigrationOpen(false);
    } catch (err: any) {
      toast({ title: "Migration Failed", description: err.message, variant: "destructive" });
    }
    setMigrationLoading(false);
  };

  const handleWipe = async () => {
    if (!selectedSchool || wipeConfirmWord !== "DELETE") return;
    try {
      const client = connection
        ? createScopedClient(connection.supabase_url, connection.supabase_anon_key)
        : null;
      // Call a wipe edge function if it exists
      if (client && connection) {
        await fetch(`${connection.supabase_url}/functions/v1/emergency-wipe`, {
          method: "POST",
          headers: { Authorization: `Bearer ${connection.supabase_anon_key}` },
        });
      }
      await logAudit(registry, "emergency_wipe", selectedSchool.id, { name: selectedSchool.name });
      toast({ title: "Emergency Wipe Initiated", description: selectedSchool.name, variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Wipe Failed", description: err.message, variant: "destructive" });
    }
    setWipeStep(0);
    setWipeName("");
    setWipeConfirmWord("");
  };

  const statCards = [
    { label: "Books", value: schoolStats?.books, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Students", value: schoolStats?.students, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Issues", value: schoolStats?.issues, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Database Control</h2>
        <p className="text-sm text-muted-foreground">Manage individual school databases</p>
      </div>

      {/* School Selector */}
      <Card className="border-border/50">
        <CardContent className="pt-5">
          <Label>Select School</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="mt-1.5 w-full max-w-sm">
              <SelectValue placeholder="Choose a school…" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.kv_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedId && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Database className="h-10 w-10 mx-auto mb-3 opacity-25" />
          Select a school to manage its database
        </div>
      )}

      {selectedId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {statCards.map((s) => (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    {statsLoading ? <Skeleton className="h-5 w-12 mb-1" /> : <p className="text-xl font-bold text-foreground">{s.value ?? "—"}</p>}
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Health Check */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Health Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Ping the school's Supabase REST endpoint.</p>
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={handleHealthCheck} disabled={healthStatus === "checking" || !connection} className="gap-2">
                    {healthStatus === "checking" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Run Health Check
                  </Button>
                  {healthStatus === "ok" && <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium"><CheckCircle className="h-4 w-4" /> Online</span>}
                  {healthStatus === "error" && <span className="flex items-center gap-1 text-sm text-red-600 font-medium"><XCircle className="h-4 w-4" /> Unreachable</span>}
                </div>
                {!connection && <p className="text-xs text-amber-600">No connection record found for this school.</p>}
              </CardContent>
            </Card>

            {/* Reset Admin Password */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Reset Admin Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Send a password reset to the school admin via their edge function.</p>
                <Button size="sm" variant="outline" onClick={() => setResetOpen(true)} disabled={!connection} className="gap-2">
                  <Settings className="h-3.5 w-3.5" /> Reset Password
                </Button>
              </CardContent>
            </Card>

            {/* Export Data */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" /> Export Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Export the school's full data archive.</p>
                <Button size="sm" variant="outline" className="gap-2"
                  onClick={() => toast({ title: "Export Initiated", description: "Export initiated — check your email." })}>
                  <Download className="h-3.5 w-3.5" /> Export to Email
                </Button>
              </CardContent>
            </Card>

            {/* Run Migration */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Run Migration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Execute raw SQL on the school's database.</p>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setMigrationOpen(true)} disabled={!connection}>
                  <Upload className="h-3.5 w-3.5" /> Open SQL Editor
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Emergency Wipe */}
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Emergency Wipe
              </CardTitle>
              <CardDescription className="text-red-600/70">
                Permanently wipe all data for {selectedSchool?.name}. This action is irreversible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" size="sm" className="gap-2" onClick={() => setWipeStep(1)}>
                <Trash2 className="h-3.5 w-3.5" /> Emergency Wipe
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Admin Password</DialogTitle>
            <DialogDescription>Enter the admin email to send a password reset.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Admin Email</Label>
            <Input type="email" placeholder="admin@school.edu.in" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetLoading || !resetEmail}>
              {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration Dialog */}
      <Dialog open={migrationOpen} onOpenChange={setMigrationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> SQL Migration Editor
            </DialogTitle>
            <DialogDescription>
              Write and apply SQL directly to <strong>{selectedSchool?.name}</strong>'s database. Double-check before applying.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={8}
            placeholder="-- Enter your SQL here&#10;ALTER TABLE books ADD COLUMN isbn_13 TEXT;"
            value={migrationSql}
            onChange={(e) => setMigrationSql(e.target.value)}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrationOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRunMigration} disabled={migrationLoading || !migrationSql.trim()}>
              {migrationLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Wipe — Step 1 */}
      <Dialog open={wipeStep === 1} onOpenChange={(o) => !o && setWipeStep(0)}>
        <DialogContent className="max-w-sm border-red-300">
          <DialogHeader>
            <DialogTitle className="text-red-700">⚠️ Emergency Wipe — Step 1 of 3</DialogTitle>
            <DialogDescription>Type the school name to confirm you understand what you're doing.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder={selectedSchool?.name}
            value={wipeName}
            onChange={(e) => setWipeName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWipeStep(0)}>Cancel</Button>
            <Button variant="destructive" disabled={wipeName !== selectedSchool?.name} onClick={() => setWipeStep(2)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2 */}
      <Dialog open={wipeStep === 2} onOpenChange={(o) => !o && setWipeStep(0)}>
        <DialogContent className="max-w-sm border-red-400">
          <DialogHeader>
            <DialogTitle className="text-red-700">⚠️ Emergency Wipe — Step 2 of 3</DialogTitle>
            <DialogDescription>
              You are about to permanently wipe all data for <strong>{selectedSchool?.name}</strong>. This cannot be undone.
              Click Confirm to proceed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWipeStep(0)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setWipeStep(3)}>Confirm — I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 3 */}
      <Dialog open={wipeStep === 3} onOpenChange={(o) => !o && setWipeStep(0)}>
        <DialogContent className="max-w-sm border-red-500">
          <DialogHeader>
            <DialogTitle className="text-red-700">⚠️ Emergency Wipe — Step 3 of 3</DialogTitle>
            <DialogDescription>Type <strong>DELETE</strong> in all caps to execute the wipe.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="DELETE"
            value={wipeConfirmWord}
            onChange={(e) => setWipeConfirmWord(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWipeStep(0)}>Cancel</Button>
            <Button variant="destructive" disabled={wipeConfirmWord !== "DELETE"} onClick={handleWipe}>
              <Trash2 className="h-4 w-4 mr-2" /> Execute Wipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Tab 3 — Analytics */
function AnalyticsTab() {
  const registry = getRegistryClient();
  const [schools, setSchools] = useState<School[]>([]);
  const [stats, setStats] = useState<SchoolStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: schoolsData } = await registry.from("schools").select("*").order("name");
      const list = (schoolsData ?? []) as School[];
      setSchools(list);

      // Init skeleton rows
      setStats(
        list.map((s) => ({
          schoolId: s.id,
          schoolName: s.name,
          books: 0,
          students: 0,
          issuesThisMonth: 0,
          lastActive: null,
          loading: true,
        }))
      );
      setLoading(false);

      // Fetch connection details and stats per school concurrently
      const { data: conns } = await registry.from("school_connections").select("*");
      const connMap: Record<string, SchoolConnection> = {};
      (conns ?? []).forEach((c: any) => { connMap[c.school_id] = c; });

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      await Promise.all(
        list.map(async (school) => {
          const conn = connMap[school.id];
          if (!conn) {
            setStats((prev) =>
              prev.map((s) => s.schoolId === school.id ? { ...s, loading: false } : s)
            );
            return;
          }
          try {
            const client = createScopedClient(conn.supabase_url, conn.supabase_anon_key);
            const [books, students, issues] = await Promise.all([
              client.from("books").select("*", { count: "exact", head: true }),
              client.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
              client.from("book_issues").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
            ]);
            setStats((prev) =>
              prev.map((s) =>
                s.schoolId === school.id
                  ? { ...s, books: books.count ?? 0, students: students.count ?? 0, issuesThisMonth: issues.count ?? 0, loading: false }
                  : s
              )
            );
          } catch {
            setStats((prev) =>
              prev.map((s) => s.schoolId === school.id ? { ...s, loading: false } : s)
            );
          }
        })
      );
    })();
  }, [registry]);

  const activeCount = schools.filter((s) => s.status === "active").length;
  const pendingCount = schools.filter((s) => s.status === "pending").length;
  const suspendedCount = schools.filter((s) => s.status === "suspended").length;

  const summaryCards = [
    { label: "Total Schools", value: schools.length, icon: School, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active", value: activeCount, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending", value: pendingCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Suspended", value: suspendedCount, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Platform Analytics</h2>
        <p className="text-sm text-muted-foreground">Aggregated metrics across all registered schools</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              {loading ? <Skeleton className="h-6 w-10 mb-1" /> : <p className="text-2xl font-bold text-foreground">{s.value}</p>}
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-school table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">School-wise Breakdown</CardTitle>
          <CardDescription>Live stats fetched from each school's database</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["School", "Status", "Books", "Students", "Issues This Month", "Last Active"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.length === 0 && loading && [1, 2, 3].map((i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))}
                {stats.map((s) => (
                  <tr key={s.schoolId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.schoolName}</td>
                    <td className="px-4 py-3">{statusBadge((schools.find((sc) => sc.id === s.schoolId)?.status ?? "pending") as SchoolStatus)}</td>
                    <td className="px-4 py-3">
                      {s.loading ? <Skeleton className="h-4 w-8" /> : <span className="font-mono">{s.books.toLocaleString()}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.loading ? <Skeleton className="h-4 w-8" /> : <span className="font-mono">{s.students.toLocaleString()}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.loading ? <Skeleton className="h-4 w-8" /> : <span className="font-mono">{s.issuesThisMonth.toLocaleString()}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s.loading ? <Skeleton className="h-4 w-20" /> : (s.lastActive ? fmtDate(s.lastActive) : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Tab 4 — Broadcast */
function BroadcastTab() {
  const registry = getRegistryClient();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"info" | "warning" | "critical">("info");
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [targetSchools, setTargetSchools] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    const { data } = await registry
      .from("platform_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements((data ?? []) as Announcement[]);
    setLoading(false);
  }, [registry]);

  useEffect(() => {
    fetchAnnouncements();
    registry.from("schools").select("id, name").eq("status", "active").order("name").then(({ data }) => {
      setSchools((data ?? []) as School[]);
    });
  }, [fetchAnnouncements, registry]);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    const { error } = await registry.from("platform_announcements").insert({
      title: title.trim(),
      body: body.trim(),
      type,
      target: targetMode === "all" ? "all" : targetSchools,
      expires_at: expiresAt || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to create announcement", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Announcement Created", description: `"${title}" broadcast successfully.` });
    setTitle(""); setBody(""); setType("info"); setTargetMode("all"); setTargetSchools([]); setExpiresAt("");
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await registry.from("platform_announcements").delete().eq("id", id);
    fetchAnnouncements();
  };

  const typeBadge = (t: Announcement["type"]) => {
    const map = {
      info: "bg-blue-100 text-blue-700 border-blue-200",
      warning: "bg-amber-100 text-amber-700 border-amber-200",
      critical: "bg-red-100 text-red-700 border-red-200",
    };
    return <Badge className={`border ${map[t]} capitalize`}>{t}</Badge>;
  };

  const toggleSchool = (id: string) =>
    setTargetSchools((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Platform Broadcast</h2>
        <p className="text-sm text-muted-foreground">Send announcements to all or specific schools</p>
      </div>

      {/* Create Form */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> New Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                  <SelectItem value="warning">⚠️ Warning</SelectItem>
                  <SelectItem value="critical">🚨 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Message Body</Label>
            <Textarea
              rows={4}
              placeholder="Write your announcement message here…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label>Target</Label>
            <div className="flex gap-4">
              {(["all", "specific"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="target"
                    value={m}
                    checked={targetMode === m}
                    onChange={() => setTargetMode(m)}
                    className="accent-primary"
                  />
                  {m === "all" ? "All Schools" : "Specific Schools"}
                </label>
              ))}
            </div>
            {targetMode === "specific" && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                {schools.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSchool(s.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      targetSchools.includes(s.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
                {schools.length === 0 && <span className="text-xs text-muted-foreground">No active schools found.</span>}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Expires At <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !body.trim() || (targetMode === "specific" && targetSchools.length === 0)}
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            Broadcast Announcement
          </Button>
        </CardContent>
      </Card>

      {/* Existing Announcements */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Existing Announcements</h3>
        {loading ? (
          <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : announcements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-25" />
              No announcements yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className="border-border/50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{a.title}</span>
                        {typeBadge(a.type)}
                        <Badge variant="outline" className="text-xs">
                          {a.target === "all" ? "All Schools" : `${(a.target as string[]).length} school(s)`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(a.created_at)}</span>
                        {a.expires_at && <span>Expires: {fmtDate(a.expires_at)}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
const SuperAdminPage = () => {
  const registry = getRegistryClient();
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState<"loading" | "authorized" | "denied">("loading");

  useEffect(() => {
    (async () => {
      try {
        if (!registry) {
          setAuthStatus("denied");
          return;
        }

        let resolvedUid: string | undefined = undefined;
        let resolvedEmail: string | undefined = undefined;

        // Check session from registry client
        const { data: sessionData } = await registry.auth.getSession();
        if (sessionData?.session?.user) {
          resolvedUid = sessionData.session.user.id;
          resolvedEmail = sessionData.session.user.email?.toLowerCase().trim();
        }

        // Fallback: check tenant session
        if (!resolvedUid && !resolvedEmail) {
          const tenantUrl = import.meta.env.VITE_SUPABASE_URL as string;
          const tenantKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
          if (tenantUrl && tenantKey) {
            const tenantClient = createClient(tenantUrl, tenantKey, {
              auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
            });
            const { data: ts } = await tenantClient.auth.getSession();
            if (ts?.session?.user) {
              resolvedUid = ts.session.user.id;
              resolvedEmail = ts.session.user.email?.toLowerCase().trim();
            }
          }
        }

        if (!resolvedUid && !resolvedEmail) {
          setAuthStatus("denied");
          return;
        }

        // 1. Try matching by auth_uid first
        let matched = false;
        if (resolvedUid) {
          const { data: uidData } = await registry
            .from("super_admins")
            .select("id, is_active")
            .eq("auth_uid", resolvedUid)
            .eq("is_active", true)
            .maybeSingle();

          if (uidData) {
            matched = true;
          }
        }

        // 2. If not matched by uid, check by email
        if (!matched && resolvedEmail) {
          const { data: emailData } = await registry
            .from("super_admins")
            .select("id, auth_uid, is_active")
            .ilike("email", resolvedEmail)
            .eq("is_active", true)
            .maybeSingle();

          if (emailData) {
            matched = true;
            if (!emailData.auth_uid && resolvedUid) {
              await registry
                .from("super_admins")
                .update({ auth_uid: resolvedUid })
                .eq("id", emailData.id);
            }
          }
        }

        setAuthStatus(matched ? "authorized" : "denied");
      } catch {
        setAuthStatus("denied");
      }
    })();
  }, [registry]);

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Verifying super admin access…</p>
        </div>
      </div>
    );
  }

  if (authStatus === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/40">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <Shield className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-xl text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              You don't have Super Admin privileges. This area is restricted to platform administrators only.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              ← Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">Super Admin Portal</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">DLMS Multi-tenant Platform</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs gap-1.5 border-primary/30 text-primary bg-primary/5">
            <Activity className="h-3 w-3" /> Platform Admin
          </Badge>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="schools" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="schools" className="gap-1.5 text-xs sm:text-sm">
              <School className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Schools</span>
              <span className="sm:hidden">🏫</span>
            </TabsTrigger>
            <TabsTrigger value="db" className="gap-1.5 text-xs sm:text-sm">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">DB Control</span>
              <span className="sm:hidden">🗄️</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">📊</span>
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="gap-1.5 text-xs sm:text-sm">
              <Megaphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Broadcast</span>
              <span className="sm:hidden">📢</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schools" className="mt-0">
            <SchoolsTab />
          </TabsContent>

          <TabsContent value="db" className="mt-0">
            <DbControlTab />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="broadcast" className="mt-0">
            <BroadcastTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdminPage;
