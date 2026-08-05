import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Plus, Trash2, Search, LayoutTemplate, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCertificateTemplateUrl,
  fetchCertificateLayout,
  saveCertificateLayout,
  DEFAULT_CERTIFICATE_LAYOUT,
  type CertificateLayout,
  type CertFieldLayout,
} from "@/lib/librarySettings";
import CertificateCanvas from "@/components/certificates/CertificateCanvas";

interface CertificateRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  template_url: string | null;
  issued_at: string;
  event_id?: string | null;
  profiles?: { first_name: string | null; last_name: string | null; admission_number: string | null; student_class: string | null };
}

const FIELD_LABELS: { key: keyof CertificateLayout; label: string }[] = [
  { key: "name", label: "Student name" },
  { key: "className", label: "Class" },
  { key: "event", label: "Event name" },
  { key: "title", label: "Certificate title" },
  { key: "description", label: "Description" },
  { key: "date", label: "Date" },
];

export default function CertificateManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<CertificateLayout>(DEFAULT_CERTIFICATE_LAYOUT);
  const [savingLayout, setSavingLayout] = useState(false);
  const [search, setSearch] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    title: "",
    description: "",
    event_id: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: certs }, tpl, lay] = await Promise.all([
        supabase.from("issued_certificates").select("*").order("issued_at", { ascending: false }),
        fetchCertificateTemplateUrl(),
        fetchCertificateLayout(),
      ]);
      setTemplateUrl(tpl);
      setLayout(lay);
      const list = (certs as any[]) || [];
      const userIds = Array.from(new Set(list.map((c) => c.user_id)));
      let profileMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, admission_number, student_class")
          .in("id", userIds);
        (profs || []).forEach((p) => { profileMap[p.id] = p; });
      }
      setRows(list.map((c) => ({ ...c, profiles: profileMap[c.user_id] })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openIssueDialog = async () => {
    setForm({ user_id: "", title: "", description: "", event_id: "" });
    const [{ data: studs }, { data: evts }, tpl] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, admission_number, student_class")
        .eq("role", "student")
        .eq("is_approved", true)
        .order("first_name")
        .limit(2000),
      supabase.from("library_events").select("id, title").order("event_date", { ascending: false }).limit(50),
      fetchCertificateTemplateUrl(),
    ]);
    setStudents(studs || []);
    setEvents(evts || []);
    setTemplateUrl(tpl);
    setOpen(true);
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 80);
    return students
      .filter((s) => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        return name.includes(q) || (s.admission_number || "").toLowerCase().includes(q) || (s.student_class || "").toLowerCase().includes(q);
      })
      .slice(0, 80);
  }, [students, search]);

  const handleIssue = async () => {
    if (!form.user_id || !form.title.trim()) {
      toast({ title: "Missing fields", description: "Select a student and enter a title.", variant: "destructive" });
      return;
    }
    setIssuing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("issued_certificates").insert({
        user_id: form.user_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_id: form.event_id || null,
        template_url: templateUrl,
        issued_by: user?.id || null,
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        target_user_id: form.user_id,
        sent_by: user!.id,
        title: "Certificate awarded",
        message: `You received a certificate: "${form.title.trim()}". View it on your dashboard.`,
        type: "success",
      });

      toast({ title: "Certificate issued" });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIssuing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("issued_certificates").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      load();
    }
  };

  const updateField = (key: keyof CertificateLayout, patch: Partial<CertFieldLayout>) => {
    setLayout((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSaveLayout = async () => {
    setSavingLayout(true);
    try {
      await saveCertificateLayout(layout);
      toast({ title: "Layout saved", description: "Certificate field positions updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingLayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6" /> Certificates
          </h2>
          <p className="text-sm text-muted-foreground">
            Issue certificates and position name, class, event, and other fields on your template.
          </p>
        </div>
        <Button onClick={openIssueDialog}>
          <Plus className="h-4 w-4 mr-2" /> Issue Certificate
        </Button>
      </div>

      {!templateUrl && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 text-sm text-amber-900">
            No certificate template uploaded yet. Upload one under <strong>Library Settings</strong> first.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="issued">
        <TabsList>
          <TabsTrigger value="issued">Issued</TabsTrigger>
          <TabsTrigger value="layout" className="gap-1.5">
            <LayoutTemplate className="h-3.5 w-3.5" /> Field placement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issued" className="space-y-2 mt-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
          ) : (
            rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.profiles?.first_name} {r.profiles?.last_name}
                      {r.profiles?.student_class ? ` · Class ${r.profiles.student_class}` : ""}
                      {r.profiles?.admission_number ? ` · ${r.profiles.admission_number}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Issued {new Date(r.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Certificate</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="layout" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Position fields on template</CardTitle>
              <CardDescription>
                Adjust X/Y (percent of certificate), font size, and visibility so text matches your design.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {FIELD_LABELS.map(({ key, label }) => {
                  const f = layout[key];
                  return (
                    <div key={key} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="font-medium">{label}</Label>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={f.visible}
                            onChange={(e) => updateField(key, { visible: e.target.checked })}
                          />
                          Show
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">X %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={f.x}
                            onChange={(e) => updateField(key, { x: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Y %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={f.y}
                            onChange={(e) => updateField(key, { y: Number(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Size</Label>
                          <Input
                            type="number"
                            min={8}
                            max={72}
                            value={f.fontSize}
                            onChange={(e) => updateField(key, { fontSize: Number(e.target.value) || 12 })}
                          />
                        </div>
                      </div>
                      <Select value={f.align} onValueChange={(v) => updateField(key, { align: v as CertFieldLayout["align"] })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
                <Button onClick={handleSaveLayout} disabled={savingLayout}>
                  <Save className="h-4 w-4 mr-2" /> {savingLayout ? "Saving…" : "Save layout"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Live preview</Label>
                <CertificateCanvas
                  layout={layout}
                  data={{
                    studentName: "Sample Student",
                    studentClass: "7D",
                    eventName: "Sample Library Event",
                    title: "Certificate of Recognition",
                    description: "For outstanding participation",
                    issuedAt: new Date().toISOString(),
                    templateUrl,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, class, admission…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={form.user_id} onValueChange={(v) => setForm((f) => ({ ...f, user_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                      {s.student_class ? ` (${s.student_class})` : ""}
                      {s.admission_number ? ` · ${s.admission_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Certificate title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Event (optional)</Label>
              <Select value={form.event_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, event_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Link event" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No event</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={issuing}>{issuing ? "Issuing…" : "Issue"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
