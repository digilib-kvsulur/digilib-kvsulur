import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Flame, HelpCircle, Link as LinkIcon, Radio, Sparkles, Sun, Trophy, Zap } from "lucide-react";
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
import { POSTER_ACTIVITIES, inferActivitySubmissionType, parseActivityMeta } from "./constants";
import VacationCountdownTimer from "./VacationCountdownTimer";
import VacationEventPreviewCards from "./VacationEventPreviewCards";
import { UpcomingQuizLeagueCard } from "@/components/quiz/UpcomingQuizLeagueCard";
import type { VacationLeaderboardRow, VacationStudentOverview, VacationSubmissionType } from "./types";

interface VacationStudentPageProps {
  userId?: string;
  userClass?: string;
  onJoinQuizLeague?: (session: any) => void;
  onNavigateToQuizzes?: () => void;
}

export default function VacationStudentPage({
  userId,
  userClass,
  onJoinQuizLeague,
  onNavigateToQuizzes,
}: VacationStudentPageProps = {}) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<VacationStudentOverview | null>(null);
  const [board, setBoard] = useState<VacationLeaderboardRow[]>([]);
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const submissionRef = useRef<HTMLDivElement>(null);

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

  const { submissionType, cleanInstructions } = useMemo(() => {
    if (!activity) return { submissionType: "mixed" as VacationSubmissionType, cleanInstructions: "" };
    const meta = parseActivityMeta(activity.instructions);
    if (meta.submissionType !== "mixed") {
      return meta;
    }
    const inferred = inferActivitySubmissionType(activity.title, activity.instructions);
    return { ...meta, submissionType: inferred };
  }, [activity]);

  const completedTitles = useMemo(() => {
    return new Set(
      (overview?.history || [])
        .filter((h) => h.status === "approved")
        .map((h) => h.title.toLowerCase())
    );
  }, [overview]);

  const activePosterTemplate = useMemo(() => {
    if (!activity) return null;
    return (
      POSTER_ACTIVITIES.find(
        (p) =>
          activity.title.toLowerCase().includes(p.title.toLowerCase()) ||
          p.title.toLowerCase().includes(activity.title.toLowerCase())
      ) || null
    );
  }, [activity]);

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
      {/* Poster-styled Hero Header */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-primary/10 overflow-hidden shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Play • Learn • Grow
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> 10 Days • 10 Challenges
            </span>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2 mt-1">
            <Sun className="h-6 w-6 text-amber-500" />
            {campaign?.title || "DLMS – New Games & Competitions"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-foreground/80 font-medium">
            Fun activities that build skills, spark creativity and give real-world knowledge! More than just games... It&apos;s a learning experience!
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-semibold text-muted-foreground">
            <span className="bg-background/80 px-2 py-0.5 rounded-md border">Different Games</span>
            <span>✦</span>
            <span className="bg-background/80 px-2 py-0.5 rounded-md border">Real Skills</span>
            <span>✦</span>
            <span className="bg-background/80 px-2 py-0.5 rounded-md border">A Smarter You</span>
          </div>
        </CardHeader>
      </Card>

      {/* Today's Challenge Section */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sun className="h-5 w-5 text-amber-500" />
                Today&apos;s Challenge
              </CardTitle>
              <CardDescription>
                {campaign ? `${campaign.start_date} to ${campaign.end_date}` : "Play, learn, and grow over the break."}
              </CardDescription>
            </div>
            {activity && (
              <Badge className="bg-amber-600 text-white font-bold text-xs px-3 py-1">
                +{activity.reward_points} Points
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusCopy && <p className="text-sm text-muted-foreground">{statusCopy}</p>}
          {campaign?.status === "active" && activity && (
            <div className="space-y-4">
              {/* Live Deadline Countdown Timer — only when an explicit close time is set */}
              {activity.closes_at ? (
                <VacationCountdownTimer
                  targetTime={activity.closes_at}
                  label="Today's Challenge Deadline"
                />
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Submission Window Open
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black text-foreground">{activity.title}</h3>
                  {activePosterTemplate?.tagline && (
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                      {activePosterTemplate.tagline}
                    </span>
                  )}
                </div>
                {activePosterTemplate?.subtitle && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {activePosterTemplate.subtitle}
                  </p>
                )}
              </div>

              {activePosterTemplate?.learningOutcomes && activePosterTemplate.learningOutcomes.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What you learn:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activePosterTemplate.learningOutcomes.map((skill, idx) => (
                      <span key={idx} className="text-xs font-medium bg-background px-2 py-0.5 rounded-full border border-border/80">
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border p-4 bg-card/60 text-sm whitespace-pre-wrap leading-relaxed">
                {cleanInstructions || activity.instructions}
              </div>

              {submission && (
                <div className="rounded-xl border p-3.5 text-sm space-y-1.5 bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Your Submission:</span>
                    <Badge variant={submission.status === "approved" ? "default" : submission.status === "rejected" ? "destructive" : "secondary"}>
                      {submission.status}
                    </Badge>
                    {submission.status === "approved" && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{submission.points_awarded} points awarded!
                      </span>
                    )}
                  </div>
                  {submission.status === "rejected" && submission.review_note && (
                    <p className="text-destructive font-medium text-xs">
                      Teacher note: {submission.review_note}
                    </p>
                  )}
                </div>
              )}

              {canSubmit && (
                <div ref={submissionRef} className="space-y-3 pt-2 rounded-2xl border border-amber-500/30 p-4 bg-amber-500/5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-black text-foreground">
                        {submissionType === "quiz"
                          ? "Record Quiz Championship Entry"
                          : submissionType === "project_link"
                          ? "Submit Project Link"
                          : submissionType === "media_upload"
                          ? "Submit Photo / Video Proof"
                          : submissionType === "text_response"
                          ? "Submit Written Solution"
                          : "Submit Your Entry"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-bold bg-background text-amber-700 dark:text-amber-300 border-amber-500/30">
                      Format: {submissionType.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Dedicated Quiz Championship quick CTA if event is a quiz */}
                  {submissionType === "quiz" && (
                    <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-200">
                            Daily Live Quiz Championship
                          </span>
                        </div>
                        <Badge className="bg-amber-600 text-white text-[10px]">Live on DLMS</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Participate in today&apos;s scheduled quiz championship or complete the designated quiz on the Quizzes tab!
                      </p>
                      {onNavigateToQuizzes && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={onNavigateToQuizzes}
                          className="font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 h-8"
                        >
                          <Trophy className="h-3.5 w-3.5" />
                          Go to Quizzes Tab →
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Tailored Input Fields */}
                  <div className="space-y-1">
                    <Label className="font-bold">
                      {submissionType === "quiz"
                        ? "Quiz Score & Reflection"
                        : submissionType === "project_link"
                        ? "Project Summary / Description (optional)"
                        : submissionType === "media_upload"
                        ? "Description of Model / Prototype / Innovation"
                        : submissionType === "text_response"
                        ? "Your Answers / Solution / Review"
                        : "Your work / Summary"}
                    </Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        submissionType === "quiz"
                          ? "Enter your score (e.g. 10/10) and 2 key learnings or takeaways..."
                          : submissionType === "project_link"
                          ? "Brief description of what you researched or built..."
                          : submissionType === "media_upload"
                          ? "Describe the materials used, how it works, and what you created..."
                          : submissionType === "text_response"
                          ? "Write down your step-by-step solution, decoded cipher, or book review here..."
                          : "Write a short summary of what you did, created, or learned..."
                      }
                      rows={submissionType === "text_response" ? 6 : 4}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="font-bold flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {submissionType === "project_link"
                        ? "Project / Google Drive / Slides Link (required)"
                        : submissionType === "media_upload"
                        ? "Photo, Video, or Drive Proof Link (required)"
                        : "Link (optional, e.g. Drive, GitHub, Video)"}
                    </Label>
                    <Input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://drive.google.com/... or https://..."
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Tip: If sharing a Google Drive link, ensure &quot;Anyone with the link can view&quot; is enabled.
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="w-full sm:w-auto font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {submission?.status === "rejected" ? "Resubmit Activity" : "Submit Activity for Review"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Live Quiz Championship Integration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Vacation Live Quiz Championship
          </h3>
          <Badge variant="outline" className="text-xs font-bold text-amber-600 border-amber-500/40">
            New Quiz Everyday 🔥
          </Badge>
        </div>
        <UpcomingQuizLeagueCard
          userId={userId}
          userClass={userClass}
          onJoinLeague={(session) => {
            if (onJoinQuizLeague) onJoinQuizLeague(session);
            else if (onNavigateToQuizzes) onNavigateToQuizzes();
          }}
        />
      </div>

      {/* Interactive 10-Events Showcase & Preview Cards */}
      <VacationEventPreviewCards
        currentActivityTitle={activity?.title}
        completedTitles={completedTitles}
        onSelectToday={() => submissionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
      />

      {/* Streak Multiplier & Motivator Banner */}
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-yellow-500/10 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-orange-700 dark:text-orange-300">
              Daily Streak Multiplier
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              You have a <strong className="text-foreground">{overview?.progress?.current_streak || 0}-day streak</strong>! Complete today to unlock milestone bonus points at 3, 5, 7, and 10 days.
            </p>
          </div>
        </div>
      </div>

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
