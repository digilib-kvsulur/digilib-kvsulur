import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Flame,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Target,
  Trophy,
  UploadCloud,
  Users,
  Zap,
  Gamepad2,
  Layers,
  Camera,
  FileText,
  Award,
  Clock,
  Compass,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivities, fetchLeaderboard, fetchStudentOverview, submitVacationActivity } from "./api";
import { vacationErrorMessage } from "./errors";
import {
  AUTUMN_BREAK_SCHEDULE,
  POSTER_ACTIVITIES,
  TEN_DAYS_PROGRAM,
  inferActivitySubmissionType,
  parseActivityMeta,
  pointsToXp,
} from "./constants";
import VacationCountdownTimer from "./VacationCountdownTimer";
import VacationGameArenaModal from "./games/VacationGameArenaModal";
import { UpcomingQuizLeagueCard } from "@/components/quiz/UpcomingQuizLeagueCard";
import type {
  VacationActivity,
  VacationLeaderboardRow,
  VacationStudentOverview,
  VacationSubmission,
  VacationSubmissionType,
} from "./types";

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
  const [campaignActivities, setCampaignActivities] = useState<VacationActivity[]>([]);
  const [board, setBoard] = useState<VacationLeaderboardRow[]>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"arena" | "quiz" | "standings" | "history">("arena");

  // Game Modal State
  const [gameModalOpen, setGameModalOpen] = useState(false);

  // Manual Submission Dialog State
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [content, setContent] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [regModalOpen, setRegModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local game completion tracking cache
  const [localCompletedDays, setLocalCompletedDays] = useState<Record<number, boolean>>({});

  const load = async () => {
    try {
      const data = await fetchStudentOverview();
      setOverview(data);

      if (data.campaign?.id) {
        const [lb, acts] = await Promise.all([
          fetchLeaderboard(data.campaign.id, 25),
          fetchActivities(data.campaign.id),
        ]);
        setBoard(lb);
        setCampaignActivities(acts);

        // Determine current day number based on campaign start_date and today
        const todayStr = data.today || new Date().toISOString().split("T")[0];
        const startStr = data.campaign.start_date;
        if (startStr) {
          const startMs = new Date(startStr).getTime();
          const todayMs = new Date(todayStr).getTime();
          const diffDays = Math.floor((todayMs - startMs) / (1000 * 3600 * 24)) + 1;
          const clampedDay = Math.min(10, Math.max(1, diffDays));
          setSelectedDayNumber(clampedDay);
        }
      } else {
        setBoard([]);
        setCampaignActivities([]);
      }
    } catch (error) {
      toast({
        title: "Could not load vacation campaign",
        description: vacationErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    load();
    // Load local completed cache
    try {
      const cache = localStorage.getItem("dlms_vacation_local_completed");
      if (cache) setLocalCompletedDays(JSON.parse(cache));
    } catch {}
  }, []);

  const campaign = overview?.campaign;

  const todayStr = useMemo(() => {
    if (overview?.today) return overview.today;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, [overview]);

  const isUpcoming = useMemo(() => {
    if (overview?.is_upcoming != null) return overview.is_upcoming;
    return Boolean(campaign?.start_date && campaign.start_date > todayStr);
  }, [overview, campaign, todayStr]);

  const startsInDays = useMemo(() => {
    if (overview?.starts_in_days != null) return overview.starts_in_days;
    if (!campaign?.start_date) return 0;
    const startMs = new Date(campaign.start_date).getTime();
    const nowMs = new Date().getTime();
    return Math.max(0, Math.ceil((startMs - nowMs) / (1000 * 60 * 60 * 24)));
  }, [overview, campaign]);

  // Map 10-day program schedule
  const tenDaysRoadmap = useMemo(() => {
    const startDate = campaign?.start_date ? new Date(campaign.start_date) : null;
    const approvedActivityIds = new Set((overview?.history || []).filter((h) => h.status === "approved").map((h) => h.activity_id));
    const submittedActivityIds = new Set((overview?.history || []).map((h) => h.activity_id));

    return TEN_DAYS_PROGRAM.map((p) => {
      let dateStr = "";
      let isToday = false;
      if (startDate) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + p.dateOffset);
        dateStr = d.toISOString().split("T")[0];
        isToday = dateStr === todayStr;
      }

      // Match activity from DB if present
      const dayActs = campaignActivities.filter((a) => a.activity_date === dateStr || a.sort_order === p.day * 2 - 1 || a.sort_order === p.day * 2);
      const mainAct =
        dayActs.find((a) => !a.title.toLowerCase().includes("quiz") && !a.title.toLowerCase().includes("championship")) ||
        campaignActivities.find((a) => a.title.toLowerCase().includes(p.event.title.toLowerCase())) ||
        null;

      const quizAct =
        dayActs.find((a) => a.title.toLowerCase().includes("quiz") || a.title.toLowerCase().includes("championship")) ||
        campaignActivities.find((a) => a.title.toLowerCase().includes(`day ${p.day}`) && a.title.toLowerCase().includes("quiz")) ||
        null;

      const isMainApproved = Boolean(mainAct && approvedActivityIds.has(mainAct.id)) || Boolean(localCompletedDays[p.day]);
      const isMainSubmitted = Boolean(mainAct && submittedActivityIds.has(mainAct.id)) || Boolean(localCompletedDays[p.day]);
      const isQuizApproved = Boolean(quizAct && approvedActivityIds.has(quizAct.id));
      const isQuizSubmitted = Boolean(quizAct && submittedActivityIds.has(quizAct.id));

      return {
        ...p,
        dateStr,
        mainActivity: mainAct,
        quizActivity: quizAct,
        isMainApproved,
        isMainSubmitted,
        isQuizApproved,
        isQuizSubmitted,
        isToday,
      };
    });
  }, [campaign, campaignActivities, overview, todayStr, localCompletedDays]);

  const selectedDayData = useMemo(() => {
    return tenDaysRoadmap.find((d) => d.day === selectedDayNumber) || tenDaysRoadmap[0];
  }, [tenDaysRoadmap, selectedDayNumber]);

  // Active competition item (from DB or synthesized from constants so it NEVER fails)
  const activeCompetition = useMemo(() => {
    if (selectedDayData.mainActivity) return selectedDayData.mainActivity;
    // synthesize activity fallback from constants so page is ALWAYS fully interactive!
    return {
      id: `virtual-day-${selectedDayData.day}`,
      campaign_id: campaign?.id || "active",
      title: selectedDayData.event.title,
      instructions: selectedDayData.event.instructions,
      reward_points: 100,
      activity_date: selectedDayData.dateStr || todayStr,
      opens_at: null,
      closes_at: null,
      is_active: true,
      sort_order: selectedDayData.day * 2 - 1,
      created_at: new Date().toISOString(),
    } as VacationActivity;
  }, [selectedDayData, campaign, todayStr]);

  // Submission for current activity
  const currentSubmission = useMemo<VacationSubmission | null>(() => {
    if (!activeCompetition) return null;
    const hist = overview?.history?.find(
      (h) => h.activity_id === activeCompetition.id || h.title.toLowerCase().includes(selectedDayData.event.title.toLowerCase())
    );
    if (hist) {
      return {
        id: hist.activity_id,
        campaign_id: campaign?.id || "",
        activity_id: activeCompetition.id,
        student_id: userId || "",
        status: hist.status,
        points_awarded: hist.points_awarded,
        review_note: hist.review_note,
        content: null,
        link: null,
        submitted_at: "",
        reviewed_at: null,
        reviewed_by: null,
        attempts: 1,
      };
    }
    if (localCompletedDays[selectedDayData.day]) {
      return {
        id: `local-${selectedDayData.day}`,
        campaign_id: campaign?.id || "",
        activity_id: activeCompetition.id,
        student_id: userId || "",
        status: "approved",
        points_awarded: 100,
        review_note: "Completed via Interactive Vacation Lab!",
        content: "Completed via Interactive Simulator",
        link: null,
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: "system",
        attempts: 1,
      };
    }
    return null;
  }, [activeCompetition, overview, campaign, userId, selectedDayData, localCompletedDays]);

  const isCompleted = currentSubmission?.status === "approved" || Boolean(localCompletedDays[selectedDayData.day]);

  // File upload handler
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 15MB. You can also share a Google Drive or YouTube link.",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Please sign in to upload files.");

      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
      const path = `vacation/${user.id}/${activeCompetition.id}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("event-submissions")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("event-submissions").getPublicUrl(path);
      setUploadedFileUrl(pub.publicUrl);
      setLink(pub.publicUrl);
      toast({
        title: "File uploaded! 🎉",
        description: "Photo / media proof attached.",
      });
    } catch (err: any) {
      toast({
        title: "Upload note",
        description: "Please share a Google Drive, YouTube, or Canva link in the box below.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit manual project entry
  const handleSubmitManual = async () => {
    setSaving(true);
    try {
      // Find matching activity ID in DB if virtual
      let actId = activeCompetition.id;
      if (actId.startsWith("virtual-")) {
        const found = campaignActivities.find((a) => a.title.toLowerCase().includes(selectedDayData.event.title.toLowerCase()));
        if (found) actId = found.id;
      }

      const finalContent = teamMembers.trim()
        ? `[TEAM ENTRY] Members: ${teamMembers.trim()}\n\n${content}`
        : content;

      await submitVacationActivity(actId, finalContent, link);
      toast({ title: "Submitted! 🚀", description: "Teachers will review your project and award points." });
      setSubmitDialogOpen(false);
      setContent("");
      setTeamMembers("");
      setLink("");
      setUploadedFileUrl("");
      await load();
    } catch (error) {
      toast({
        title: "Could not submit",
        description: vacationErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Game Completion
  const handleGameComplete = async (result: {
    score: number;
    maxScore: number;
    stars: 1 | 2 | 3;
    summary: string;
    artworkDataUrl?: string;
  }) => {
    setGameModalOpen(false);

    // Save local cache
    const updated = { ...localCompletedDays, [selectedDayNumber]: true };
    setLocalCompletedDays(updated);
    try {
      localStorage.setItem("dlms_vacation_local_completed", JSON.stringify(updated));
    } catch {}

    // Auto submit to DB
    try {
      let actId = activeCompetition.id;
      if (actId.startsWith("virtual-")) {
        const found = campaignActivities.find((a) => a.title.toLowerCase().includes(selectedDayData.event.title.toLowerCase()));
        if (found) actId = found.id;
      }
      await submitVacationActivity(actId, `[GAME_COMPLETED] ${result.summary}`, result.artworkDataUrl || undefined);
    } catch {
      // Offline / virtual activity fallback
    }

    toast({
      title: "Challenge Completed! ⭐⭐⭐",
      description: `You earned ${result.score} points for Day ${selectedDayNumber}!`,
    });
    await load();
  };

  const completedCount = useMemo(() => {
    const approvedInDb = (overview?.history || []).filter((h) => h.status === "approved").length;
    const localCount = Object.keys(localCompletedDays).length;
    return Math.max(approvedInDb, localCount);
  }, [overview, localCompletedDays]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Sleek, Uncluttered Festival Header */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 overflow-hidden shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Sun className="h-3.5 w-3.5" /> Play • Learn • Grow
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {completedCount} / 10 Challenges Won
              </span>
              <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> {overview?.progress?.current_streak || 0}-Day Streak
              </span>
              {isUpcoming && (
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/25">
                  Starts in {startsInDays} Days
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-foreground truncate">
              {campaign?.title || "DLMS Vacation Festival: 10 Days • 10 Challenges"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              Complete daily hands-on creative missions, interactive simulator labs, and live quiz championships!
            </p>
          </div>

          {/* Quick Header Stats */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-card border text-center min-w-[72px]">
              <p className="text-base sm:text-lg font-black text-primary">{overview?.progress?.total_points || 0}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Points</p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-card border text-center min-w-[72px]">
              <p className="text-base sm:text-lg font-black text-orange-600">{overview?.progress?.current_streak || 0}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Streak</p>
            </div>
            {isUpcoming && campaign?.start_date && (
              <div className="hidden sm:block">
                <VacationCountdownTimer mode="start" targetTime={campaign.start_date} label="Begins In" compact />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clean Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full h-11 p-1 bg-muted/60 rounded-2xl border">
          <TabsTrigger value="arena" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Gamepad2 className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">Challenges &amp; Games</span>
            <span className="sm:hidden">Challenges</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">Quiz Championships</span>
            <span className="sm:hidden">Quizzes</span>
          </TabsTrigger>
          <TabsTrigger value="standings" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Award className="h-4 w-4 text-amber-500" />
            <span>Standings</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">My History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: MAIN CHALLENGES & LABS ================= */}
        <TabsContent value="arena" className="space-y-4 m-0">
          {/* Day Stage Selector (1 to 10 Stage Map) */}
          <Card className="border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-amber-500" /> Select Day Level (Stage 1 to 10)
                </CardTitle>
                <span className="text-[11px] font-bold text-muted-foreground">
                  Day {selectedDayNumber} Selected
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
                <div className="flex items-center gap-2 min-w-[700px]">
                  {tenDaysRoadmap.map((item) => {
                    const isSelected = item.day === selectedDayNumber;
                    const isDone = item.isMainApproved || Boolean(localCompletedDays[item.day]);

                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => setSelectedDayNumber(item.day)}
                        className={`flex-1 p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-1 min-w-[64px] ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/15 shadow-sm ring-2 ring-amber-500/50"
                            : item.isToday
                            ? "border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10"
                            : "border-border/70 bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-black text-foreground">Day {item.day}</span>
                          {item.isToday && (
                            <span className="text-[8px] font-black uppercase bg-amber-500 text-white px-1 rounded-full">
                              Today
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-bold text-foreground/90 truncate leading-tight">
                          {item.event.title.split(" ")[0]}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                          <span className={isDone ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                            {isDone ? "✓ Done" : "500 XP"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Day Challenge Showcase Card (BIG, DETAILED & ENGAGING) */}
          <Card className="border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-4 bg-muted/20 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-600 text-white text-xs font-black">
                      Day {selectedDayNumber} of 10
                    </Badge>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25">
                      {selectedDayData.event.tagline}
                    </span>
                    {selectedDayData.isToday && (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold animate-pulse">
                        Active Today
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-foreground">
                    {selectedDayData.event.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                    {selectedDayData.event.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <Badge variant="outline" className="text-xs font-black px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                    ⚡ 500 Reward Points
                  </Badge>
                  {isCompleted && (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed!
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-5">
              {/* Challenge Briefing & Problem Statement */}
              <div className="rounded-2xl border p-4 bg-card space-y-2.5 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-amber-500" /> Real-World Mission Briefing:
                </h4>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedDayData.event.description}
                </p>

                {/* What students learn */}
                {selectedDayData.event.learningOutcomes && (
                  <div className="pt-2 border-t flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground mr-1">Skills Developed:</span>
                    {selectedDayData.event.learningOutcomes.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] font-semibold">
                        ✓ {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION HUB: 2 Ways to Complete (Interactive Game/Lab OR Hands-On Project Upload) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Interactive Lab / Game */}
                <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <Gamepad2 className="h-4 w-4" /> Mode A: Interactive Lab / Game
                      </span>
                      <Badge className="bg-amber-600 text-white text-[10px]">Instant 500 XP</Badge>
                    </div>
                    <h5 className="text-sm font-black text-foreground">Play In-App Simulation Challenge</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Run the multi-stage interactive lab, structural physics testing, digital treasure clues, or canvas tools built right into DLMS!
                    </p>
                  </div>

                  <Button
                    onClick={() => setGameModalOpen(true)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-md h-9"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {isCompleted ? "Replay Game / Simulation" : "🎮 Launch Day Game & Complete (500 XP)"}
                  </Button>
                </div>

                {/* Option 2: Hands-on Project / Write-up Submission */}
                <div className="p-4 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                        <Camera className="h-4 w-4" /> Mode B: Hands-On Project Showcase
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold">Photo / Write-Up</Badge>
                    </div>
                    <h5 className="text-sm font-black text-foreground">Submit Physical Model or Research</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Did you build a real bridge, shoot a video, write a speech, or create artwork at home? Share your writeup or photo proof!
                    </p>
                  </div>

                  <Button
                    onClick={() => setSubmitDialogOpen(true)}
                    variant="outline"
                    className="w-full border-sky-500/40 text-foreground hover:bg-sky-500/10 font-bold text-xs gap-1.5 h-9"
                  >
                    <UploadCloud className="h-3.5 w-3.5 text-sky-600" />
                    {currentSubmission ? "View / Edit Project Entry" : "📝 Submit Project Write-up / Photo"}
                  </Button>
                </div>
              </div>

              {/* Status Banner */}
              {currentSubmission && (
                <div className="p-3 rounded-xl border bg-muted/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold">Status: {currentSubmission.status.toUpperCase()}</span>
                    {currentSubmission.points_awarded && (
                      <span className="text-emerald-600 font-bold">+{currentSubmission.points_awarded} pts awarded</span>
                    )}
                  </div>
                  {currentSubmission.review_note && (
                    <span className="text-muted-foreground truncate max-w-xs">&ldquo;{currentSubmission.review_note}&rdquo;</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: LIVE QUIZ CHAMPIONSHIP ================= */}
        <TabsContent value="quiz" className="space-y-4 m-0">
          <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Badge className="bg-amber-600 text-white text-xs font-black">
                    Track 2: Daily Live Quiz Championship
                  </Badge>
                  <CardTitle className="text-base sm:text-xl font-black">
                    {selectedDayData.quizChampionship.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {selectedDayData.quizChampionship.description}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-black text-amber-700 dark:text-amber-300 border-amber-500/30">
                  +{selectedDayData.quizChampionship.rewardPoints} Points
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 space-y-4">
              <div className="rounded-xl border p-3.5 bg-card/60 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {selectedDayData.quizChampionship.instructions}
              </div>

              {onNavigateToQuizzes && (
                <Button
                  onClick={onNavigateToQuizzes}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm gap-2 h-10 px-5 shadow-md"
                >
                  <Trophy className="h-4 w-4" /> Play Daily Quiz Championship Now →
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Quiz League Live Alert Card */}
          <UpcomingQuizLeagueCard
            userId={userId}
            userClass={userClass}
            onJoinLeague={(session) => {
              if (onJoinQuizLeague) onJoinQuizLeague(session);
              else if (onNavigateToQuizzes) onNavigateToQuizzes();
            }}
          />
        </TabsContent>

        {/* ================= TAB 3: LEADERBOARD ================= */}
        <TabsContent value="standings" className="m-0">
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Trophy className="h-4 w-4 text-amber-500" /> Vacation Festival Standings
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time leaderboard of points earned from daily challenges, games, and quizzes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              {!board.length ? (
                <p className="text-xs sm:text-sm text-muted-foreground py-6 text-center">
                  Standings will appear once students complete their first challenges!
                </p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Rank</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {board.map((row) => (
                        <TableRow key={row.student_id} className={row.is_me ? "bg-primary/5 font-semibold" : undefined}>
                          <TableCell className="font-mono text-xs">
                            {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : row.rank === 3 ? "🥉 3" : `#${row.rank}`}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {row.display_name}
                            {row.is_me ? " (you)" : ""}
                          </TableCell>
                          <TableCell className="text-right font-black text-xs sm:text-sm text-amber-600">
                            {row.total_points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 4: MY HISTORY ================= */}
        <TabsContent value="history" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-black text-orange-600">{overview?.progress?.current_streak || 0}</p>
              <p className="text-xs text-muted-foreground font-bold">Current Streak</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-black text-amber-600">{overview?.progress?.longest_streak || 0}</p>
              <p className="text-xs text-muted-foreground font-bold">Longest Streak</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-black text-primary">{overview?.progress?.total_points || 0}</p>
              <p className="text-xs text-muted-foreground font-bold">Total Points</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-black text-emerald-600">{completedCount}</p>
              <p className="text-xs text-muted-foreground font-bold">Challenges Completed</p>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-base font-bold">Your Submission History</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              {!overview?.history?.length && !Object.keys(localCompletedDays).length ? (
                <p className="text-xs sm:text-sm text-muted-foreground py-6 text-center">
                  No submissions yet. Launch Day 1 Challenge to get started!
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(overview?.history || []).map((row) => (
                    <div
                      key={row.activity_id}
                      className="flex items-center justify-between gap-2 text-xs sm:text-sm border rounded-xl p-3 bg-card"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{row.title}</p>
                        <p className="text-[11px] text-muted-foreground">{row.date || "Challenge"}</p>
                      </div>
                      <Badge variant={row.status === "approved" ? "default" : "secondary"}>
                        {row.status} {row.points_awarded ? `· +${row.points_awarded}` : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================= INTERACTIVE GAME ARENA MODAL ================= */}
      <VacationGameArenaModal
        open={gameModalOpen}
        dayNumber={selectedDayNumber}
        dayTitle={selectedDayData.event.title}
        campaignId={campaign?.id}
        activityId={activeCompetition.id}
        studentName={overview?.progress?.display_name || undefined}
        onClose={() => setGameModalOpen(false)}
        onComplete={handleGameComplete}
      />

      {/* ================= HANDS-ON PROJECT SUBMISSION DIALOG ================= */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-lg p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              Submit Day {selectedDayNumber}: {selectedDayData.event.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Share your project write-up, photo of your model, or external link for teacher review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Project Summary / Solution Description:</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe your model, experiment, solution, or key takeaways..."
                rows={4}
                className="text-xs"
              />
            </div>

            {/* Direct File Upload */}
            <div className="p-3 rounded-xl border border-dashed bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <UploadCloud className="h-4 w-4 text-amber-500" />
                  <span>Attach Photo / File Proof:</span>
                </Label>
                {uploadedFileUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-destructive px-1"
                    onClick={() => { setUploadedFileUrl(""); setLink(""); }}
                  >
                    Remove
                  </Button>
                )}
              </div>

              {uploadingFile ? (
                <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold p-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading to library storage...
                </div>
              ) : uploadedFileUrl ? (
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" /> File attached successfully!
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleDirectFileUpload}
                  />
                  <div className="flex items-center justify-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground">
                    <Camera className="h-4 w-4 text-amber-500" /> Choose Photo from Device
                  </div>
                </label>
              )}
            </div>

            {/* External Link */}
            <div className="space-y-1">
              <Label className="text-xs font-bold flex items-center gap-1">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" /> Google Drive / YouTube / Project Link:
              </Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSubmitDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitManual}
                disabled={saving || uploadingFile || (!content.trim() && !link.trim())}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                {saving ? "Submitting..." : "Submit for Teacher Review →"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
