import { useEffect, useMemo, useState } from "react";
import { Flame, Sun, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fetchLeaderboard, fetchStudentOverview, submitVacationActivity } from "./api";
import { vacationErrorMessage } from "./errors";
import type { VacationLeaderboardRow, VacationStudentOverview } from "./types";

export default function VacationStudentPage() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<VacationStudentOverview | null>(null);
  const [board, setBoard] = useState<VacationLeaderboardRow[]>([]);
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await fetchStudentOverview();
      setOverview(data);
      if (data.campaign?.id) {
        setBoard(await fetchLeaderboard(data.campaign.id, 25));
      } else {
        setBoard([]);
      }
    } catch (error) {
      toast({ title: "Could not load vacation campaign", description: vacationErrorMessage(error), variant: "destructive" });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const campaign = overview?.campaign;
  const activity = overview?.activity;
  const submission = overview?.submission;
  const canResubmit = submission?.status === "rejected" && activity?.window_open !== false;
  const canSubmit = campaign?.status === "active" && activity && (!submission || canResubmit) && activity.window_open !== false;

  const statusCopy = useMemo(() => {
    if (!campaign) return "There is no active vacation campaign right now.";
    if (campaign.status === "paused") return "This campaign is paused. Check back soon.";
    if (campaign.status === "ended") return "This campaign has ended.";
    if (!activity) return "No activity is scheduled for today yet.";
    if (activity.window_open === false) return "Today's submission window is closed.";
    return null;
  }, [campaign, activity]);

  const handleSubmit = async () => {
    if (!activity) return;
    setSaving(true);
    try {
      await submitVacationActivity(activity.id, content, link);
      toast({ title: "Submitted", description: "Staff will review your activity." });
      setContent("");
      setLink("");
      await load();
    } catch (error) {
      toast({ title: "Could not submit", description: vacationErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            {campaign?.title || "Vacation Campaign"}
          </CardTitle>
          <CardDescription>
            {campaign ? `${campaign.start_date} to ${campaign.end_date}` : "Play, learn, and grow over the break."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusCopy && <p className="text-sm text-muted-foreground">{statusCopy}</p>}
          {campaign?.status === "active" && activity && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold">{activity.title}</h3>
                <Badge>+{activity.reward_points} pts</Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap">{activity.instructions}</p>
              {submission && (
                <div className="rounded-xl border p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status:</span>
                    <Badge variant={submission.status === "approved" ? "default" : submission.status === "rejected" ? "destructive" : "secondary"}>
                      {submission.status}
                    </Badge>
                    {submission.status === "approved" && <span>+{submission.points_awarded} points</span>}
                  </div>
                  {submission.status === "rejected" && submission.review_note && (
                    <p className="text-muted-foreground">Staff note: {submission.review_note}</p>
                  )}
                </div>
              )}
              {canSubmit && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Your work</Label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write what you did today" />
                  </div>
                  <div className="space-y-1">
                    <Label>Link (optional)</Label>
                    <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
                  </div>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {submission?.status === "rejected" ? "Resubmit" : "Submit"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Flame className="h-4 w-4 text-orange-500" /> Your streak</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-2xl font-bold">{overview?.progress?.current_streak || 0}</p><p className="text-muted-foreground">Current</p></div>
            <div><p className="text-2xl font-bold">{overview?.progress?.longest_streak || 0}</p><p className="text-muted-foreground">Longest</p></div>
            <div><p className="text-2xl font-bold">{overview?.progress?.total_points || 0}</p><p className="text-muted-foreground">Points</p></div>
            <div><p className="text-2xl font-bold">{overview?.progress?.approved_count || 0}</p><p className="text-muted-foreground">Approved</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            {!overview?.history?.length ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {overview.history.map((row) => (
                  <div key={row.activity_id} className="flex items-center justify-between gap-2 text-sm border rounded-lg p-2">
                    <div>
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.date}</p>
                      {row.status === "rejected" && row.review_note && (
                        <p className="text-xs text-muted-foreground">{row.review_note}</p>
                      )}
                    </div>
                    <Badge variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>
                      {row.status}{row.points_awarded != null ? ` · ${row.points_awarded}` : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-amber-500" /> Standings</CardTitle>
          <CardDescription>Names and points only. Your rank is always included.</CardDescription>
        </CardHeader>
        <CardContent>
          {!board.length ? (
            <p className="text-sm text-muted-foreground">Standings appear after the first approved submissions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.map((row) => (
                  <TableRow key={row.student_id} className={row.is_me ? "bg-primary/5" : undefined}>
                    <TableCell>{row.rank}</TableCell>
                    <TableCell>{row.display_name}{row.is_me ? " (you)" : ""}</TableCell>
                    <TableCell>{row.total_points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
