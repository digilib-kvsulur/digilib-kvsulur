import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Plus, Edit, Trash2, UserPlus } from "lucide-react";

interface BadgeRow {
  id: string; name: string; description?: string; icon_name?: string; color?: string;
  points: number; criteria_type?: string; criteria_value?: number; is_active: boolean;
}

const CRIT_TYPES = ["manual", "points", "books_read", "quizzes_completed", "login_streak"];

export default function BadgeManager() {
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<BadgeRow | null>(null);
  const [form, setForm] = useState<Partial<BadgeRow>>({ name: "", description: "", icon_name: "Award", color: "text-primary", points: 10, criteria_type: "manual", criteria_value: 0, is_active: true });
  const [awardOpen, setAwardOpen] = useState<BadgeRow | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("badges").select("*").order("created_at", { ascending: false });
    setBadges((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", icon_name: "Award", color: "text-primary", points: 10, criteria_type: "manual", criteria_value: 0, is_active: true }); setDlgOpen(true); };
  const openEdit = (b: BadgeRow) => { setEditing(b); setForm(b); setDlgOpen(true); };

  const save = async () => {
    if (!form.name?.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = {
      name: form.name!.trim(),
      description: form.description || null,
      icon_name: form.icon_name || "Award",
      color: form.color || "text-primary",
      points: Number(form.points) || 0,
      criteria_type: form.criteria_type || "manual",
      criteria_value: Number(form.criteria_value) || 0,
      is_active: form.is_active ?? true,
    };
    const { error } = editing
      ? await supabase.from("badges").update(payload).eq("id", editing.id)
      : await supabase.from("badges").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Badge updated" : "Badge created" });
    setDlgOpen(false); load();
  };

  const del = async (b: BadgeRow) => {
    if (!confirm(`Delete "${b.name}"?`)) return;
    const { error } = await supabase.from("badges").delete().eq("id", b.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  const openAward = async (b: BadgeRow) => {
    setAwardOpen(b); setSelectedStudent("");
    const { data } = await supabase.from("profiles").select("id, first_name, last_name, student_class").eq("role", "student").eq("is_approved", true).order("first_name");
    setStudents(data || []);
  };
  const doAward = async () => {
    if (!awardOpen || !selectedStudent) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("badge_awards").insert({ user_id: selectedStudent, badge_id: awardOpen.id, awarded_by: user!.id, award_type: "manual" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Badge awarded" }); setAwardOpen(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-primary" /> Badge Cabinet Manager</h2>
          <p className="text-sm text-muted-foreground">Create badges, set auto criteria, or manually award any badge.</p>
        </div>
        <Button onClick={openNew} className="gradient-primary border-0"><Plus className="h-4 w-4 mr-2" />New Badge</Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map(b => (
            <Card key={b.id} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">{b.name}</span>
                  <Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px]">{b.criteria_type}</Badge>
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2">{b.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">+{b.points} pts</Badge>
                  {b.criteria_type !== "manual" && <Badge variant="outline">Target: {b.criteria_value}</Badge>}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => openAward(b)}><UserPlus className="h-3.5 w-3.5 mr-1" />Award</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => del(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {badges.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No badges yet. Create one!</p>}
        </div>
      )}

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Badge" : "New Badge"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Icon name (lucide)</Label><Input value={form.icon_name || ""} onChange={e => setForm({ ...form, icon_name: e.target.value })} placeholder="Award / Trophy / Flame" /></div>
              <div><Label>Points</Label><Input type="number" value={form.points ?? 0} onChange={e => setForm({ ...form, points: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Criteria Type</Label>
                <Select value={form.criteria_type || "manual"} onValueChange={v => setForm({ ...form, criteria_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CRIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Target Value</Label><Input type="number" value={form.criteria_value ?? 0} onChange={e => setForm({ ...form, criteria_value: parseInt(e.target.value) || 0 })} disabled={form.criteria_type === "manual"} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={save} className="gradient-primary border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!awardOpen} onOpenChange={(o) => !o && setAwardOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Award "{awardOpen?.name}"</DialogTitle></DialogHeader>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger><SelectValue placeholder="Pick a student..." /></SelectTrigger>
            <SelectContent className="max-h-72">{students.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} · Class {s.student_class || "—"}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardOpen(null)}>Cancel</Button>
            <Button onClick={doAward} disabled={!selectedStudent}>Award</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
