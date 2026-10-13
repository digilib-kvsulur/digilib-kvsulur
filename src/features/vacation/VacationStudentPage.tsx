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
  Search,
  UserCheck,
  UserPlus,
  UserX,
  Check,
  X,
  Copy,
  Lock,
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
import {
  createVacationTeam,
  fetchMyVacationTeams,
  formatTeamRoster,
  respondVacationTeamInvite,
  searchVacationPeers,
} from "./teamsApi";
import type {
  VacationActivity,
  VacationLeaderboardRow,
  VacationPeerProfile,
  VacationStudentOverview,
  VacationSubmission,
  VacationSubmissionType,
  VacationTeam,
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

  // Team Formation & Peer Search State
  const [regModalTab, setRegModalTab] = useState<"team-form" | "my-teams" | "guide">("team-form");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamSearchResults, setTeamSearchResults] = useState<VacationPeerProfile[]>([]);
  const [searchingPeers, setSearchingPeers] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [teamTargetEvent, setTeamTargetEvent] = useState(TEN_DAYS_PROGRAM[0]?.event.title || "STEAM Challenge");
  const [selectedTeammates, setSelectedTeammates] = useState<VacationPeerProfile[]>([]);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [myTeams, setMyTeams] = useState<VacationTeam[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<VacationTeam[]>([]);
  const [showRubric, setShowRubric] = useState(false);

  // Local game completion tracking cache
  const [localCompletedDays, setLocalCompletedDays] = useState<Record<number, boolean>>({});

  const myProfile: VacationPeerProfile = useMemo(() => {
    const me = board.find((b) => b.is_me);
    const parts = (me?.display_name || "Student").split(" ");
    return {
      id: userId || "me",
      first_name: parts[0] || "Student",
      last_name: parts.slice(1).join(" ") || "",
      student_class: userClass || null,
      role: "student",
    };
  }, [board, userId, userClass]);

  const loadTeamsData = async () => {
    if (!userId) return;
    try {
      const { myTeams: mt, incomingInvites: ii } = await fetchMyVacationTeams(userId);
      setMyTeams(mt);
      setIncomingInvites(ii);
    } catch {
      // safe fallback
    }
  };

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
    loadTeamsData();
    // Load local completed cache
    try {
      const cache = localStorage.getItem("dlms_vacation_local_completed");
      if (cache) setLocalCompletedDays(JSON.parse(cache));
    } catch {}
  }, [userId]);

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

      const isMainApproved = Boolean(mainAct && approvedActivityIds.has(mainAct.id));
      const isMainSubmitted = Boolean(mainAct && submittedActivityIds.has(mainAct.id));
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
  }, [campaign, campaignActivities, overview, todayStr]);

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
    return null;
  }, [activeCompetition, overview, campaign, userId, selectedDayData]);

  // Check if today matches the scheduled date for this day's activity
  const isDayToday = selectedDayData.isToday;
  const isUpcomingDay = Boolean(selectedDayData.dateStr && selectedDayData.dateStr > todayStr);
  const isPastDay = Boolean(selectedDayData.dateStr && selectedDayData.dateStr < todayStr);
  const canSubmitToday = isDayToday || (!selectedDayData.dateStr);

  const isCompleted = currentSubmission?.status === "approved";

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
    if (!canSubmitToday) {
      toast({
        title: "Submissions not allowed today",
        description: isUpcomingDay
          ? `Submissions for Day ${selectedDayNumber} will open on ${selectedDayData.dateStr || "scheduled date"} (8:00 AM – 6:00 PM).`
          : `The submission deadline for Day ${selectedDayNumber} has passed (${selectedDayData.dateStr}).`,
        variant: "destructive",
      });
      return;
    }

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

  // Handle Game Completion (Practice Simulator - Fun & Learning only, no competition points awarded)
  const handleGameComplete = (result: {
    score: number;
    maxScore: number;
    stars: 1 | 2 | 3;
    summary: string;
    artworkDataUrl?: string;
  }) => {
    setGameModalOpen(false);
    toast({
      title: "Practice Completed! ⭐⭐⭐",
      description: `Great simulation run on Day ${selectedDayNumber}! Note: Mode A is for fun practice. Official competition points (100 Pts / 500 XP) are awarded exclusively through Mode B hands-on project submissions on the scheduled date.`,
    });
  };

  // Team Formation & Invite Handlers
  const handleSearchPeers = async () => {
    if (!teamSearchQuery.trim()) return;
    setSearchingPeers(true);
    try {
      const results = await searchVacationPeers(teamSearchQuery.trim(), userId);
      setTeamSearchResults(results);
      if (results.length === 0) {
        toast({
          title: "No students found",
          description: "Try searching with admission number (e.g. 1234) or a student's first/last name.",
        });
      }
    } catch {
      toast({
        title: "Search failed",
        description: "Could not fetch peers.",
        variant: "destructive",
      });
    } finally {
      setSearchingPeers(false);
    }
  };

  const handleAddTeammate = (peer: VacationPeerProfile) => {
    if (selectedTeammates.some((m) => m.id === peer.id)) {
      toast({ title: "Already added", description: `${peer.first_name} is already in your selected roster.` });
      return;
    }
    if (selectedTeammates.length >= 3) {
      toast({
        title: "Max Team Size Reached",
        description: "Teams can have at most 4 members (You + 3 peers).",
        variant: "destructive",
      });
      return;
    }
    setSelectedTeammates((prev) => [...prev, peer]);
  };

  const handleRemoveTeammate = (peerId: string) => {
    setSelectedTeammates((prev) => prev.filter((m) => m.id !== peerId));
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Team Name Required",
        description: "Please enter a creative name for your team.",
        variant: "destructive",
      });
      return;
    }
    if (selectedTeammates.length === 0) {
      toast({
        title: "Teammates Required",
        description: "Search and add at least 1 peer by admission number or name to form a team.",
        variant: "destructive",
      });
      return;
    }

    setCreatingTeam(true);
    try {
      const created = await createVacationTeam({
        campaignId: overview?.campaign?.id,
        name: newTeamName.trim(),
        eventTitle: teamTargetEvent,
        leader: myProfile,
        invitedMembers: selectedTeammates,
      });

      toast({
        title: "Team Invites Sent! 🎉",
        description: `Team "${created.name}" created. Invites sent to ${selectedTeammates.length} teammate(s). The team will be formed once they accept!`,
      });

      setNewTeamName("");
      setSelectedTeammates([]);
      setTeamSearchQuery("");
      setTeamSearchResults([]);
      await loadTeamsData();
      setRegModalTab("my-teams");
    } catch (err: any) {
      toast({
        title: "Could not create team",
        description: err?.message || "An error occurred while creating the team.",
        variant: "destructive",
      });
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleRespondInvite = async (teamId: string, decision: "accept" | "decline") => {
    if (!userId) return;
    try {
      const updated = await respondVacationTeamInvite(teamId, userId, decision);
      if (decision === "accept") {
        toast({
          title: "Invitation Accepted! 🤝",
          description: `You are now part of team "${updated?.name || "your team"}"! Team formed successfully!`,
        });
      } else {
        toast({
          title: "Invitation Declined",
          description: "You have declined the team invitation.",
        });
      }
      await loadTeamsData();
    } catch (err: any) {
      toast({
        title: "Error updating invite",
        description: err?.message || "Could not respond to team invite.",
        variant: "destructive",
      });
    }
  };

  const handleUseTeamInSubmission = (team: VacationTeam) => {
    const formatted = formatTeamRoster(team);
    setTeamMembers(formatted);
    toast({
      title: "Team Roster Applied! 👥",
      description: `Roster for "${team.name}" copied to your project submission.`,
    });
  };

  const completedCount = useMemo(() => {
    const approvedInDb = (overview?.history || []).filter((h) => h.status === "approved").length;
    const localCount = Object.keys(localCompletedDays).length;
    return Math.max(approvedInDb, localCount);
  }, [overview, localCompletedDays]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Sleek, Modern Festival Header (Compact & Consolidated) */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/10 p-3 sm:p-4 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Sun className="h-3 w-3" /> Autumn Break '26
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                10 Days • 10 Challenges • 1 Pt = 5 XP
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-foreground truncate">
              {campaign?.title || "DLMS Vacation Festival"}
            </h2>
          </div>

          {/* Inline Compact Stats Pills */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <div className="px-2.5 py-1 rounded-xl bg-card border flex items-center gap-1.5 shadow-2xs">
              <span className="text-xs font-black text-primary">
                {overview?.progress?.total_points || 0} Pts
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                ({pointsToXp(overview?.progress?.total_points || 0)} XP)
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-card border flex items-center gap-1 shadow-2xs">
              <Flame className="h-3.5 w-3.5 text-orange-600 fill-orange-500/20" />
              <span className="text-xs font-black text-orange-600">
                {overview?.progress?.current_streak || 0}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">Streak</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-card border flex items-center gap-1 shadow-2xs hidden sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-600">{completedCount}/10</span>
            </div>
          </div>
        </div>

        {/* Integrated Slim Team Formation Ribbon (Replaces the huge secondary card!) */}
        <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-xl bg-card/85 border border-amber-500/25 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Users className="h-3 w-3" />
            </div>
            <span className="text-[11px] sm:text-xs font-medium text-foreground truncate">
              <strong className="text-amber-700 dark:text-amber-300 font-bold">14 Oct:</strong> Team Formation Open (2–4 members or solo)
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 h-6 px-2.5 shrink-0 gap-1"
            onClick={() => {
              if (incomingInvites.length > 0) setRegModalTab("my-teams");
              setRegModalOpen(true);
            }}
          >
            <span>Team Hub</span>
            {incomingInvites.length > 0 && (
              <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 h-3.5">
                {incomingInvites.length}
              </Badge>
            )}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Clean Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-3">
        <TabsList className="grid grid-cols-4 w-full h-9 p-0.5 bg-muted/60 rounded-xl border">
          <TabsTrigger value="arena" className="rounded-lg text-xs font-bold gap-1 py-1 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Gamepad2 className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Challenges</span>
            <span className="sm:hidden">Events</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="rounded-lg text-xs font-bold gap-1 py-1 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Daily Quizzes</span>
            <span className="sm:hidden">Quizzes</span>
          </TabsTrigger>
          <TabsTrigger value="standings" className="rounded-lg text-xs font-bold gap-1 py-1 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>Standings</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-bold gap-1 py-1 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: MAIN CHALLENGES & LABS ================= */}
        <TabsContent value="arena" className="space-y-3.5 m-0">
          {/* Sleek Stage Track (Zero outer card container clutter) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-amber-500" /> Stage Track (Days 1 to 10)
              </span>
              <span className="text-[11px] font-black text-amber-700 dark:text-amber-300">
                Day {selectedDayNumber}: {selectedDayData.event.title.split(" ")[0]}
              </span>
            </div>

            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <div className="flex items-center gap-1.5 min-w-max">
                {tenDaysRoadmap.map((item) => {
                  const isSelected = item.day === selectedDayNumber;
                  const isDone = item.isMainApproved || Boolean(localCompletedDays[item.day]);

                  return (
                    <button
                      key={item.day}
                      type="button"
                      onClick={() => setSelectedDayNumber(item.day)}
                      className={`px-3 py-1.5 rounded-xl border transition-all text-xs flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? "border-amber-500 bg-amber-500 text-white font-bold shadow-xs"
                          : item.isToday
                          ? "border-amber-500/50 bg-amber-500/10 text-foreground font-semibold hover:bg-amber-500/20"
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className={isSelected ? "text-white" : "font-bold text-foreground"}>
                        D{item.day}
                      </span>
                      <span className="truncate max-w-[80px]">
                        {item.event.title.split(" ")[0]}
                      </span>
                      {isDone && (
                        <CheckCircle2 className={`h-3 w-3 ${isSelected ? "text-white" : "text-emerald-500"}`} />
                      )}
                      {item.isToday && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Day Challenge Showcase Card (BIG, DETAILED & ENGAGING) */}
          <Card className="border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="p-3.5 sm:p-5 pb-3 bg-muted/20 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className="bg-amber-600 text-white text-[11px] font-black h-5">
                      Day {selectedDayNumber} of 10
                    </Badge>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/25">
                      {selectedDayData.event.tagline}
                    </span>
                    {selectedDayData.isToday && (
                      <Badge className="bg-emerald-600 text-white text-[9px] font-bold h-5 animate-pulse">
                        Active Today
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-foreground">
                    {selectedDayData.event.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {selectedDayData.event.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                  <Badge variant="outline" className="text-xs font-black px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                    ⚡ 100 Pts (500 XP)
                  </Badge>
                  {isCompleted && (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-5 space-y-4">
              {/* Challenge Briefing & Problem Statement */}
              <div className="rounded-xl border p-3.5 bg-card space-y-2 shadow-2xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-500" /> Mission Briefing:
                </h4>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedDayData.event.description}
                </p>

                {/* What students learn */}
                {selectedDayData.event.learningOutcomes && (
                  <div className="pt-2 border-t flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground mr-1">Skills:</span>
                    {selectedDayData.event.learningOutcomes.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] font-semibold py-0">
                        ✓ {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Official 100-Point Rubric Breakdown (Collapsible to eliminate visual congestion) */}
              {selectedDayData.event.rubric?.length ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowRubric(!showRubric)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Official 100-Point Scoring Rubric (500 XP)</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      {showRubric ? "Hide ▲" : "View Criteria ▼"}
                    </span>
                  </button>

                  {showRubric && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-amber-500/20">
                      {selectedDayData.event.rubric.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg border bg-card/80 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-semibold text-foreground truncate">{r.criterion}</span>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                              {r.points} Pts
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-1">
                              ({pointsToXp(r.points)} XP)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* ACTION HUB: Mode A (Fun Practice Simulator) & Mode B (Official Hands-On Submission) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Practice Simulator / Lab (JUST FOR FUN - 0 POINTS) */}
                <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent space-y-3 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <Gamepad2 className="h-4 w-4" /> Mode A: Practice Simulator
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-bold text-muted-foreground">
                        Practice Only • 0 Pts
                      </Badge>
                    </div>
                    <h5 className="text-sm font-black text-foreground">Play In-App Simulation Challenge</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Practice and explore interactive lab models in-browser! Note: Simulator runs are for fun and skill learning. Official competition points (100 Pts / 500 XP) are awarded exclusively through Mode B hands-on project submissions on the scheduled date.
                    </p>
                  </div>

                  <Button
                    onClick={() => setGameModalOpen(true)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-xs h-9 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 text-white" />
                    <span>🎮 Launch Practice Simulator (Fun Mode)</span>
                  </Button>
                </div>

                {/* Option 2: Hands-on Project / Write-up Submission (OFFICIAL 100 PTS) */}
                <div className="p-4 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent space-y-3 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                        <Camera className="h-4 w-4" /> Mode B: Hands-On Project Showcase
                      </span>
                      <Badge className="bg-sky-600 text-white text-[10px] font-bold">
                        Official • 100 Pts (500 XP)
                      </Badge>
                    </div>
                    <h5 className="text-sm font-black text-foreground">Submit Physical Model, Write-up, or Media</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Build your model, conduct the experiment, create artwork, or prepare your write-up. Submit photos, PDFs, or links for teacher review and 100-point rubric grading.
                    </p>
                  </div>

                  {canSubmitToday ? (
                    <Button
                      onClick={() => setSubmitDialogOpen(true)}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-1.5 h-9 shadow-xs transition-colors"
                    >
                      <UploadCloud className="h-3.5 w-3.5 text-white" />
                      <span>{currentSubmission ? "View / Edit Project Entry" : "📝 Submit Hands-On Project (100 Pts)"}</span>
                    </Button>
                  ) : isUpcomingDay ? (
                    <div className="space-y-1">
                      <Button
                        disabled
                        className="w-full bg-muted text-muted-foreground font-semibold text-xs gap-1.5 h-9 cursor-not-allowed opacity-80"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Submissions Open on {selectedDayData.dateStr || `Day ${selectedDayNumber}`}</span>
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        🔒 Submissions accepted only on {selectedDayData.dateStr} (8:00 AM – 6:00 PM).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Button
                        disabled={!currentSubmission}
                        onClick={() => currentSubmission && setSubmitDialogOpen(true)}
                        className={`w-full text-xs gap-1.5 h-9 ${
                          currentSubmission
                            ? "bg-sky-600 hover:bg-sky-700 text-white font-bold"
                            : "bg-muted text-muted-foreground font-semibold cursor-not-allowed opacity-80"
                        }`}
                      >
                        {currentSubmission ? (
                          <>
                            <UploadCloud className="h-3.5 w-3.5 text-white" />
                            <span>View Submitted Project Entry</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            <span>Submission Window Closed ({selectedDayData.dateStr})</span>
                          </>
                        )}
                      </Button>
                      {!currentSubmission && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          The deadline for this activity date has passed.
                        </p>
                      )}
                    </div>
                  )}
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
        studentName={board.find((b) => b.is_me)?.display_name || undefined}
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
            {/* Team Members Input (For Team or Individual Mode) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-amber-500" />
                  Team Members (Optional for solo, required for teams):
                </Label>
                {selectedDayData.event.recommendedTeamSize && (
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Rec. size: {selectedDayData.event.recommendedTeamSize}
                  </span>
                )}
              </div>
              <Input
                value={teamMembers}
                onChange={(e) => setTeamMembers(e.target.value)}
                placeholder="e.g. Aarav Sharma (8A, Roll 12), Priya Nair (8A, Roll 24)"
                className="text-xs"
              />
              {myTeams.length > 0 && (
                <div className="pt-1 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Users className="h-3 w-3 text-amber-500" /> Quick-fill from your formed teams:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {myTeams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => handleUseTeamInSubmission(team)}
                        className="text-[10px] px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-foreground font-medium flex items-center gap-1 transition-colors"
                      >
                        <Users className="h-2.5 w-2.5 text-amber-500" />
                        <span>{team.name}</span>
                        <span className="text-muted-foreground">({team.members.filter((m) => m.status === "accepted").length})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                All team members credited will receive points and badges!
              </p>
            </div>

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

      {/* ================= TEAM FORMATION & PROGRAM GUIDE MODAL ================= */}
      <Dialog open={regModalOpen} onOpenChange={setRegModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Autumn Break Team Hub &amp; Program Guide
            </DialogTitle>
            <DialogDescription className="text-xs">
              PM SHRI Kendriya Vidyalaya AFS Sulur • Search Peers by Admission No. or Name • 2–4 Members
            </DialogDescription>
          </DialogHeader>

          <Tabs value={regModalTab} onValueChange={(v: any) => setRegModalTab(v)} className="space-y-4 pt-1">
            <TabsList className="grid grid-cols-3 w-full h-10 p-1 bg-muted/60 rounded-xl border">
              <TabsTrigger value="team-form" className="rounded-lg text-xs font-bold gap-1">
                <UserPlus className="h-3.5 w-3.5 text-amber-500" />
                <span>Form a Team</span>
              </TabsTrigger>
              <TabsTrigger value="my-teams" className="rounded-lg text-xs font-bold gap-1 relative">
                <Users className="h-3.5 w-3.5 text-amber-500" />
                <span>My Teams</span>
                {incomingInvites.length > 0 && (
                  <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 h-3.5 ml-1 animate-pulse">
                    {incomingInvites.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="guide" className="rounded-lg text-xs font-bold gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Program Guide</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: FORM A TEAM & SEARCH PEERS */}
            <TabsContent value="team-form" className="space-y-4 m-0 text-xs">
              {/* Step 1: Team Name & Target Event */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-card">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Team Name:</Label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Sulur Aero Innovators"
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Target Challenge / Event:</Label>
                  <select
                    value={teamTargetEvent}
                    onChange={(e) => setTeamTargetEvent(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {TEN_DAYS_PROGRAM.map((p) => (
                      <option key={p.day} value={p.event.title}>
                        Day {p.day}: {p.event.title}
                      </option>
                    ))}
                    <option value="General / All Team Events">All Team Events</option>
                  </select>
                </div>
              </div>

              {/* Step 2: Search Peers by Admission Number or Name */}
              <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-amber-500" />
                    <span>Search Students by Admission No. or Name:</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Enter the student's Admission Number (e.g. 4521) or First/Last Name. When they accept your invitation, the team is formed!
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchPeers();
                      }
                    }}
                    placeholder="Search by Admission No. (e.g. 1234) or Name..."
                    className="text-xs h-9 bg-background"
                  />
                  <Button
                    type="button"
                    onClick={handleSearchPeers}
                    disabled={searchingPeers || !teamSearchQuery.trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 shrink-0 gap-1"
                  >
                    {searchingPeers ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    <span>Search</span>
                  </Button>
                </div>

                {/* Search Results List */}
                {teamSearchResults.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                      Search Results ({teamSearchResults.length}):
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {teamSearchResults.map((peer) => {
                        const isAdded = selectedTeammates.some((m) => m.id === peer.id);
                        return (
                          <div
                            key={peer.id}
                            className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {peer.first_name[0] || "S"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold truncate text-foreground">
                                  {peer.first_name} {peer.last_name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  {peer.student_class && <span>Class {peer.student_class}</span>}
                                  {peer.admission_number && (
                                    <span className="font-mono bg-muted px-1.5 py-0.2 rounded">
                                      Adm: {peer.admission_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={isAdded ? "secondary" : "outline"}
                              disabled={isAdded}
                              onClick={() => handleAddTeammate(peer)}
                              className="text-xs h-7 px-2.5 shrink-0 gap-1"
                            >
                              {isAdded ? (
                                <>
                                  <UserCheck className="h-3 w-3 text-emerald-600" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3 w-3 text-amber-600" />
                                  <span>Add</span>
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Current Team Roster Preview */}
              <div className="p-3.5 rounded-xl border bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-500" />
                    <span>Team Roster ({1 + selectedTeammates.length} / 4 members):</span>
                  </p>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Max 4 members per team
                  </span>
                </div>

                <div className="space-y-1.5">
                  {/* Leader Row (You) */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-600 font-bold text-xs">⭐</span>
                      <div>
                        <p className="font-bold text-xs">
                          {myProfile.first_name} {myProfile.last_name} (You)
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {myProfile.student_class ? `Class ${myProfile.student_class} • ` : ""}Team Leader
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
                      Leader
                    </Badge>
                  </div>

                  {/* Added Teammates */}
                  {selectedTeammates.map((teammate) => (
                    <div
                      key={teammate.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/40"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                          {teammate.first_name[0] || "T"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate">
                            {teammate.first_name} {teammate.last_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {teammate.student_class ? `Class ${teammate.student_class} ` : ""}
                            {teammate.admission_number ? `(Adm: ${teammate.admission_number})` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeammate(teammate.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  {selectedTeammates.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-2 italic border border-dashed rounded-lg">
                      No teammates added yet. Search by admission number or name above to build your roster!
                    </p>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                  📢 <strong>How Formation Works:</strong> When you click "Send Invites &amp; Create Team", an in-app invite is sent to each teammate. Once they click <strong>Accept</strong>, the team is formed and ready for project submissions!
                </div>
              </div>

              {/* Action Submit Button */}
              <Button
                type="button"
                onClick={handleCreateTeam}
                disabled={creatingTeam || !newTeamName.trim() || selectedTeammates.length === 0}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 shadow-md gap-2"
              >
                {creatingTeam ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Team Invites...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Send Invites &amp; Create Team 🚀</span>
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB 2: MY TEAMS & PENDING INVITATIONS */}
            <TabsContent value="my-teams" className="space-y-4 m-0 text-xs">
              {/* Incoming Pending Invitations Section */}
              {incomingInvites.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10">
                  <p className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pending Invitations for You ({incomingInvites.length}):</span>
                  </p>
                  <div className="space-y-2">
                    {incomingInvites.map((team) => (
                      <div
                        key={team.id}
                        className="p-3 rounded-lg border bg-card space-y-2 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-black text-sm text-foreground">{team.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Invited by <strong className="text-foreground">{team.leader_name}</strong> for{" "}
                              <span className="text-amber-600 font-semibold">{team.event_title}</span>
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                            Invited
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground">
                          Members: {team.members.map((m) => m.name).join(", ")}
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRespondInvite(team.id, "decline")}
                            className="text-xs h-7 px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <X className="h-3 w-3 mr-1" /> Decline
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRespondInvite(team.id, "accept")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 px-3"
                          >
                            <Check className="h-3 w-3 mr-1" /> Accept &amp; Form Team
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formed / Active Teams Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-500" />
                    <span>My Active Teams ({myTeams.length}):</span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setRegModalTab("team-form")}
                    className="text-[11px] h-6 px-2 text-amber-600 hover:text-amber-700"
                  >
                    + Form New Team
                  </Button>
                </div>

                {myTeams.length > 0 ? (
                  <div className="space-y-2.5">
                    {myTeams.map((team) => {
                      const isLeader = team.leader_id === userId;
                      const acceptedCount = team.members.filter((m) => m.status === "accepted").length;
                      const isFullyFormed = acceptedCount > 1;

                      return (
                        <div key={team.id} className="p-3.5 rounded-xl border bg-card space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-sm text-foreground">{team.name}</h4>
                                <Badge
                                  className={
                                    isFullyFormed
                                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]"
                                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]"
                                  }
                                >
                                  {isFullyFormed ? "✅ Team Formed" : "⏳ Pending Members"}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Challenge: <span className="font-semibold text-foreground">{team.event_title}</span> • Led by{" "}
                                <span className="font-semibold text-foreground">{team.leader_name}</span>
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {isLeader ? "👑 Leader" : "🤝 Member"}
                            </Badge>
                          </div>

                          {/* Member Status Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {team.members.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between p-1.5 rounded-lg border bg-muted/30 text-[11px]"
                              >
                                <span className="font-medium truncate">{m.name}</span>
                                {m.status === "accepted" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] shrink-0">
                                    ✅ Joined
                                  </span>
                                ) : m.status === "declined" ? (
                                  <span className="text-destructive font-bold text-[10px] shrink-0">
                                    ❌ Declined
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-bold text-[10px] shrink-0">
                                    ⏳ Invited
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Action to use this roster in submission */}
                          <div className="flex justify-end gap-2 pt-1 border-t">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleUseTeamInSubmission(team);
                                setRegModalOpen(false);
                                setSubmitDialogOpen(true);
                              }}
                              className="text-xs h-7 px-3 gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-foreground"
                            >
                              <Copy className="h-3 w-3 text-amber-500" />
                              <span>Apply Roster to Today's Project Submission</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed text-center space-y-2">
                    <p className="text-muted-foreground text-xs">
                      You haven't formed or joined any teams yet.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setRegModalTab("team-form")}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Form a Team Now
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: PROGRAM GUIDE */}
            <TabsContent value="guide" className="space-y-4 m-0 text-xs">
              {/* Timeline Breakdown */}
              <div className="p-3 rounded-xl border bg-muted/40 space-y-2">
                <p className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Official Program Schedule:
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-card border font-semibold">
                    <span className="text-amber-700 dark:text-amber-300">📅 14 October 2026</span>
                    <span>Registration &amp; Team Formation</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-card border font-semibold">
                    <span className="text-primary">🏆 15–24 October 2026</span>
                    <span>10 Daily Competitions + Live Quizzes (8 AM–6 PM)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-card border font-semibold">
                    <span className="text-emerald-600 dark:text-emerald-400">🎉 25 October 2026</span>
                    <span>Results, Grand Leaderboard &amp; Celebration</span>
                  </div>
                </div>
              </div>

              {/* Team Guidelines */}
              <div className="p-3 rounded-xl border bg-card space-y-2">
                <p className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-amber-500" /> Team Formation Rules:
                </p>
                <ul className="space-y-1.5 text-muted-foreground list-disc pl-4 leading-relaxed">
                  <li><strong className="text-foreground">Individual or Team:</strong> You can participate individually in all events, or form teams of 2 to 4 members.</li>
                  <li><strong className="text-foreground">Collaborative Events:</strong> Teams are especially encouraged for Day 1 (Bridge Engineering), Day 3 (Eco-Innovator), and Day 10 (Future-Ready India Pitch).</li>
                  <li><strong className="text-foreground">Team Credit:</strong> Simply list your teammates' Names, Classes, and Admission Numbers when submitting. All teammates receive credit upon approval.</li>
                  <li><strong className="text-foreground">Cross-Class Teams:</strong> Allowed between Class 6 to 12!</li>
                </ul>
              </div>

              {/* Point Standards & XP Conversion */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                <p className="font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider text-[10px]">
                  DLMS Point Standards (1 Point = 5 XP):
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-card/80 border">
                    <p className="font-bold text-foreground">Main Event</p>
                    <p className="text-amber-700 dark:text-amber-300 font-black">100 Pts = 500 XP</p>
                  </div>
                  <div className="p-2 rounded-lg bg-card/80 border">
                    <p className="font-bold text-foreground">Daily Live Quiz</p>
                    <p className="text-amber-700 dark:text-amber-300 font-black">50 Pts = 250 XP</p>
                  </div>
                  <div className="p-2 rounded-lg bg-card/80 border">
                    <p className="font-bold text-foreground">Day 10 Quiz Finale</p>
                    <p className="text-amber-700 dark:text-amber-300 font-black">100 Pts = 500 XP</p>
                  </div>
                  <div className="p-2 rounded-lg bg-card/80 border">
                    <p className="font-bold text-foreground">10-Day Streak</p>
                    <p className="text-amber-700 dark:text-amber-300 font-black">+200 Pts = 1,000 XP</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  onClick={() => setRegModalOpen(false)}
                >
                  Got It! Ready to Compete 🚀
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
