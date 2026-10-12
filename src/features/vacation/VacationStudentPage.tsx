import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Play,
  Radio,
  Sparkles,
  Sun,
  Target,
  Trophy,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivities, fetchLeaderboard, fetchStudentOverview, submitVacationActivity } from "./api";
import { vacationErrorMessage } from "./errors";
import {
  POSTER_ACTIVITIES,
  TEN_DAYS_PROGRAM,
  inferActivitySubmissionType,
  parseActivityMeta,
} from "./constants";
import VacationCountdownTimer from "./VacationCountdownTimer";
import VacationEventPreviewCards from "./VacationEventPreviewCards";
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
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submissionRef = useRef<HTMLDivElement>(null);

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

        // Default to active activity if returned by overview
        if (data.activity?.id) {
          setSelectedActivityId(data.activity.id);
        } else if (acts.length > 0) {
          const first = acts.find((a) => a.is_active) || acts[0];
          setSelectedActivityId(first.id);
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
  }, []);

  const campaign = overview?.campaign;

  // Format today's date in local YYYY-MM-DD
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

  const isEnded = useMemo(() => {
    if (overview?.is_ended != null) return overview.is_ended;
    return Boolean(campaign?.end_date && campaign.end_date < todayStr);
  }, [overview, campaign, todayStr]);

  // Map 10-day program schedule with dates & activities
  const tenDaysRoadmap = useMemo(() => {
    if (!campaign?.start_date) {
      return TEN_DAYS_PROGRAM.map((p) => ({
        ...p,
        dateStr: "",
        mainActivity: null as VacationActivity | null,
        quizActivity: null as VacationActivity | null,
        isMainApproved: false,
        isMainSubmitted: false,
        isQuizApproved: false,
        isQuizSubmitted: false,
        isToday: false,
      }));
    }
    const startDate = new Date(campaign.start_date);
    const approvedActivityIds = new Set((overview?.history || []).filter((h) => h.status === "approved").map((h) => h.activity_id));
    const submittedActivityIds = new Set((overview?.history || []).map((h) => h.activity_id));

    return TEN_DAYS_PROGRAM.map((p) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + p.dateOffset);
      const dateStr = d.toISOString().split("T")[0];

      // Find activities matching this date or title
      const dayActs = campaignActivities.filter((a) => a.activity_date === dateStr || a.sort_order === p.day * 2 - 1 || a.sort_order === p.day * 2);
      const mainAct =
        dayActs.find((a) => !a.title.toLowerCase().includes("quiz") && !a.title.toLowerCase().includes("championship")) ||
        campaignActivities.find((a) => a.title.toLowerCase().includes(p.event.title.toLowerCase())) ||
        null;

      const quizAct =
        dayActs.find((a) => a.title.toLowerCase().includes("quiz") || a.title.toLowerCase().includes("championship")) ||
        campaignActivities.find((a) => a.title.toLowerCase().includes(`day ${p.day}`) && a.title.toLowerCase().includes("quiz")) ||
        null;

      return {
        ...p,
        dateStr,
        mainActivity: mainAct,
        quizActivity: quizAct,
        isMainApproved: mainAct ? approvedActivityIds.has(mainAct.id) : false,
        isMainSubmitted: mainAct ? submittedActivityIds.has(mainAct.id) : false,
        isQuizApproved: quizAct ? approvedActivityIds.has(quizAct.id) : false,
        isQuizSubmitted: quizAct ? submittedActivityIds.has(quizAct.id) : false,
        isToday: dateStr === todayStr,
      };
    });
  }, [campaign, campaignActivities, overview, todayStr]);

  // Selected day's program details
  const selectedDayData = useMemo(() => {
    return tenDaysRoadmap.find((d) => d.day === selectedDayNumber) || tenDaysRoadmap[0];
  }, [tenDaysRoadmap, selectedDayNumber]);

  // All activities for the selected day or today
  const selectedDayCompetitions = useMemo(() => {
    const list: VacationActivity[] = [];
    if (selectedDayData?.mainActivity) list.push(selectedDayData.mainActivity);
    if (selectedDayData?.quizActivity) list.push(selectedDayData.quizActivity);

    // If day has none explicitly mapped, fallback to active campaign activities
    if (list.length === 0) {
      if (campaignActivities.length > 0) {
        return campaignActivities.filter((a) => a.is_active);
      }
      if (overview?.activity) {
        return [overview.activity as VacationActivity];
      }
    }
    return list;
  }, [selectedDayData, campaignActivities, overview]);

  // Selected active competition
  const activeCompetition = useMemo(() => {
    if (selectedActivityId) {
      const match =
        selectedDayCompetitions.find((a) => a.id === selectedActivityId) ||
        campaignActivities.find((a) => a.id === selectedActivityId);
      if (match) return match;
    }
    return selectedDayCompetitions[0] || (overview?.activity as VacationActivity) || null;
  }, [selectedActivityId, selectedDayCompetitions, campaignActivities, overview]);

  // Determine submission status for current active competition
  const currentSubmission = useMemo<VacationSubmission | null>(() => {
    if (!activeCompetition) return null;
    if (overview?.activity?.id === activeCompetition.id && overview.submission) {
      return overview.submission;
    }
    const hist = overview?.history?.find((h) => h.activity_id === activeCompetition.id);
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
    return null;
  }, [activeCompetition, overview, campaign, userId]);

  // Window open check
  const isWindowOpen = useMemo(() => {
    if (!activeCompetition) return false;
    if ("window_open" in activeCompetition && activeCompetition.window_open != null) {
      return activeCompetition.window_open;
    }
    const now = new Date().toISOString();
    if (activeCompetition.opens_at && activeCompetition.closes_at) {
      return now >= activeCompetition.opens_at && now < activeCompetition.closes_at;
    }
    if (activeCompetition.activity_date) {
      return activeCompetition.activity_date === todayStr;
    }
    return true;
  }, [activeCompetition, todayStr]);

  const canResubmit = currentSubmission?.status === "rejected" && isWindowOpen;
  const canSubmit =
    campaign?.status === "active" &&
    activeCompetition &&
    (!currentSubmission || canResubmit) &&
    isWindowOpen &&
    !isUpcoming;

  // Metadata and prompt parser
  const { submissionType, cleanInstructions } = useMemo(() => {
    if (!activeCompetition) return { submissionType: "mixed" as VacationSubmissionType, cleanInstructions: "" };
    const meta = parseActivityMeta(activeCompetition.instructions || "");
    if (meta.submissionType !== "mixed") {
      return meta;
    }
    const inferred = inferActivitySubmissionType(activeCompetition.title, activeCompetition.instructions || "");
    return { ...meta, submissionType: inferred };
  }, [activeCompetition]);

  const isLiveQuizEvent = useMemo(() => {
    if (!activeCompetition) return false;
    const titleLower = activeCompetition.title.toLowerCase();
    return (
      submissionType === "quiz" ||
      titleLower.includes("quiz") ||
      titleLower.includes("championship") ||
      titleLower.includes("trivia")
    );
  }, [activeCompetition, submissionType]);

  const completedTitles = useMemo(() => {
    return new Set(
      (overview?.history || [])
        .filter((h) => h.status === "approved")
        .map((h) => h.title.toLowerCase())
    );
  }, [overview]);

  const activePosterTemplate = useMemo(() => {
    if (!activeCompetition) return null;
    return (
      POSTER_ACTIVITIES.find(
        (p) =>
          activeCompetition.title.toLowerCase().includes(p.title.toLowerCase()) ||
          p.title.toLowerCase().includes(activeCompetition.title.toLowerCase())
      ) || null
    );
  }, [activeCompetition]);

  // Direct File Upload handler (uploads to Supabase storage)
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
      if (!user) throw new Error("Please sign in to upload your files.");

      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
      const path = `vacation/${user.id}/${activeCompetition?.id || "entry"}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("event-submissions")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("event-submissions").getPublicUrl(path);
      setUploadedFileUrl(pub.publicUrl);
      setLink(pub.publicUrl);
      toast({
        title: "File uploaded! 🎉",
        description: "Photo / file proof attached to your submission.",
      });
    } catch (err: any) {
      toast({
        title: "Upload note",
        description: err.message?.includes("bucket")
          ? "Please paste your Google Drive or photo share link directly in the link box below."
          : (err.message || "Could not upload file. You can paste a link below."),
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!activeCompetition) return;
    setSaving(true);
    try {
      await submitVacationActivity(activeCompetition.id, content, link);
      toast({ title: "Submitted! 🚀", description: "Teachers will review your activity and award points." });
      setContent("");
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

  const handleSelectActivity = (title: string) => {
    const act = campaignActivities.find(
      (a) =>
        a.title.toLowerCase().trim() === title.toLowerCase().trim() ||
        a.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(a.title.toLowerCase())
    );
    if (act) {
      setSelectedActivityId(act.id);
      // also sync day number if activity has date
      const matchedDay = tenDaysRoadmap.find((d) => d.dateStr === act.activity_date);
      if (matchedDay) setSelectedDayNumber(matchedDay.day);
    }
    setTimeout(() => {
      submissionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Poster-styled Hero Header */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-primary/10 overflow-hidden shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Play • Learn • Grow
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> 10 Days • 10 Challenges
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> + Daily Quiz Championships
            </span>
            {isUpcoming && (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/25 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Starts in {startsInDays} Days ({campaign?.start_date})
              </span>
            )}
          </div>
          <CardTitle className="text-lg sm:text-2xl font-black flex items-center gap-2 mt-1 break-words">
            <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0" />
            <span>{campaign?.title || "DLMS – Vacation Games & Competitions"}</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-foreground/80 font-medium leading-relaxed">
            10 Days of creative, hands-on challenges plus exciting daily live quiz championships! Build real-world skills, test your speed, and level up!
          </CardDescription>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
            <span className="bg-background/80 px-2 py-0.5 rounded-md border">🎨 10 Creative Challenges</span>
            <span>✦</span>
            <span className="bg-background/80 px-2 py-0.5 rounded-md border">🏆 10 Daily Quiz Championships</span>
            <span>✦</span>
            <span className="bg-background/80 px-2 py-0.5 rounded-md border">🔥 Daily Streak Multipliers</span>
          </div>
        </CardHeader>
      </Card>

      {/* Upcoming Campaign Alert Banner */}
      {isUpcoming && campaign && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm sm:text-base font-black text-foreground">
                  Campaign Begins in {startsInDays} {startsInDays === 1 ? "Day" : "Days"} ({campaign.start_date})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Explore the 10-day roadmap below! Preview each day&apos;s creative challenge and daily quiz championship to prepare your ideas early.
                </p>
              </div>
            </div>
            <div className="sm:self-center shrink-0">
              <VacationCountdownTimer
                mode="start"
                targetTime={campaign.start_date}
                label="Campaign Starts In"
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive 10-Day Vacation Roadmap Timeline */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-black">
                <Target className="h-5 w-5 text-amber-500" />
                10-Day Vacation Roadmap
              </CardTitle>
              <CardDescription className="text-xs">
                Click any day to view its Creative Challenge & Daily Live Quiz Championship
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {overview?.progress?.approved_count || 0} Events Approved
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-orange-600">
                <Flame className="h-3.5 w-3.5" />
                {overview?.progress?.current_streak || 0}-Day Streak
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-2">
          {/* Horizontal scrollable roadmap track */}
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-2.5 min-w-[760px]">
              {tenDaysRoadmap.map((item) => {
                const isSelected = item.day === selectedDayNumber;
                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => {
                      setSelectedDayNumber(item.day);
                      if (item.mainActivity) setSelectedActivityId(item.mainActivity.id);
                    }}
                    className={`flex-1 p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-1.5 min-w-[70px] ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/15 shadow-sm ring-2 ring-amber-500/50"
                        : item.isToday
                        ? "border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10"
                        : "border-border/70 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-black text-foreground">
                        Day {item.day}
                      </span>
                      {item.isToday && (
                        <span className="text-[9px] font-black uppercase bg-amber-500 text-white px-1.5 py-0.2 rounded-full">
                          Today
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-bold text-foreground/90 truncate leading-tight">
                      {item.event.title.split(" ")[0]}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                      {/* Challenge status dot */}
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.isMainApproved
                            ? "bg-emerald-500"
                            : item.isMainSubmitted
                            ? "bg-amber-500"
                            : "bg-muted-foreground/30"
                        }`}
                        title="Challenge Status"
                      />
                      {/* Quiz status dot */}
                      <span
                        className={`text-[9px] font-bold ${
                          item.isQuizApproved
                            ? "text-emerald-600"
                            : item.isQuizSubmitted
                            ? "text-amber-600"
                            : "text-muted-foreground/50"
                        }`}
                        title="Daily Quiz Championship"
                      >
                        🏆
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dual-Track Competitions Card for Selected Day */}
      <Card className="border-border/80 shadow-sm" ref={submissionRef}>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black">
                  <Sun className="h-5 w-5 text-amber-500 shrink-0" />
                  Day {selectedDayNumber}: {selectedDayData?.event.title}
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-bold text-amber-700 dark:text-amber-300 border-amber-500/30">
                  {selectedDayData?.dateStr ? `Date: ${selectedDayData.dateStr}` : `Day ${selectedDayNumber} of 10`}
                </Badge>
                {selectedDayData?.isToday && (
                  <Badge className="bg-amber-600 text-white text-[10px] font-black animate-pulse">
                    Today&apos;s Active Round
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Every day features 2 tracks: 1 Creative Challenge + 1 Live Quiz Championship!
              </CardDescription>
            </div>

            {activeCompetition && (
              <Badge className="bg-amber-600 text-white font-bold text-xs px-3 py-1 self-start sm:self-center">
                +{activeCompetition.reward_points || 10} Points
              </Badge>
            )}
          </div>

          {/* Dual-Track Selector (Track 1: Main Event • Track 2: Daily Quiz Championship) */}
          {selectedDayCompetitions.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Day {selectedDayNumber} Events ({selectedDayCompetitions.length} Available):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedDayCompetitions.map((item) => {
                  const isSelected = item.id === activeCompetition?.id;
                  const itemTitle = item.title.toLowerCase();
                  const isItemQuiz =
                    itemTitle.includes("quiz") ||
                    itemTitle.includes("championship") ||
                    itemTitle.includes("trivia");
                  const isItemApproved = completedTitles.has(item.title.toLowerCase());

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedActivityId(item.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/15 shadow-sm ring-2 ring-amber-500/40"
                          : "border-border/70 hover:border-amber-500/40 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isItemQuiz
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {isItemQuiz ? "🏆 Track 2: Daily Quiz Championship" : "🎨 Track 1: Day Challenge"}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            +{item.reward_points || 10} pts
                          </span>
                        </div>
                        <p className="font-bold text-sm text-foreground leading-snug line-clamp-2">{item.title}</p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 text-xs text-muted-foreground border-t border-border/40">
                        <span>{isItemQuiz ? "15–30 Mins Live Window" : "Day-Long Submission"}</span>
                        {isItemApproved ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="font-bold text-primary flex items-center gap-0.5">
                            {isItemQuiz ? "Play & Submit →" : "Submit Entry →"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {activeCompetition ? (
            <div className="space-y-4">
              {/* Timing & Deadline Countdown Timer */}
              {isLiveQuizEvent ? (
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-background p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">
                        Daily Live Quiz Championship • Day {selectedDayNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Participate live on DLMS or complete today&apos;s feature quiz to claim your streak multiplier!
                      </p>
                    </div>
                  </div>
                  {activeCompetition.closes_at && (
                    <VacationCountdownTimer
                      mode="end"
                      targetTime={activeCompetition.closes_at}
                      label="Championship Closes In"
                      compact
                    />
                  )}
                </div>
              ) : activeCompetition.closes_at ? (
                <VacationCountdownTimer
                  mode="end"
                  targetTime={activeCompetition.closes_at}
                  label="Day Challenge Submission Deadline"
                />
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Day-Long Submission Window Open
                </div>
              )}

              {/* Title & Tagline */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-foreground break-words">
                    {activeCompetition.title}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase bg-primary/10 text-primary border-primary/20">
                    {isLiveQuizEvent ? "Live Quiz Championship" : "Creative Challenge"}
                  </Badge>
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

              {/* What students learn */}
              {activePosterTemplate?.learningOutcomes && activePosterTemplate.learningOutcomes.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What you learn:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activePosterTemplate.learningOutcomes.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium bg-background px-2 py-0.5 rounded-full border border-border/80"
                      >
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Instructions */}
              <div className="rounded-xl border p-3.5 sm:p-4 bg-card/60 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                {cleanInstructions || activeCompetition.instructions}
              </div>

              {/* Existing Submission Status Display */}
              {currentSubmission && (
                <div className="rounded-xl border p-3.5 text-xs sm:text-sm space-y-1.5 bg-muted/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">Your Submission:</span>
                    <Badge
                      variant={
                        currentSubmission.status === "approved"
                          ? "default"
                          : currentSubmission.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {currentSubmission.status}
                    </Badge>
                    {currentSubmission.status === "approved" && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{currentSubmission.points_awarded} points awarded!
                      </span>
                    )}
                  </div>
                  {currentSubmission.status === "rejected" && currentSubmission.review_note && (
                    <p className="text-destructive font-medium text-xs">
                      Teacher note: {currentSubmission.review_note}
                    </p>
                  )}
                </div>
              )}

              {/* Submission Form Section */}
              {isUpcoming ? (
                <div className="rounded-2xl border border-amber-500/30 p-4 bg-amber-500/5 space-y-2">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Submissions Open on {campaign?.start_date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This challenge is scheduled for the vacation campaign. You can prepare your solution, shoot your video/photos, or practice for the live quiz right now!
                  </p>
                </div>
              ) : canSubmit ? (
                <div className="space-y-3 pt-2 rounded-2xl border border-amber-500/30 p-3.5 sm:p-4 bg-amber-500/5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-foreground">
                        {isLiveQuizEvent
                          ? "Record Quiz Championship Entry"
                          : submissionType === "project_link"
                          ? "Submit Project Link"
                          : submissionType === "media_upload"
                          ? "Submit Photo Proof / Media"
                          : submissionType === "text_response"
                          ? "Submit Written Solution"
                          : "Submit Your Entry"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] sm:text-[11px] font-bold bg-background text-amber-700 dark:text-amber-300 border-amber-500/30">
                      Format: {submissionType.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Dedicated Quiz Championship quick CTA if event is a quiz */}
                  {isLiveQuizEvent && (
                    <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-200">
                            Daily Live Quiz Championship • Day {selectedDayNumber}
                          </span>
                        </div>
                        <Badge className="bg-amber-600 text-white text-[10px]">Live on DLMS</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Participate in today&apos;s scheduled quiz championship or complete today&apos;s feature quiz in the Quizzes tab!
                      </p>
                      {onNavigateToQuizzes && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={onNavigateToQuizzes}
                          className="font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 h-8"
                        >
                          <Trophy className="h-3.5 w-3.5" />
                          Play Quiz Championship Now →
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Written Answers / Summary */}
                  <div className="space-y-1">
                    <Label className="font-bold text-xs sm:text-sm">
                      {isLiveQuizEvent
                        ? "Quiz Score & Reflections"
                        : submissionType === "project_link"
                        ? "Project Summary / Description"
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
                        isLiveQuizEvent
                          ? "Enter your score (e.g. 10/10) and 2 key learnings from today's quiz championship..."
                          : submissionType === "project_link"
                          ? "Brief description of what you researched or built..."
                          : submissionType === "media_upload"
                          ? "Describe the materials used, how it works, and what you created..."
                          : submissionType === "text_response"
                          ? "Write down your step-by-step solution, decoded cipher, or book review here..."
                          : "Write a short summary of what you did, created, or learned..."
                      }
                      rows={submissionType === "text_response" ? 5 : 3}
                      className="w-full text-xs sm:text-sm"
                    />
                  </div>

                  {/* Direct Photo / File Upload Box */}
                  <div className="space-y-1.5 p-3 rounded-xl border border-dashed border-amber-500/40 bg-background/60">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                        <UploadCloud className="h-4 w-4 text-amber-500" />
                        <span>Direct File / Photo Proof Upload:</span>
                      </Label>
                      {uploadedFileUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2"
                          onClick={() => {
                            setUploadedFileUrl("");
                            setLink("");
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {uploadingFile ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        <span>Uploading file to secure library storage...</span>
                      </div>
                    ) : uploadedFileUrl ? (
                      <div className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-semibold truncate flex-1">File attached & uploaded successfully!</span>
                        <a
                          href={uploadedFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] underline font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 shrink-0"
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </a>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf,video/*"
                          className="hidden"
                          onChange={handleDirectFileUpload}
                        />
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground">
                          <Camera className="h-4 w-4 text-amber-500" />
                          <span>Choose Photo or Document from Device (Camera / Gallery / Files)</span>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* External Link Input (Google Drive, YouTube, GitHub, Slides) */}
                  <div className="space-y-1">
                    <Label className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>External Project Link (or auto-filled from upload above):</span>
                    </Label>
                    <Input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://drive.google.com/... or https://..."
                      className="w-full text-xs sm:text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Tip: Upload directly using the button above, or share a Google Drive / YouTube / Canva link.
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={saving || uploadingFile}
                    className="w-full sm:w-auto font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm shadow-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Submitting...
                      </>
                    ) : currentSubmission?.status === "rejected" ? (
                      "Resubmit Activity"
                    ) : (
                      "Submit Activity for Review →"
                    )}
                  </Button>
                </div>
              ) : currentSubmission?.status === "pending" ? (
                <div className="rounded-xl border border-border p-3 text-xs bg-muted/30">
                  <span className="font-bold text-foreground">Your entry has been submitted!</span> Our teachers will review and award points soon.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 border rounded-xl bg-muted/20">
              <Sun className="h-8 w-8 text-amber-500 mx-auto opacity-70" />
              <p className="text-sm font-bold text-foreground">No activities scheduled yet</p>
              <p className="text-xs text-muted-foreground">
                Activities for this campaign are being configured by teachers. Check back shortly!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Live Quiz Championship Integration Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Vacation Live Quiz Championship Hub
          </h3>
          <Badge variant="outline" className="text-xs font-bold text-amber-600 border-amber-500/40">
            Daily Live Tournaments 🔥
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
        currentActivityTitle={activeCompetition?.title}
        completedTitles={completedTitles}
        onSelectToday={() => submissionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        onSelectActivity={handleSelectActivity}
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
              You have a <strong className="text-foreground">{overview?.progress?.current_streak || 0}-day streak</strong>! Complete daily challenges and quiz championships to unlock milestone bonuses at 3, 5, 7, and 10 days.
            </p>
          </div>
        </div>
      </div>

      {/* Progress & History Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Flame className="h-4 w-4 text-orange-500" /> Your Streak & Points
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-sm">
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <p className="text-xl sm:text-2xl font-black text-orange-600">{overview?.progress?.current_streak || 0}</p>
              <p className="text-[11px] text-muted-foreground font-semibold">Current</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <p className="text-xl sm:text-2xl font-black text-amber-600">{overview?.progress?.longest_streak || 0}</p>
              <p className="text-[11px] text-muted-foreground font-semibold">Longest</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <p className="text-xl sm:text-2xl font-black text-primary">{overview?.progress?.total_points || 0}</p>
              <p className="text-[11px] text-muted-foreground font-semibold">Points</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 text-center">
              <p className="text-xl sm:text-2xl font-black text-emerald-600">{overview?.progress?.approved_count || 0}</p>
              <p className="text-[11px] text-muted-foreground font-semibold">Approved</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-base font-bold">Submission History</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            {!overview?.history?.length ? (
              <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">
                No submissions yet. Complete your first challenge above!
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {overview.history.map((row) => (
                  <div
                    key={row.activity_id}
                    className="flex items-center justify-between gap-2 text-xs sm:text-sm border rounded-xl p-2.5 bg-card/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{row.title}</p>
                      <p className="text-[11px] text-muted-foreground">{row.date || "Active Challenge"}</p>
                      {row.status === "rejected" && row.review_note && (
                        <p className="text-[11px] text-destructive truncate">Note: {row.review_note}</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        row.status === "approved"
                          ? "default"
                          : row.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="shrink-0 text-[10px] font-bold"
                    >
                      {row.status}
                      {row.points_awarded != null ? ` · +${row.points_awarded}` : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Standings Table with horizontal scroll wrapper for responsiveness */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Trophy className="h-4 w-4 text-amber-500" /> Vacation Standings
          </CardTitle>
          <CardDescription className="text-xs">
            Names and points only. Your rank is highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          {!board.length ? (
            <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">
              Standings appear after the first approved submissions.
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
    </div>
  );
}
