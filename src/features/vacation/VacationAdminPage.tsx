import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, Plus, Sparkles, Sun, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  deleteActivity,
  fetchActivities,
  fetchExportRows,
  fetchLeaderboard,
  fetchMilestones,
  fetchParticipationStats,
  fetchReviewQueue,
  fetchVacationCampaigns,
  replaceMilestones,
  reviewSubmission,
  seedPosterDrafts,
  upsertActivity,
  upsertVacationCampaign,
} from "./api";
import { vacationRowsToCsv } from "./csv";
import { vacationErrorMessage } from "./errors";
import { POSTER_ACTIVITIES } from "./constants";
import type {
  VacationActivity,
  VacationCampaign,
  VacationCampaignStatus,
  VacationLeaderboardRow,
  VacationParticipationStats,
  VacationStreakMilestone,
  VacationSubmission,
} from "./types";

interface VacationAdminPageProps {
  canConfigure?: boolean;
}

const emptyCampaign = {
  title: "",
  start_date: "",
  end_date: "",
  timezone: "Asia/Kolkata",
  default_points: 10,
  max_award_points: 100,
  status: "draft" as VacationCampaignStatus,
  banner_enabled: false,
  banner_text: "",
  banner_link: "",
};

export default function VacationAdminPage({ canConfigure = true }: VacationAdminPageProps) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<VacationCampaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [form, setForm] = useState(emptyCampaign);
  const [milestones, setMilestones] = useState<{ days: string; bonus_points: string }[]>([]);
  const [activities, setActivities] = useState<VacationActivity[]>([]);
  const [queue, setQueue] = useState<VacationSubmission[]>([]);
  const [board, setBoard] = useState<VacationLeaderboardRow[]>([]);
  const [stats, setStats] = useState<VacationParticipationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [activityEditor, setActivityEditor] = useState<Partial<VacationActivity> | null>(null);
  const [rejectFor, setRejectFor] = useState<VacationSubmission | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [approveFor, setApproveFor] = useState<VacationSubmission | null>(null);
  const [approvePoints, setApprovePoints] = useState("");

  const campaign = campaigns.find((c) => c.id === campaignId) || null;

  const loadCampaigns = async () => {
    const rows = await fetchVacationCampaigns();
    setCampaigns(rows);
    if (!campaignId && rows[0]) setCampaignId(rows[0].id);
  };

  const loadDetails = async (id: string) => {
    const [ms, acts, q, lb, st] = await Promise.all([
      fetchMilestones(id),
      fetchActivities(id),
      fetchReviewQueue(id),
      fetchLeaderboard(id, 50),
      fetchParticipationStats(id).catch(() => null),
    ]);
    setMilestones(ms.map((m: VacationStreakMilestone) => ({ days: String(m.days), bonus_points: String(m.bonus_points) })));
    setActivities(acts);
    setQueue(q);
    setBoard(lb);
    setStats(st);
  };

  useEffect(() => {
    loadCampaigns().catch((error) => {
      toast({ title: "Could not load campaigns", description: vacationErrorMessage(error), variant: "destructive" });
    });
  }, []);

  useEffect(() => {
    if (!campaign) {
      setForm(emptyCampaign);
      return;
    }
    setForm({
      title: campaign.title,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      timezone: campaign.timezone,
      default_points: campaign.default_points,
      max_award_points: campaign.max_award_points,
      status: campaign.status,
      banner_enabled: campaign.banner_enabled,
      banner_text: campaign.banner_text || "",
      banner_link: campaign.banner_link || "",
    });
    loadDetails(campaign.id).catch((error) => {
      toast({ title: "Could not load campaign details", description: vacationErrorMessage(error), variant: "destructive" });
    });
  }, [campaignId, campaigns]);

  const filteredQueue = useMemo(() => {
    return queue.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (dayFilter !== "all") {
        const act = activities.find((a) => a.id === row.activity_id);
        if (act?.activity_date !== dayFilter) return false;
      }
      if (studentFilter && !(row.student_name || "").toLowerCase().includes(studentFilter.toLowerCase())) return false;
      return true;
    });
  }, [queue, statusFilter, dayFilter, studentFilter, activities]);

  const saveCampaign = async () => {
    try {
      const saved = await upsertVacationCampaign({
        ...(campaign || {}),
        title: form.title,
        start_date: form.start_date,
        end_date: form.end_date,
        timezone: form.timezone,
        default_points: Number(form.default_points),
        max_award_points: Number(form.max_award_points),
        status: form.status,
        banner_enabled: form.banner_enabled,
        banner_text: form.banner_text || null,
        banner_link: form.banner_link || null,
      });
      await replaceMilestones(
        saved.id,
        milestones
          .map((m) => ({ days: Number(m.days), bonus_points: Number(m.bonus_points) }))
          .filter((m) => m.days > 0 && m.bonus_points > 0)
      );
      toast({ title: "Campaign saved" });
      await loadCampaigns();
      setCampaignId(saved.id);
    } catch (error) {
      toast({ title: "Could not save campaign", description: vacationErrorMessage(error), variant: "destructive" });
    }
  };

  const saveActivity = async () => {
    if (!campaign || !activityEditor?.title) return;
    try {
      await upsertActivity({
        ...activityEditor,
        campaign_id: campaign.id,
        title: activityEditor.title,
        reward_points: activityEditor.reward_points === null || activityEditor.reward_points === undefined || Number.isNaN(Number(activityEditor.reward_points))
          ? null
          : Number(activityEditor.reward_points),
        instructions: activityEditor.instructions || "",
        activity_date: activityEditor.activity_date || null,
        opens_at: activityEditor.opens_at || null,
        closes_at: activityEditor.closes_at || null,
        is_active: Boolean(activityEditor.is_active),
      });
      toast({ title: "Activity saved" });
      setActivityEditor(null);
      await loadDetails(campaign.id);
    } catch (error) {
      toast({ title: "Could not save activity", description: vacationErrorMessage(error), variant: "destructive" });
    }
  };

  const prefillPosterCampaign = () => {
    const today = new Date();
    const startStr = today.toISOString().split("T")[0];
    const end = new Date(today);
    end.setDate(end.getDate() + 9);
    const endStr = end.toISOString().split("T")[0];
    setForm({
      title: "DLMS - New Games & Competitions",
      start_date: startStr,
      end_date: endStr,
      timezone: "Asia/Kolkata",
      default_points: 10,
      max_award_points: 100,
      status: "active",
      banner_enabled: true,
      banner_text: "DLMS New Games & Competitions: Play • Learn • Grow! 10 fun challenges for real-world skills.",
      banner_link: "",
    });
    setMilestones([
      { days: "3", bonus_points: "15" },
      { days: "5", bonus_points: "30" },
      { days: "7", bonus_points: "50" },
      { days: "10", bonus_points: "100" },
    ]);
    toast({ title: "Poster campaign prefilled!", description: "Click 'Save campaign' or 'Create campaign' to apply." });
  };

  const autoScheduleActivities = async () => {
    if (!campaign || !campaign.start_date) {
      toast({ title: "Campaign start date is required", variant: "destructive" });
      return;
    }
    try {
      const startDate = new Date(campaign.start_date);
      let currentActivities = activities;
      if (currentActivities.length === 0) {
        await seedPosterDrafts(campaign.id);
        currentActivities = await fetchActivities(campaign.id);
      }
      const sorted = [...currentActivities].sort((a, b) => a.sort_order - b.sort_order);
      for (let i = 0; i < sorted.length; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        await upsertActivity({
          ...sorted[i],
          campaign_id: campaign.id,
          activity_date: dateStr,
          is_active: true,
          reward_points: sorted[i].reward_points ?? campaign.default_points ?? 10,
        });
      }
      toast({ title: "10 Days Scheduled & Activated!", description: "All activities are dated and active." });
      await loadDetails(campaign.id);
    } catch (error) {
      toast({ title: "Could not auto-schedule", description: vacationErrorMessage(error), variant: "destructive" });
    }
  };

  const defaultApprovePoints = (row: VacationSubmission) => {
    const act = activities.find((a) => a.id === row.activity_id);
    return String(act?.reward_points ?? campaign?.default_points ?? 10);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><Sun className="h-5 w-5" /> Vacation Campaign</h2>
        {campaigns.length > 0 && (
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select campaign" /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title} ({c.status})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue={canConfigure ? "campaign" : "review"}>
        <TabsList className="flex flex-wrap h-auto">
          {canConfigure && <TabsTrigger value="campaign">Campaign</TabsTrigger>}
          {canConfigure && <TabsTrigger value="promotion">Promotion</TabsTrigger>}
          {canConfigure && <TabsTrigger value="activities">Activities</TabsTrigger>}
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="analytics">Leaderboard & Analytics</TabsTrigger>
        </TabsList>

        {canConfigure && (
          <TabsContent value="campaign" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Campaign settings</CardTitle>
                  <CardDescription>One active campaign at a time. Staff can review; only admins can edit settings.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={prefillPosterCampaign}
                  className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0 font-semibold"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Prefill 10-Day Poster Campaign
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-1"><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Timezone</Label><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as VacationCampaignStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">draft</SelectItem>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="paused">paused</SelectItem>
                      <SelectItem value="ended">ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Default points</Label><Input type="number" value={form.default_points} onChange={(e) => setForm({ ...form, default_points: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Max award points</Label><Input type="number" value={form.max_award_points} onChange={(e) => setForm({ ...form, max_award_points: Number(e.target.value) })} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Streak milestones</CardTitle>
                <CardDescription>No prefilled defaults. Add bonuses for consecutive approved days.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {milestones.map((row, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input placeholder="Days" type="number" value={row.days} onChange={(e) => {
                      const next = [...milestones]; next[idx] = { ...row, days: e.target.value }; setMilestones(next);
                    }} />
                    <Input placeholder="Bonus points" type="number" value={row.bonus_points} onChange={(e) => {
                      const next = [...milestones]; next[idx] = { ...row, bonus_points: e.target.value }; setMilestones(next);
                    }} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setMilestones([...milestones, { days: "", bonus_points: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add milestone
                </Button>
              </CardContent>
            </Card>
            <Button onClick={saveCampaign}>{campaign ? "Save campaign" : "Create campaign"}</Button>
          </TabsContent>
        )}

        {canConfigure && (
          <TabsContent value="promotion">
            <Card>
              <CardHeader><CardTitle>Site-wide banner</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><Switch checked={form.banner_enabled} onCheckedChange={(v) => setForm({ ...form, banner_enabled: v })} /><Label>Enabled</Label></div>
                <div className="space-y-1"><Label>Banner text</Label><Textarea value={form.banner_text} onChange={(e) => setForm({ ...form, banner_text: e.target.value })} /></div>
                <div className="space-y-1"><Label>Link</Label><Input value={form.banner_link} onChange={(e) => setForm({ ...form, banner_link: e.target.value })} placeholder="/" /></div>
                <div className="rounded-xl border p-3 text-sm bg-amber-500/10">
                  <p className="font-semibold">Live preview</p>
                  <p>{form.banner_text || form.title || "Banner text"}</p>
                </div>
                <Button onClick={saveCampaign}>Save promotion</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canConfigure && (
          <TabsContent value="activities" className="space-y-3">
            {!campaign && <p className="text-sm text-muted-foreground">Create a campaign first.</p>}
            <div className="flex flex-wrap items-center gap-2">
              {campaign && (
                <Button onClick={() => setActivityEditor({ title: "", instructions: "", is_active: false, sort_order: activities.length + 1 })}>
                  <Plus className="h-4 w-4 mr-1" /> New activity
                </Button>
              )}
              {campaign && activities.length === 0 && (
                <Button variant="outline" onClick={async () => {
                  try {
                    const n = await seedPosterDrafts(campaign.id);
                    toast({ title: n ? "Poster drafts added" : "Activities already exist" });
                    await loadDetails(campaign.id);
                  } catch (error) {
                    toast({ title: "Could not seed drafts", description: vacationErrorMessage(error), variant: "destructive" });
                  }
                }}>
                  <Sparkles className="h-4 w-4 mr-1 text-amber-500" />
                  Add poster draft ideas
                </Button>
              )}
              {campaign && activities.length > 0 && (
                <Button
                  variant="outline"
                  onClick={autoScheduleActivities}
                  className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-semibold"
                >
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Auto-schedule 10 Days
                </Button>
              )}
            </div>
            {activities.map((act) => (
              <Card key={act.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{act.title}</p>
                      <Badge variant={act.is_active ? "default" : "secondary"}>{act.is_active ? "active" : "draft"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{act.activity_date || "No date"} · {act.reward_points ?? "default points"}</p>
                    <p className="text-sm line-clamp-2 mt-1">{act.instructions || "No instructions yet"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActivityEditor(act)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try {
                        await deleteActivity(act.id);
                        await loadDetails(campaign.id);
                      } catch (error) {
                        toast({ title: "Could not delete", description: vacationErrorMessage(error), variant: "destructive" });
                      }
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        <TabsContent value="review" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="rejected">rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Day" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All days</SelectItem>
                {activities.filter((a) => a.activity_date).map((a) => (
                  <SelectItem key={a.id} value={a.activity_date!}>{a.activity_date} · {a.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input className="w-48" placeholder="Student name" value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} />
          </div>
          {!filteredQueue.length ? (
            <p className="text-sm text-muted-foreground">No submissions match these filters.</p>
          ) : filteredQueue.map((row) => {
            const act = activities.find((a) => a.id === row.activity_id);
            return (
              <Card key={row.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{row.student_name}</p>
                      <p className="text-xs text-muted-foreground">{act?.title} · {act?.activity_date} · attempt {row.attempts}</p>
                    </div>
                    <Badge variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>{row.status}</Badge>
                  </div>
                  {row.content && <p className="text-sm whitespace-pre-wrap">{row.content}</p>}
                  {row.link && <a className="text-sm text-primary underline" href={row.link} target="_blank" rel="noreferrer">{row.link}</a>}
                  {row.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { setApproveFor(row); setApprovePoints(defaultApprovePoints(row)); }}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => { setRejectFor(row); setRejectNote(""); }}>Reject</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats?.participating_students || 0}</p><p className="text-sm text-muted-foreground">Participating students</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats?.total_submissions || 0}</p><p className="text-sm text-muted-foreground">Submissions</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats?.points_awarded || 0}</p><p className="text-sm text-muted-foreground">Points awarded</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Participation by day</CardTitle>
              {campaign && (
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const rows = await fetchExportRows(campaign.id);
                    const blob = new Blob([vacationRowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "vacation-campaign.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    toast({ title: "Export failed", description: vacationErrorMessage(error), variant: "destructive" });
                  }
                }}><Download className="h-4 w-4 mr-1" /> CSV export</Button>
              )}
            </CardHeader>
            <CardContent>
              {!stats?.by_activity?.length ? (
                <p className="text-sm text-muted-foreground">No activity stats yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Rejected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.by_activity.map((row) => (
                      <TableRow key={row.activity_id}>
                        <TableCell>{row.date || "draft"}</TableCell>
                        <TableCell>{row.title}</TableCell>
                        <TableCell>{row.pending}</TableCell>
                        <TableCell>{row.approved}</TableCell>
                        <TableCell>{row.rejected}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Name</TableHead><TableHead>Points</TableHead></TableRow></TableHeader>
                <TableBody>
                  {board.map((row) => (
                    <TableRow key={row.student_id}><TableCell>{row.rank}</TableCell><TableCell>{row.display_name}</TableCell><TableCell>{row.total_points}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!activityEditor} onOpenChange={(o) => !o && setActivityEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{activityEditor?.id ? "Edit activity" : "New activity"}</DialogTitle></DialogHeader>
          {activityEditor && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Title</Label>
                  <Select onValueChange={(val) => {
                    const template = POSTER_ACTIVITIES.find((p) => p.title === val);
                    if (template) {
                      setActivityEditor({
                        ...activityEditor,
                        title: template.title,
                        instructions: template.instructions,
                        sort_order: template.order,
                      });
                    }
                  }}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue placeholder="Load poster template..." /></SelectTrigger>
                    <SelectContent>
                      {POSTER_ACTIVITIES.map((p) => (
                        <SelectItem key={p.order} value={p.title}>{p.order}. {p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input value={activityEditor.title || ""} onChange={(e) => setActivityEditor({ ...activityEditor, title: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" min={campaign?.start_date} max={campaign?.end_date} value={activityEditor.activity_date || ""} onChange={(e) => setActivityEditor({ ...activityEditor, activity_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Instructions</Label><Textarea value={activityEditor.instructions || ""} onChange={(e) => setActivityEditor({ ...activityEditor, instructions: e.target.value })} /></div>
              <div className="space-y-1"><Label>Reward points (blank = campaign default)</Label><Input type="number" value={activityEditor.reward_points ?? ""} onChange={(e) => setActivityEditor({ ...activityEditor, reward_points: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Opens at (optional)</Label><Input type="datetime-local" value={activityEditor.opens_at?.slice(0, 16) || ""} onChange={(e) => setActivityEditor({ ...activityEditor, opens_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                <div className="space-y-1"><Label>Closes at (optional)</Label><Input type="datetime-local" value={activityEditor.closes_at?.slice(0, 16) || ""} onChange={(e) => setActivityEditor({ ...activityEditor, closes_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={Boolean(activityEditor.is_active)} onCheckedChange={(v) => setActivityEditor({ ...activityEditor, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveActivity}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveFor} onOpenChange={(o) => !o && setApproveFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve submission</DialogTitle></DialogHeader>
          <div className="space-y-1"><Label>Points (max {campaign?.max_award_points})</Label><Input type="number" value={approvePoints} onChange={(e) => setApprovePoints(e.target.value)} /></div>
          <DialogFooter>
            <Button onClick={async () => {
              if (!approveFor || !campaign) return;
              try {
                await reviewSubmission(approveFor.id, "approve", Number(approvePoints));
                toast({ title: "Approved" });
                setApproveFor(null);
                await loadDetails(campaign.id);
              } catch (error) {
                toast({ title: "Review failed", description: vacationErrorMessage(error), variant: "destructive" });
              }
            }}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject submission</DialogTitle></DialogHeader>
          <div className="space-y-1"><Label>Reason (required)</Label><Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="destructive" onClick={async () => {
              if (!rejectFor || !campaign) return;
              try {
                await reviewSubmission(rejectFor.id, "reject", undefined, rejectNote);
                toast({ title: "Rejected" });
                setRejectFor(null);
                await loadDetails(campaign.id);
              } catch (error) {
                toast({ title: "Review failed", description: vacationErrorMessage(error), variant: "destructive" });
              }
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
