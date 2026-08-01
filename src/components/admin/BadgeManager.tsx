import { useEffect, useMemo, useState } from "react";
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
import { Award, Plus, Edit, Trash2, UserPlus, Users, CheckCircle } from "lucide-react";

interface BadgeRow {
  id: string; name: string; description?: string; icon_name?: string; color?: string;
  points: number; criteria_type?: string; criteria_value?: number; is_active: boolean;
}

const CRIT_TYPES = [
  "manual", "points", "books_read", "quizzes_completed", "login_streak",
  "posts_count", "comments_count", "friends_count", "books_issued", "reviews_count"
];

const CRIT_LABELS: Record<string, string> = {
  manual: "Manual Award (By Admin)",
  points: "XP Points Threshold",
  books_read: "Books Read (Approved Reviews)",
  quizzes_completed: "Quizzes Completed",
  login_streak: "Consecutive Daily Logins",
  posts_count: "Community Posts Created",
  comments_count: "Community Replies Posted",
  friends_count: "Friend Connections Made",
  books_issued: "Total Books Borrowed",
  reviews_count: "Book Reviews Written"
};

export default function BadgeManager() {
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [awardCounts, setAwardCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<BadgeRow | null>(null);
  const [form, setForm] = useState<Partial<BadgeRow>>({ name: "", description: "", icon_name: "Award", color: "text-primary", points: 10, criteria_type: "manual", criteria_value: 0, is_active: true });
  const [awardOpen, setAwardOpen] = useState<BadgeRow | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // Earner drilldown
  const [earnerOpen, setEarnerOpen] = useState<BadgeRow | null>(null);
  const [earnerList, setEarnerList] = useState<any[]>([]);
  const [earnerLoading, setEarnerLoading] = useState(false);

  // Cache of all users for auto-badge earner computation
  const [cachedAllUsers, setCachedAllUsers] = useState<any[]>([]);
  const [cachedHelperMaps, setCachedHelperMaps] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("badges").select("*").order("created_at", { ascending: false });
    setBadges((data as any) || []);

    // Get real award count for manual and auto criteria
    const [{ data: awards }, { data: allUsers }, { data: posts }, { data: comments }, { data: friendships }, { data: issues }, { data: reviews }] = await Promise.all([
      supabase.from("badge_awards").select("badge_id, user_id"),
      supabase.from("profiles").select("id, points, reading_history(id,status), quiz_results(id), login_streaks(current_streak)").eq("role", "student"),
      supabase.from("posts").select("user_id"),
      supabase.from("post_comments").select("user_id"),
      supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted"),
      supabase.from("book_issues").select("user_id"),
      supabase.from("book_reviews").select("user_id")
    ]);

    const postsMap: Record<string, number> = {};
    (posts || []).forEach(p => { postsMap[p.user_id] = (postsMap[p.user_id] || 0) + 1; });

    const commentsMap: Record<string, number> = {};
    (comments || []).forEach(c => { commentsMap[c.user_id] = (commentsMap[c.user_id] || 0) + 1; });

    const friendsMap: Record<string, number> = {};
    (friendships || []).forEach(f => {
      friendsMap[f.requester_id] = (friendsMap[f.requester_id] || 0) + 1;
      friendsMap[f.addressee_id] = (friendsMap[f.addressee_id] || 0) + 1;
    });

    const issuesMap: Record<string, number> = {};
    (issues || []).forEach(i => { issuesMap[i.user_id] = (issuesMap[i.user_id] || 0) + 1; });

    const reviewsMap: Record<string, number> = {};
    (reviews || []).forEach(r => { reviewsMap[r.user_id] = (reviewsMap[r.user_id] || 0) + 1; });

    const counts: Record<string, number> = {};
    const manualAwards = awards || [];
    const activeBadges = (data as any) || [];

    activeBadges.forEach((b: any) => {
      let count = 0;
      if (b.criteria_type === "manual" || !b.criteria_type) {
        count = manualAwards.filter((a: any) => a.badge_id === b.id).length;
      } else {
        // Evaluate auto-criteria count
        (allUsers || []).forEach((u: any) => {
          // Manual check
          const hasManual = manualAwards.some((a: any) => a.badge_id === b.id && a.user_id === u.id);
          if (hasManual) {
            count++;
            return;
          }

          let val = 0;
          if (b.criteria_type === "points") val = u.points || 0;
          else if (b.criteria_type === "books_read") val = (u.reading_history?.filter((r: any) => r.status === "approved")?.length) || 0;
          else if (b.criteria_type === "quizzes_completed") val = u.quiz_results?.length || 0;
          else if (b.criteria_type === "login_streak") val = u.login_streaks?.[0]?.current_streak || 0;
          else if (b.criteria_type === "posts_count") val = postsMap[u.id] || 0;
          else if (b.criteria_type === "comments_count") val = commentsMap[u.id] || 0;
          else if (b.criteria_type === "friends_count") val = friendsMap[u.id] || 0;
          else if (b.criteria_type === "books_issued") val = issuesMap[u.id] || 0;
          else if (b.criteria_type === "reviews_count") val = reviewsMap[u.id] || 0;

          if (val >= (b.criteria_value || 0)) {
            count++;
          }
        });
      }
      counts[b.id] = count;
    });

    setAwardCounts(counts);

    // Cache data for earner drilldowns
    setCachedAllUsers(allUsers || []);
    setCachedHelperMaps({ postsMap, commentsMap, friendsMap, issuesMap, reviewsMap, manualAwards });

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
    setAwardOpen(b); setSelectedStudent(""); setStudentSearch("");
    const { data } = await supabase.from("profiles").select("id, first_name, last_name, student_class, admission_number").eq("role", "student").eq("is_approved", true).order("first_name");
    setStudents(data || []);
  };

  const openEarners = async (b: BadgeRow) => {
    setEarnerOpen(b);
    setEarnerLoading(true);
    setEarnerList([]);

    if (b.criteria_type === "manual" || !b.criteria_type) {
      // Fetch actual badge_awards records with user + awarder profile
      const { data: awards } = await supabase
        .from("badge_awards")
        .select("user_id, awarded_by, award_type, awarded_at, note")
        .eq("badge_id", b.id)
        .order("awarded_at", { ascending: false });

      if (awards && awards.length > 0) {
        const userIds = awards.map((a: any) => a.user_id);
        const awarderIds = awards.map((a: any) => a.awarded_by).filter(Boolean);
        const allIds = Array.from(new Set([...userIds, ...awarderIds]));

        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, admission_number, role, student_class")
          .in("id", allIds);
        const profMap: Record<string, any> = {};
        (profs || []).forEach((p: any) => { profMap[p.id] = p; });

        setEarnerList(awards.map((a: any) => ({
          user: profMap[a.user_id],
          awarder: a.awarded_by ? profMap[a.awarded_by] : null,
          award_type: a.award_type,
          awarded_at: a.awarded_at,
          note: a.note,
        })));
      }
    } else {
      // Auto criteria — compute from cached data
      const maps = cachedHelperMaps || {};
      const qualifying = cachedAllUsers.filter((u: any) => {
        let val = 0;
        if (b.criteria_type === "points") val = u.points || 0;
        else if (b.criteria_type === "books_read") val = (u.reading_history?.filter((r: any) => r.status === "approved")?.length) || 0;
        else if (b.criteria_type === "quizzes_completed") val = u.quiz_results?.length || 0;
        else if (b.criteria_type === "login_streak") val = u.login_streaks?.[0]?.current_streak || 0;
        else if (b.criteria_type === "posts_count") val = maps.postsMap?.[u.id] || 0;
        else if (b.criteria_type === "comments_count") val = maps.commentsMap?.[u.id] || 0;
        else if (b.criteria_type === "friends_count") val = maps.friendsMap?.[u.id] || 0;
        else if (b.criteria_type === "books_issued") val = maps.issuesMap?.[u.id] || 0;
        else if (b.criteria_type === "reviews_count") val = maps.reviewsMap?.[u.id] || 0;
        return val >= (b.criteria_value || 0);
      });

      // Fetch proper profiles for qualifying users
      if (qualifying.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, admission_number, student_class")
          .in("id", qualifying.map((u: any) => u.id));
        setEarnerList((profs || []).map((p: any) => ({ user: p, awarder: null, award_type: 'auto', awarded_at: null })));
      }
    }
    setEarnerLoading(false);
  };
  const doAward = async () => {
    if (!awardOpen || !selectedStudent) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("badge_awards").insert({ user_id: selectedStudent, badge_id: awardOpen.id, awarded_by: user!.id, award_type: "manual" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Badge awarded" }); setAwardOpen(null); }
  };

  const matchingStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter(student =>
      `${student.first_name || ""} ${student.last_name || ""}`.toLowerCase().includes(query) ||
      (student.admission_number || "").toLowerCase().includes(query)
    );
  }, [students, studentSearch]);

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
                  <Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px]">{CRIT_LABELS[b.criteria_type || "manual"] || b.criteria_type}</Badge>
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2">{b.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">+{b.points} pts</Badge>
                  {b.criteria_type !== "manual" && <Badge variant="outline">Target: {b.criteria_value}</Badge>}
                  <Badge
                    variant="secondary"
                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-100/50 cursor-pointer transition-colors"
                    onClick={() => openEarners(b)}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Earned by: {awardCounts[b.id] || 0}
                  </Badge>
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
                  <SelectContent>{CRIT_TYPES.map(t => <SelectItem key={t} value={t}>{CRIT_LABELS[t] || t}</SelectItem>)}</SelectContent>
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
          <Input value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder="Search by admission number or name..." />
          {studentSearch.trim() && (
            <div className="max-h-32 overflow-y-auto rounded-md border p-1">
              {matchingStudents.length ? matchingStudents.map(student => (
                <Button key={student.id} type="button" variant="ghost" className="w-full justify-start text-left" onClick={() => setSelectedStudent(student.id)}>
                  {student.first_name} {student.last_name} · {student.admission_number || "No admission #"}
                </Button>
              )) : <p className="p-2 text-sm text-muted-foreground">No matching students</p>}
            </div>
          )}
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

      {/* Earners Drilldown Dialog */}
      <Dialog open={!!earnerOpen} onOpenChange={(o) => !o && setEarnerOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Who Earned "{earnerOpen?.name}"
              {!earnerLoading && (
                <Badge variant="secondary" className="ml-2 text-xs">{earnerList.length} {earnerOpen?.criteria_type === 'manual' ? 'awarded' : 'qualifying'}</Badge>
              )}
            </DialogTitle>
            {earnerOpen && (
              <p className="text-xs text-muted-foreground mt-1">
                {earnerOpen.criteria_type === 'manual'
                  ? 'Manually awarded by admin'
                  : `Auto: ${CRIT_LABELS[earnerOpen.criteria_type || 'manual']} ≥ ${earnerOpen.criteria_value}`}
              </p>
            )}
          </DialogHeader>

          {earnerLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : earnerList.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No one has earned this badge yet.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {earnerList.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-700">{idx + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {entry.user ? `${entry.user.first_name || ''} ${entry.user.last_name || ''}`.trim() : 'Unknown User'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {entry.user?.admission_number && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Admn: {entry.user.admission_number}
                          </span>
                        )}
                        {entry.user?.student_class && (
                          <span className="text-[10px] text-muted-foreground">Class {entry.user.student_class}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    {entry.award_type === 'manual' && entry.awarder ? (
                      <p className="text-[10px] text-muted-foreground">
                        Awarded by <span className="font-medium text-foreground">{entry.awarder.first_name} {entry.awarder.last_name}</span>
                      </p>
                    ) : entry.award_type === 'auto' ? (
                      <Badge variant="outline" className="text-[9px]">
                        <CheckCircle className="h-2.5 w-2.5 mr-1 text-green-500" />Auto-qualified
                      </Badge>
                    ) : null}
                    {entry.awarded_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(entry.awarded_at).toLocaleDateString()}
                      </p>
                    )}
                    {entry.note && (
                      <p className="text-[10px] italic text-muted-foreground max-w-[120px] truncate" title={entry.note}>"{entry.note}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
