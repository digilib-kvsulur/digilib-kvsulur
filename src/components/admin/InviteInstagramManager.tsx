import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Instagram, Link2, Loader2, RefreshCw, Search, Share2, Users, Award, Ban } from "lucide-react";

type Story = { id: string; user_id: string; screenshot_url: string; claimed_date: string; points_awarded: number; points_revoked?: number; status: string; created_at: string; student?: any };
type Invite = { id: string; inviter_id: string; invited_user_id: string; points_awarded: number; points_revoked?: number; status?: string; created_at: string; inviter?: any; invited?: any };

const fullName = (profile: any) => [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Student";

export default function InviteInstagramManager() {
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [reviewing, setReviewing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [storyResult, inviteResult] = await Promise.all([
        (supabase as any).from("instagram_story_submissions").select("id,user_id,screenshot_url,claimed_date,points_awarded,points_revoked,status,created_at,profiles!instagram_story_submissions_user_id_fkey(first_name,last_name,admission_number,student_class)").order("created_at", { ascending: false }).limit(500),
        (supabase as any).from("student_invites").select("id,inviter_id,invited_user_id,points_awarded,points_revoked,status,created_at,inviter:profiles!student_invites_inviter_id_fkey(first_name,last_name,admission_number),invited:profiles!student_invites_invited_user_id_fkey(first_name,last_name,admission_number)").order("created_at", { ascending: false }).limit(1000),
      ]);
      if (storyResult.error) throw storyResult.error;
      if (inviteResult.error) throw inviteResult.error;
      setStories((storyResult.data || []).map((row: any) => ({ ...row, student: row.profiles })));
      setInvites(inviteResult.data || []);
    } catch (error: any) {
      toast({ title: "Could not load campaign data", description: error?.message || "Check the database permissions and try again.", variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void loadData(); }, [loadData]);

  const revokeReward = async (kind: "story" | "invite", id: string) => {
    const label = kind === "story" ? "Instagram Story claim" : "invite reward";
    if (!window.confirm(`Mark this ${label} as fake and revoke the awarded XP? This cannot be undone.`)) return;
    setReviewing(`${kind}:${id}`);
    try {
      const { data, error } = await (supabase as any).rpc(kind === "story" ? "admin_revoke_story_reward" : "admin_revoke_invite_reward", { p_submission: id });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.reason === "already_reviewed" ? "This reward has already been reviewed." : "The reward could not be revoked.");
      toast({ title: "Reward revoked", description: `${Number(data.points_revoked || 0).toLocaleString()} XP removed.` });
      await loadData();
    } catch (error: any) {
      toast({ title: "Review failed", description: error?.message || "Please refresh and try again.", variant: "destructive" });
    } finally { setReviewing(null); }
  };

  const leaderboard = useMemo(() => {
    const grouped = new Map<string, { id: string; profile: any; count: number; points: number; latest: string }>();
    invites.forEach((invite) => {
      const current = grouped.get(invite.inviter_id) || { id: invite.inviter_id, profile: invite.inviter, count: 0, points: 0, latest: invite.created_at };
      current.count += 1;
      current.points += Number(invite.points_awarded) || 0;
      if (invite.created_at > current.latest) current.latest = invite.created_at;
      grouped.set(invite.inviter_id, current);
    });
    return [...grouped.values()].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest));
  }, [invites]);

  const filteredStories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return stories;
    return stories.filter((story) => [fullName(story.student), story.student?.admission_number, story.claimed_date].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [stories, search]);
  const filteredInvites = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return invites;
    return invites.filter((invite) => [fullName(invite.inviter), invite.inviter?.admission_number, fullName(invite.invited), invite.invited?.admission_number].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [invites, search]);
  const today = new Date().toISOString().slice(0, 10);
  const todayStories = stories.filter((story) => story.claimed_date === today).length;
  const totalStoryPoints = stories.reduce((sum, story) => sum + (Number(story.points_awarded) || 0), 0);
  const invitePoints = invites.reduce((sum, invite) => sum + (Number(invite.points_awarded) || 0), 0);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold">Instagram &amp; Invite Friends</h2><p className="text-sm text-muted-foreground">Track student referrals and review Instagram Story reward proof.</p></div>
      <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Users} label="Friends invited" value={invites.length} detail="Successful student sign-ups" />
      <Metric icon={Award} label="Invite XP awarded" value={invitePoints.toLocaleString()} detail="Across all tracked referrals" />
      <Metric icon={Instagram} label="Stories today" value={todayStories} detail={`${stories.length} total story claims`} />
      <Metric icon={Share2} label="Instagram XP awarded" value={totalStoryPoints.toLocaleString()} detail="Automatically credited on submission" />
    </div>

    <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setSearch(""); }} className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="invites">Invites ({invites.length})</TabsTrigger><TabsTrigger value="instagram">Instagram proofs ({stories.length})</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-primary" />Invite leaderboard</CardTitle><CardDescription>Students with the most successful referrals.</CardDescription></CardHeader><CardContent>
            {loading && !leaderboard.length ? <Loading /> : leaderboard.length ? <div className="space-y-3">{leaderboard.slice(0, 5).map((row, index) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><div className="min-w-0"><p className="truncate font-medium">{fullName(row.profile)}</p><p className="text-xs text-muted-foreground">{row.profile?.admission_number || "No admission number"}</p></div></div><Badge variant="secondary">{row.count} friend{row.count === 1 ? "" : "s"}</Badge></div>)}</div> : <Empty text="No successful invites have been recorded yet." />}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Instagram className="h-4 w-4 text-pink-500" />Latest Instagram Stories</CardTitle><CardDescription>Recent reward claims and screenshot evidence.</CardDescription></CardHeader><CardContent>
            {loading && !stories.length ? <Loading /> : stories.length ? <div className="space-y-3">{stories.slice(0, 5).map((story) => <div key={story.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate font-medium">{fullName(story.student)}</p><p className="text-xs text-muted-foreground">{new Date(`${story.claimed_date}T00:00:00`).toLocaleDateString()} · +{story.points_awarded} XP</p></div><a href={story.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline">Proof <ExternalLink className="h-3.5 w-3.5" /></a></div>)}</div> : <Empty text="No Instagram story claims have been submitted." />}
          </CardContent></Card>
        </div>
      </TabsContent>
      <TabsContent value="invites" className="space-y-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search inviter or friend by name or admission number" />
          <Card><CardHeader><CardTitle className="text-base">Successful invites</CardTitle><CardDescription>Review an invite and revoke both students’ XP if the referral is fake.</CardDescription></CardHeader><CardContent className="p-0 sm:p-6">{loading && !invites.length ? <Loading /> : filteredInvites.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Invited by</TableHead><TableHead>New student</TableHead><TableHead>Date</TableHead><TableHead>XP</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader><TableBody>{filteredInvites.map((invite) => <TableRow key={invite.id}><TableCell><p className="font-medium">{fullName(invite.inviter)}</p><p className="text-xs text-muted-foreground">{invite.inviter?.admission_number}</p></TableCell><TableCell><p className="font-medium">{fullName(invite.invited)}</p><p className="text-xs text-muted-foreground">{invite.invited?.admission_number}</p></TableCell><TableCell className="whitespace-nowrap">{new Date(invite.created_at).toLocaleDateString()}</TableCell><TableCell>{invite.status === "revoked" ? <Badge variant="destructive">Revoked · {invite.points_revoked || 0} XP</Badge> : <Badge variant="secondary">{invite.points_awarded} XP</Badge>}</TableCell><TableCell className="text-right">{invite.status === "revoked" ? <span className="text-xs text-muted-foreground">Reviewed</span> : <Button size="sm" variant="destructive" onClick={() => void revokeReward("invite", invite.id)} disabled={!!reviewing}><Ban className="mr-1.5 h-3.5 w-3.5" />{reviewing === `invite:${invite.id}` ? "Reviewing…" : "Fake · revoke XP"}</Button>}</TableCell></TableRow>)}</TableBody></Table></div> : <Empty text="No invite records match your search." />}</CardContent></Card>
      </TabsContent>
      <TabsContent value="instagram" className="space-y-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search student by name, admission number, or date" />
        <Card><CardHeader><CardTitle className="text-base">Instagram Story reward claims</CardTitle><CardDescription>Open the screenshot, then mark fake submissions to revoke their XP.</CardDescription></CardHeader><CardContent className="p-0 sm:p-6">{loading && !stories.length ? <Loading /> : filteredStories.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Claim date</TableHead><TableHead>Submitted</TableHead><TableHead>XP</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader><TableBody>{filteredStories.map((story) => <TableRow key={story.id}><TableCell><p className="font-medium">{fullName(story.student)}</p><p className="text-xs text-muted-foreground">{story.student?.admission_number}{story.student?.student_class ? ` · ${story.student.student_class}` : ""}</p></TableCell><TableCell className="whitespace-nowrap">{new Date(`${story.claimed_date}T00:00:00`).toLocaleDateString()}</TableCell><TableCell className="whitespace-nowrap">{new Date(story.created_at).toLocaleString()}</TableCell><TableCell>{story.status === "rejected" ? <Badge variant="destructive">Revoked · {story.points_revoked || 0} XP</Badge> : <Badge variant="secondary">+{story.points_awarded} XP</Badge>}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2">{story.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => void revokeReward("story", story.id)} disabled={!!reviewing}><Ban className="mr-1.5 h-3.5 w-3.5" />{reviewing === `story:${story.id}` ? "Reviewing…" : "Fake · revoke XP"}</Button>}<Button asChild size="sm" variant="outline"><a href={story.screenshot_url} target="_blank" rel="noreferrer">View <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button></div></TableCell></TableRow>)}</TableBody></Table></div> : <Empty text="No Instagram proof submissions match your search." />}</CardContent></Card>
      </TabsContent>
    </Tabs>
  </div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: any; label: string; value: number | string; detail: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>;
}
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
function Loading() { return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>; }
function Empty({ text }: { text: string }) { return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>; }
