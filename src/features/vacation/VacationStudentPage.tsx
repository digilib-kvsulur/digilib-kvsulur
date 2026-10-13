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
  Dice5,
  Shuffle,
  AlertCircle,
  Info,
  RefreshCw,
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
import {
  AUTUMN_BREAK_PROBLEM_STATEMENTS,
  getDeterministicProblemIndex,
  getStoredParticipationMode,
  saveStoredParticipationMode,
  clearStoredParticipationMode,
  type VacationProblemStatement,
} from "./problemStatements";
import VacationCountdownTimer from "./VacationCountdownTimer";
import VacationGameArenaModal from "./games/VacationGameArenaModal";
import { UpcomingQuizLeagueCard } from "@/components/quiz/UpcomingQuizLeagueCard";
import {
  createVacationTeam,
  fetchMyVacationTeams,
  formatTeamRoster,
  leaveVacationTeam,
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
  userName?: string;
  onJoinQuizLeague?: (session: any) => void;
  onNavigateToQuizzes?: () => void;
}

export default function VacationStudentPage({
  userId,
  userClass,
  userName,
  onJoinQuizLeague,
  onNavigateToQuizzes,
}: VacationStudentPageProps = {}) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<VacationStudentOverview | null>(null);
  const [campaignActivities, setCampaignActivities] = useState<VacationActivity[]>([]);
  const [board, setBoard] = useState<VacationLeaderboardRow[]>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"arena" | "quiz" | "standings" | "history">("arena");
  const [userProfileData, setUserProfileData] = useState<{
    first_name?: string;
    last_name?: string;
    student_class?: string;
    admission_number?: string;
  } | null>(null);

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

  // Selected participation mode for current day ("team" | "individual" | null)
  const [dayParticipationMode, setDayParticipationMode] = useState<{
    day: number;
    mode: "team" | "individual";
    teamId?: string | null;
    teamName?: string | null;
    selectedAt: string;
  } | null>(null);

  // Selected team ID for team participation choice
  const [selectedTeamForDayId, setSelectedTeamForDayId] = useState<string>("");

  // Modal to browse all 5 problem statements for today
  const [allProblemsModalOpen, setAllProblemsModalOpen] = useState(false);

  // Local game completion tracking cache
  const [localCompletedDays, setLocalCompletedDays] = useState<Record<number, boolean>>({});

  // Direct fetch of profile if not passed in
  useEffect(() => {
    if (!userId) return;
    async function loadMyProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, student_class, admission_number")
          .eq("id", userId)
          .maybeSingle();
        if (!error && data) {
          setUserProfileData(data);
        }
      } catch {}
    }
    loadMyProfile();
  }, [userId]);

  const myProfile: VacationPeerProfile = useMemo(() => {
    // 1. If explicit userName passed as prop
    let firstName = "Student";
    let lastName = "";
    if (userName) {
      const parts = userName.trim().split(" ");
      firstName = parts[0] || "Student";
      lastName = parts.slice(1).join(" ") || "";
    } else if (userProfileData?.first_name) {
      firstName = userProfileData.first_name;
      lastName = userProfileData.last_name || "";
    } else {
      const me = board.find((b) => b.is_me);
      if (me?.display_name) {
        const parts = me.display_name.trim().split(" ");
        firstName = parts[0] || "Student";
        lastName = parts.slice(1).join(" ") || "";
      }
    }

    return {
      id: userId || "me",
      first_name: firstName,
      last_name: lastName,
      student_class: userClass || userProfileData?.student_class || null,
      admission_number: userProfileData?.admission_number || null,
      role: "student",
    };
  }, [userName, userProfileData, board, userId, userClass]);

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

  // Sync stored participation mode when day, user, or teams change
  useEffect(() => {
    const participantId = userId || "student";
    const stored = getStoredParticipationMode(participantId, selectedDayNumber);
    if (stored && stored.mode) {
      if (stored.mode === "team" && stored.teamId) {
        const foundTeam = myTeams.find((t) => t.id === stored.teamId);
        if (foundTeam) {
          setDayParticipationMode({
            day: selectedDayNumber,
            mode: "team",
            teamId: stored.teamId,
            teamName: stored.teamName || foundTeam.name,
            selectedAt: stored.selectedAt,
          });
          setSelectedTeamForDayId(stored.teamId);
          return;
        }
      } else if (stored.mode === "individual") {
        setDayParticipationMode({
          day: selectedDayNumber,
          mode: "individual",
          teamId: null,
          teamName: null,
          selectedAt: stored.selectedAt,
        });
        return;
      }
    }
    setDayParticipationMode(null);
  }, [userId, selectedDayNumber, myTeams]);

  // Timing checks for compulsory team formation & 8:00 AM problem release
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Team formation is compulsory before 10:00 AM of each day
  const isTeamFormationClosedToday =
    isDayToday && (currentHour > 10 || (currentHour === 10 && currentMinutes > 0));

  // Problem statement released at 8:00 AM daily
  const isPast8AmToday = isDayToday && currentHour >= 8;
  const isBefore8AmToday = isDayToday && currentHour < 8;

  // Daily Live Quiz Championship is hosted at 7:00 PM (19:00) daily during vacation. Lock it till 7:00 PM!
  const isPast7PmToday = isDayToday && currentHour >= 19;
  const isBefore7PmToday = isDayToday && currentHour < 19;
  const isQuizChampionshipUnlocked = Boolean(!isDayToday || isPast7PmToday || isPastDay);

  // Problem statement unlocked rule:
  // "once its selected. allot the problem statement at 8am randomly for the day or after the team selection (whichever is highest)."
  const isProblemUnlocked = Boolean(
    dayParticipationMode && (!isDayToday || isPast8AmToday || isPastDay)
  );

  const dayProblemSet =
    AUTUMN_BREAK_PROBLEM_STATEMENTS[selectedDayNumber] || AUTUMN_BREAK_PROBLEM_STATEMENTS[1];

  const allottedProblemInfo = useMemo(() => {
    if (!dayParticipationMode) return null;

    const seed =
      dayParticipationMode.mode === "team" && dayParticipationMode.teamId
        ? dayParticipationMode.teamId
        : (userId || "solo-participant");

    const problemIndex = getDeterministicProblemIndex(seed, selectedDayNumber);
    const problem = dayProblemSet.problems[problemIndex] || dayProblemSet.problems[0];

    // Determine allotment timestamp ("at 8am or after team selection, whichever is highest")
    let allotmentTimeString = "8:00 AM";
    if (dayParticipationMode.selectedAt) {
      const selDate = new Date(dayParticipationMode.selectedAt);
      const selHour = selDate.getHours();
      const selMin = selDate.getMinutes();
      if (selHour > 8 || (selHour === 8 && selMin > 0)) {
        allotmentTimeString = `${String(selHour).padStart(2, "0")}:${String(selMin).padStart(2, "0")}`;
      }
    }

    return {
      problem,
      problemIndex: problemIndex + 1, // 1 to 5
      seed,
      allotmentTimeString,
    };
  }, [dayParticipationMode, selectedDayNumber, dayProblemSet, userId]);

  const handleConfirmParticipationMode = (
    mode: "team" | "individual",
    teamId?: string | null,
    teamName?: string | null
  ) => {
    if (mode === "team" && isTeamFormationClosedToday) {
      toast({
        title: "Team Formation Closed",
        description: "Team formation for today's challenge closed at 10:00 AM. Please participate individually.",
        variant: "destructive",
      });
      return;
    }

    const effectiveId = userId || "student";
    saveStoredParticipationMode(effectiveId, selectedDayNumber, mode, teamId, teamName);

    setDayParticipationMode({
      day: selectedDayNumber,
      mode,
      teamId: teamId || null,
      teamName: teamName || null,
      selectedAt: new Date().toISOString(),
    });

    if (mode === "team" && teamId) {
      setSelectedTeamForDayId(teamId);
      const foundTeam = myTeams.find((t) => t.id === teamId);
      if (foundTeam) {
        handleUseTeamInSubmission(foundTeam);
      }
    }

    toast({
      title: mode === "team" ? "Team Participation Confirmed! 👥" : "Individual Participation Confirmed! 👤",
      description: isPast8AmToday
        ? "Your challenge problem statement has been allotted!"
        : "Your problem statement will unlock at 8:00 AM.",
    });
  };

  const handleSwitchParticipationMode = () => {
    if (isTeamFormationClosedToday) {
      toast({
        title: "Team Selection Locked",
        description: "Team selection and mode switching for today's challenge closed at 10:00 AM.",
        variant: "destructive",
      });
      return;
    }
    const participantId = userId || "student";
    clearStoredParticipationMode(participantId, selectedDayNumber);
    setDayParticipationMode(null);
    toast({
      title: "Participation Mode Reset",
      description: "You can now choose Individual mode, pick another team, or form a new team before 10:00 AM.",
    });
  };

  const handleLeaveTeam = async (teamId: string, teamName: string) => {
    if (!userId) return;
    try {
      await leaveVacationTeam(teamId, userId);
      toast({
        title: "Left Team",
        description: `You have left team "${teamName}". You can join another team or choose Individual mode.`,
      });
      if (dayParticipationMode?.teamId === teamId) {
        clearStoredParticipationMode(userId || "student", selectedDayNumber);
        setDayParticipationMode(null);
      }
      await loadTeamsData();
    } catch (err: any) {
      toast({
        title: "Error leaving team",
        description: err?.message || "Could not leave team.",
        variant: "destructive",
      });
    }
  };

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

      const problemTag = allottedProblemInfo?.problem
        ? `[ALLOTTED: ${allottedProblemInfo.problem.title}]`
        : "";
      const teamTag = teamMembers.trim()
        ? `[TEAM ENTRY] Members: ${teamMembers.trim()}`
        : (dayParticipationMode?.mode === "team" && dayParticipationMode.teamName)
        ? `[TEAM ENTRY] Team: ${dayParticipationMode.teamName}`
        : `[SOLO ENTRY]`;

      const headerTags = [problemTag, teamTag].filter(Boolean).join("\n");
      const finalContent = headerTags ? `${headerTags}\n\n${content}` : content;

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
      {/* Harmonious Festival Header (Deep Slate-Indigo with Warm Amber Accents) */}
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden relative shadow-md border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white">
        {/* Ambient glowing gold/indigo accents */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-4 sm:p-5 space-y-3">
          {/* Top row: Festival badge + completed counter */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Sun className="h-3.5 w-3.5 text-amber-400 animate-spin-slow" />
              <span>Autumn Break &apos;26 · 10 Days · 1 Pt = 5 XP</span>
            </span>
            <span className="text-[11px] font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Sparkles className="h-3 w-3 fill-current" />
              <span>{completedCount}/10 Completed</span>
            </span>
          </div>

          {/* Campaign title */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
              {campaign?.title || "DLMS Vacation Festival"}
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              10 Days • Daily Problem Statements • Teams (2–4) or Solo • Live Quizzes
            </p>
          </div>

          {/* Frosted stats row */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {/* Points pill */}
            <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-xl text-white shadow-xs transition-colors">
              <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              <span className="text-xs sm:text-sm font-black">{overview?.progress?.total_points || 0} Pts</span>
              <span className="text-[10px] text-white/70 font-semibold">({pointsToXp(overview?.progress?.total_points || 0)} XP)</span>
            </div>
            {/* Streak pill */}
            <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-xl text-white shadow-xs transition-colors">
              <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
              <span className="text-xs sm:text-sm font-black">{overview?.progress?.current_streak || 0}</span>
              <span className="text-[10px] text-white/70 font-semibold">Day Streak</span>
            </div>
            {/* Completed pill */}
            <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-xl text-white shadow-xs transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs sm:text-sm font-black">{completedCount}</span>
              <span className="text-[10px] text-white/70 font-semibold">Labs Done</span>
            </div>
          </div>

          {/* Team Formation ribbon */}
          <button
            type="button"
            onClick={() => {
              if (incomingInvites.length > 0) setRegModalTab("my-teams");
              setRegModalOpen(true);
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-left hover:bg-white/15 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs font-black">
                <Users className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-bold text-white leading-snug">
                  <span className="text-amber-300 font-black">14 Oct:</span> Team Formation Open — 2–4 members or solo
                </p>
                {incomingInvites.length > 0 && (
                  <p className="text-[10px] text-amber-200 font-semibold">
                    🔔 {incomingInvites.length} pending invite{incomingInvites.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] px-3 py-1 rounded-lg shrink-0 shadow-xs transition-colors">
              <span>Team Hub</span>
              <ChevronRight className="h-3 w-3" />
              {incomingInvites.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center ml-0.5 shadow-xs">
                  {incomingInvites.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-3">
        <TabsList className="grid grid-cols-4 w-full h-10 p-0.5 sm:p-1 bg-muted/70 rounded-xl border shadow-xs gap-0.5">
          <TabsTrigger value="arena" className="rounded-lg text-[11px] sm:text-xs font-bold gap-1 py-1 sm:py-1.5 px-1 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-amber-600">
            <Gamepad2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">Challenges</span>
            <span className="sm:hidden">Events</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="rounded-lg text-[11px] sm:text-xs font-bold gap-1 py-1 px-1 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">Daily Quiz (7 PM)</span>
            <span className="sm:hidden">Quiz (7P)</span>
            {isBefore7PmToday && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Opens at 7:00 PM" />
            )}
          </TabsTrigger>
          <TabsTrigger value="standings" className="rounded-lg text-[11px] sm:text-xs font-bold gap-1 py-1 px-1 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Standings</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-[11px] sm:text-xs font-bold gap-1 py-1 px-1 data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: MAIN CHALLENGES & LABS ================= */}
        <TabsContent value="arena" className="space-y-3.5 m-0">
          {/* BIG, ENGAGING 10-DAY SELECTION TRACK */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1.5 px-0.5 flex-wrap">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Compass className="h-3.5 w-3.5 text-amber-500" />
                <span>10-Day Festival Track</span>
              </span>
              <span className="text-[10.5px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25 shrink-0">
                Selected: Day {selectedDayNumber} ({selectedDayData.event.title.split(" ")[0]})
              </span>
            </div>

            {/* Carousel Cards with Smooth Scrolling and No Scrollbar Clipping */}
            <div className="overflow-x-auto pb-2.5 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-stretch gap-2 sm:gap-2.5 min-w-max">
                {tenDaysRoadmap.map((item) => {
                  const isSelected = item.day === selectedDayNumber;
                  const isDone = item.isMainApproved || Boolean(localCompletedDays[item.day]);
                  const formattedDate = item.dateStr
                    ? new Date(item.dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : `Day ${item.day}`;

                  return (
                    <button
                      key={item.day}
                      type="button"
                      onClick={() => setSelectedDayNumber(item.day)}
                      className={`relative flex flex-col justify-between p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 shrink-0 w-[124px] sm:w-[144px] min-h-[96px] sm:min-h-[104px] cursor-pointer active:scale-95 touch-manipulation ${
                        isSelected
                          ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/60"
                          : item.isToday
                          ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/50 hover:bg-amber-500/20 text-foreground ring-1 ring-amber-500/30"
                          : "bg-card hover:bg-muted/70 border-border/80 text-foreground shadow-2xs"
                      }`}
                    >
                      {/* Top row: Day badge + Status badge */}
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span
                          className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md leading-none ${
                            isSelected
                              ? "bg-black/25 text-white"
                              : item.isToday
                              ? "bg-amber-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Day {item.day}
                        </span>

                        {isDone ? (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                              isSelected ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                        ) : item.isToday ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold ${isSelected ? "text-white/85" : "text-muted-foreground"}`}>
                            {formattedDate}
                          </span>
                        )}
                      </div>

                      {/* Middle: Title & Badge icon */}
                      <div className="py-1">
                        <p
                          className={`text-xs sm:text-sm font-black line-clamp-1 leading-tight flex items-center gap-1.5 ${
                            isSelected ? "text-white" : "text-foreground"
                          }`}
                        >
                          <span className="text-sm sm:text-base shrink-0">{item.event.badgeIcon || "🎯"}</span>
                          <span className="truncate">{item.event.title.split(" ")[0]}</span>
                        </p>
                        <p
                          className={`text-[9.5px] sm:text-[10px] font-medium truncate mt-0.5 ${
                            isSelected ? "text-white/80" : "text-muted-foreground"
                          }`}
                        >
                          {item.event.tagline || item.event.subtitle}
                        </p>
                      </div>

                      {/* Bottom row: Points pill or Live tag */}
                      <div className="flex items-center justify-between w-full text-[10px] pt-1.5 border-t border-current/10 mt-auto">
                        <span className={`font-mono font-bold leading-none ${isSelected ? "text-white/95" : "text-amber-700 dark:text-amber-400"}`}>
                          100 Pts
                        </span>
                        <span className={`text-[9px] font-semibold leading-none ${isSelected ? "text-white/85" : "text-muted-foreground"}`}>
                          {item.isToday ? "🔥 Live Today" : formattedDate}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Day Challenge Showcase Card (Harmonious Theme) */}
          <Card className="overflow-hidden shadow-sm border border-border/80 bg-card">
            {/* Refined, elegant Day Header */}
            <div className="relative bg-gradient-to-r from-amber-500/15 via-orange-500/8 to-transparent p-4 sm:p-5 border-b border-amber-500/20">
              <div className="relative z-10 space-y-2.5">
                {/* Top badge row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-black text-xs px-2.5 py-0.5 shadow-2xs">
                    Day {selectedDayNumber} of 10
                  </Badge>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {selectedDayData.event.tagline}
                  </span>
                  {selectedDayData.isToday && (
                    <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                      ✓ Today&apos;s Live Challenge
                    </span>
                  )}
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
                    {selectedDayData.event.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                    {selectedDayData.event.subtitle}
                  </p>
                </div>

                {/* Points + Completion row */}
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-900 dark:text-amber-100 font-black text-xs">
                    <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/30" />
                    <span>100 Competition Pts (500 XP)</span>
                  </div>
                  {isCompleted && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl text-xs font-black">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Completed!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-3.5 sm:p-5 space-y-4">
              {/* PARTICIPATION SELECTION GATE & ALLOTTED PROBLEM STATEMENT */}
              {!dayParticipationMode ? (
                /* Step 1: Compulsory Participation Mode Selection Gate */
                <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4 sm:p-5 space-y-3.5 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-100 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                          Compulsory Step
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-foreground">
                          Choose Participation Mode to Unlock Challenge
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Team formation is compulsory before <strong>10:00 AM</strong> of each day. Individual participation can be chosen at any time. Once your mode is confirmed, your challenge problem statement is randomly allotted (at 8:00 AM or upon selection, whichever is highest).
                      </p>
                    </div>
                  </div>

                  {/* Two Choice Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Option A: Team Participation */}
                    <div
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                        isTeamFormationClosedToday
                          ? "bg-muted/40 border-border/80 opacity-75"
                          : "bg-card border-amber-500/35 hover:border-amber-500/60 shadow-xs"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-amber-500" />
                            <span>Team Mode (2–4 Members)</span>
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isTeamFormationClosedToday
                                ? "bg-red-500/15 text-red-700 dark:text-red-400"
                                : "bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500/30"
                            }`}
                          >
                            {isTeamFormationClosedToday ? "Closed (Past 10 AM)" : "Before 10:00 AM"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {isTeamFormationClosedToday
                            ? "Team registration closed at 10:00 AM for today's challenge. Please select Individual participation below."
                            : "Collaborate with peers. All team members receive the identical allotted problem statement and share points."}
                        </p>

                        {!isTeamFormationClosedToday && myTeams.length > 0 && (
                          <div className="pt-1.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-bold text-muted-foreground">Select Your Team:</Label>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRegModalTab("team-form");
                                  setRegModalOpen(true);
                                }}
                                className="text-[10px] h-5 px-1 text-amber-600 hover:text-amber-700"
                              >
                                + Form New Team
                              </Button>
                            </div>
                            <select
                              className="w-full text-xs p-1.5 rounded-lg border bg-background font-medium"
                              value={selectedTeamForDayId || myTeams[0].id}
                              onChange={(e) => setSelectedTeamForDayId(e.target.value)}
                            >
                              {myTeams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.members.filter((m) => m.status === "accepted").length} members)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        {isTeamFormationClosedToday ? (
                          <Button disabled size="sm" className="w-full text-xs font-bold bg-muted text-muted-foreground h-9 cursor-not-allowed">
                            <Lock className="h-3 w-3 mr-1" /> Team Formation Closed
                          </Button>
                        ) : myTeams.length > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const tId = selectedTeamForDayId || myTeams[0].id;
                              const teamObj = myTeams.find((t) => t.id === tId) || myTeams[0];
                              handleConfirmParticipationMode("team", teamObj.id, teamObj.name);
                            }}
                            className="w-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-9 shadow-xs"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Confirm Team Participation
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRegModalTab("team-form");
                              setRegModalOpen(true);
                            }}
                            className="w-full text-xs font-bold border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 hover:text-amber-950 dark:hover:text-white h-9"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" /> Form Team in Team Hub
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Option B: Individual Participation */}
                    <div className="p-3.5 rounded-xl border bg-card border-sky-500/35 hover:border-sky-500/60 flex flex-col justify-between gap-3 shadow-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-sky-500" />
                            <span>Individual Mode (Solo)</span>
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-800 dark:text-sky-200 border border-sky-500/25">
                            Open Anytime
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Compete independently under your own profile. You can select individual participation at any time and receive your own allotted problem.
                        </p>
                      </div>

                      <div className="pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmParticipationMode("individual")}
                          className="w-full text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white h-9 shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Confirm Individual Participation
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 2: Confirmed Mode Ribbon + Allotted Problem Statement */
                <div className="space-y-3">
                  {/* Confirmed Participation Status Ribbon */}
                  <div className="flex items-center justify-between gap-2 p-2.5 px-3.5 rounded-xl bg-card border border-border/80 text-xs shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <p className="text-xs text-foreground truncate">
                        <span className="text-muted-foreground">Mode:</span>{" "}
                        <strong className="text-amber-700 dark:text-amber-300 font-black">
                          {dayParticipationMode.mode === "team"
                            ? `Team "${dayParticipationMode.teamName}"`
                            : "Solo (Individual)"}
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isTeamFormationClosedToday ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSwitchParticipationMode}
                            className="h-7 text-[11px] font-bold text-amber-800 dark:text-amber-200 border-amber-500/40 hover:bg-amber-500/10 px-2.5 shadow-2xs gap-1"
                          >
                            <RefreshCw className="h-3 w-3 text-amber-600" />
                            <span>Change Mode / Team</span>
                          </Button>
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            (Till 10:00 AM)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md border">
                          <Lock className="h-3 w-3 text-muted-foreground" /> Mode locked (past 10:00 AM)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Allotment Timing Check: If today and before 8:00 AM, show countdown card */}
                  {!isProblemUnlocked ? (
                    <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2">
                      <Clock className="h-7 w-7 text-amber-600 mx-auto" />
                      <h4 className="text-sm font-black text-amber-950 dark:text-amber-100">
                        Problem Statement Unlocks at 8:00 AM
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-200 max-w-md mx-auto leading-relaxed">
                        Your {dayParticipationMode.mode === "team" ? `team "${dayParticipationMode.teamName}"` : "solo participation"} is confirmed! At 8:00 AM, your randomly assigned problem statement will be revealed here.
                      </p>
                    </div>
                  ) : (
                    /* The Unlocked Allotted Problem Statement Card */
                    <div className="rounded-2xl border border-amber-500/40 bg-card overflow-hidden shadow-xs space-y-0">
                      {/* Allotment Card Header */}
                      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 dark:text-amber-100 bg-amber-500/25 px-2.5 py-0.5 rounded-full border border-amber-500/35 flex items-center gap-1 shadow-2xs">
                            <Dice5 className="h-3.5 w-3.5 text-amber-600" />
                            <span>Allotted Problem {allottedProblemInfo?.problemIndex} of 5</span>
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            • Allotted at {allottedProblemInfo?.allotmentTimeString}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            ✓ Assigned to {dayParticipationMode.mode === "team" ? `Team ${dayParticipationMode.teamName}` : "You (Solo)"}
                          </span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAllProblemsModalOpen(true)}
                          className="h-7 text-xs font-bold border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 hover:text-amber-950 dark:hover:text-white shrink-0 self-start sm:self-auto"
                        >
                          Browse All 5 Problems →
                        </Button>
                      </div>

                      {/* Problem Statement Body */}
                      <div className="p-4 sm:p-5 space-y-3.5">
                        <div className="space-y-1.5">
                          <h4 className="text-base sm:text-lg font-black text-foreground">
                            {allottedProblemInfo?.problem.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-normal">
                            {allottedProblemInfo?.problem.description}
                          </p>
                        </div>

                        {/* Deliverable Callout Box */}
                        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1">
                          <p className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-sky-600" />
                            <span>Required Deliverables:</span>
                          </p>
                          <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
                            {allottedProblemInfo?.problem.deliverable}
                          </p>
                        </div>

                        {dayParticipationMode.mode === "team" && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-center gap-2">
                            <Users className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>
                              All members of team <strong>&ldquo;{dayParticipationMode.teamName}&rdquo;</strong> share this identical allotted problem statement.
                            </span>
                          </div>
                        )}

                        {/* Skills Developed */}
                        {selectedDayData.event.learningOutcomes && (
                          <div className="pt-2 border-t flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Skills:</span>
                            {selectedDayData.event.learningOutcomes.map((skill, idx) => (
                              <span key={idx} className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                                ✓ {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Official 100-Point Rubric (Collapsible) */}
              {selectedDayData.event.rubric?.length ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRubric(!showRubric)}
                    className="w-full flex items-center justify-between text-left px-4 py-3 hover:bg-amber-500/10 transition-colors"
                  >
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>Official 100-Point Scoring Rubric (500 XP)</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0 ml-2">
                      {showRubric ? "Hide ▲" : "View ▼"}
                    </span>
                  </button>

                  {showRubric && (
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-amber-500/20 pt-3">
                      {selectedDayData.event.rubric.map((r, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border bg-card/80 flex items-center justify-between gap-2 text-xs"
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

              {/* ACTION HUB: Dominant Mode B (Main Challenge) & Mode A (Practice Lab) */}
              <div className="space-y-3">
                {/* MODE B — PRIMARY & DOMINANT CHALLENGE SUBMISSION */}
                <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-indigo-950/10 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 p-4 sm:p-5 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm shrink-0">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 dark:text-amber-100 bg-amber-500/25 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                            ⭐ Official Daily Challenge
                          </span>
                          <span className="text-[10px] font-black text-amber-900 dark:text-amber-200 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            100 Points = 500 XP
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-foreground mt-0.5">
                          Submit Today's Challenge Solution
                        </h4>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground sm:text-right">
                      <span className="font-semibold text-foreground">Window:</span> 8:00 AM – 6:00 PM
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Solve your allotted problem statement (individually or as a team). Submit your working notes, links, photos, or slides to earn official rubric points and streak bonuses.
                  </p>

                  <div className="space-y-2">
                    {canSubmitToday && isPast8AmToday ? (
                      <Button
                        size="lg"
                        onClick={() => setSubmitDialogOpen(true)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm h-12 shadow-md hover:shadow-lg transition-all active:scale-[0.99] gap-2"
                      >
                        <UploadCloud className="h-5 w-5 text-white" />
                        <span>{currentSubmission ? "View / Edit Your Challenge Entry" : "🚀 Submit Challenge Solution Now"}</span>
                      </Button>
                    ) : isDayToday && isBefore8AmToday ? (
                      <Button
                        disabled
                        size="lg"
                        className="w-full bg-muted text-muted-foreground font-bold text-sm h-12 cursor-not-allowed opacity-80 gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        <span>Opens at 8:00 AM Today</span>
                      </Button>
                    ) : isUpcomingDay ? (
                      <Button
                        disabled
                        size="lg"
                        className="w-full bg-muted text-muted-foreground font-bold text-sm h-12 cursor-not-allowed opacity-80 gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Opens on {selectedDayData.dateStr || `Day ${selectedDayNumber}`} (8:00 AM)</span>
                      </Button>
                    ) : (
                      <Button
                        disabled={!currentSubmission}
                        size="lg"
                        onClick={() => currentSubmission && setSubmitDialogOpen(true)}
                        className={`w-full text-sm h-12 transition-all gap-2 ${
                          currentSubmission
                            ? "bg-amber-600 hover:bg-amber-700 text-white font-black shadow-sm"
                            : "bg-muted text-muted-foreground font-semibold cursor-not-allowed opacity-80"
                        }`}
                      >
                        {currentSubmission ? (
                          <>
                            <UploadCloud className="h-4 w-4 text-white" />
                            <span>View Submitted Project Entry</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4" />
                            <span>Submission Window Closed ({selectedDayData.dateStr})</span>
                          </>
                        )}
                      </Button>
                    )}

                    {!canSubmitToday && !currentSubmission && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        Challenge submissions are accepted exclusively during the scheduled event window.
                      </p>
                    )}
                  </div>
                </div>

                {/* MODE A — SECONDARY OPTIONAL PRACTICE SIMULATOR (LOCKED OUTSIDE DAY WINDOW) */}
                <div className="rounded-xl border border-border/80 bg-card/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                      <Gamepad2 className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Interactive Practice Lab</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-medium">
                          Optional Sandbox
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {canSubmitToday && isPast8AmToday
                          ? "Run interactive simulators to explore concepts before submitting."
                          : "Practice simulator unlocks during active challenge hours (8 AM – 6 PM)."}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-auto">
                    {canSubmitToday && isPast8AmToday ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setGameModalOpen(true)}
                        className="h-8 text-xs font-bold border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10 gap-1.5"
                      >
                        <Play className="h-3 w-3" />
                        <span>Launch Simulator</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-8 text-xs font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-70 gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        <span>Locked (Opens 8 AM)</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Submission Status Banner */}
              {currentSubmission && (
                <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  currentSubmission.status === "approved"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : currentSubmission.status === "rejected"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-amber-500/10 border-amber-500/30"
                }`}>
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${
                      currentSubmission.status === "approved"
                        ? "text-emerald-600"
                        : currentSubmission.status === "rejected"
                        ? "text-red-500"
                        : "text-amber-600"
                    }`} />
                    <div className="min-w-0">
                      <p className="font-bold">
                        Status: {currentSubmission.status.toUpperCase()}
                        {currentSubmission.points_awarded && (
                          <span className="text-emerald-600 ml-2">+{currentSubmission.points_awarded} pts awarded</span>
                        )}
                      </p>
                      {currentSubmission.review_note && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 italic">&ldquo;{currentSubmission.review_note}&rdquo;</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: LIVE QUIZ CHAMPIONSHIP ================= */}
        <TabsContent value="quiz" className="space-y-4 m-0">
          <Card className="overflow-hidden shadow-sm border-0">
            <div className="relative bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-4 sm:p-5">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-black text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-full inline-flex">
                  Track 2: Daily Live Quiz Championship
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {selectedDayData.quizChampionship.title}
                </h3>
                <p className="text-xs text-white/80 font-medium">{selectedDayData.quizChampionship.description}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-black text-white/90 bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
                    +{selectedDayData.quizChampionship.rewardPoints} Bonus Points
                  </span>
                </div>
              </div>
            </div>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                {selectedDayData.quizChampionship.instructions}
              </div>

              {/* 7:00 PM Daily Live Championship Lock / Unlock Card */}
              {!isQuizChampionshipUnlocked ? (
                <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/30 font-bold text-[10px]">
                          🔒 Opens at 7:00 PM Tonight
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          Daily Live Championship Lobby Locked
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The live multiplayer quiz championship is hosted every evening at <strong>7:00 PM (19:00 IST)</strong>. Come back at 7:00 PM to compete against classmates in real-time, earn leaderboard points, and maintain your streak multiplier!
                      </p>
                    </div>
                  </div>

                  <Button
                    disabled
                    className="w-full bg-muted text-muted-foreground font-bold text-xs sm:text-sm gap-2 h-11 cursor-not-allowed opacity-80"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Lobby Opens at 7:00 PM (19:00 IST)</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="font-bold">
                      {isDayToday ? "🟢 Live Championship Arena Open Now (7:00 PM Window Active)!" : `Day ${selectedDayNumber} Championship Available!`}
                    </span>
                  </div>

                  {onNavigateToQuizzes && (
                    <Button
                      onClick={onNavigateToQuizzes}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs sm:text-sm gap-2 h-11 px-6 shadow-md w-full sm:w-auto active:scale-[0.98] transition-all"
                    >
                      <Trophy className="h-4 w-4" /> Enter Live Quiz Championship Now →
                    </Button>
                  )}
                </div>
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
              {allottedProblemInfo ? (
                <span className="block font-semibold text-amber-700 dark:text-amber-300">
                  Allotted Brief: {allottedProblemInfo.problem.title} ({dayParticipationMode?.mode === "team" ? `Team "${dayParticipationMode.teamName}"` : "Solo Entry"})
                </span>
              ) : (
                "Share your project write-up, photo of your model, or external link for teacher review."
              )}
            </DialogDescription>
          </DialogHeader>

          {allottedProblemInfo && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <p className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                <Dice5 className="h-3.5 w-3.5 text-amber-600" />
                <span>Your Assigned Problem: {allottedProblemInfo.problem.title}</span>
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-200 line-clamp-2">
                {allottedProblemInfo.problem.description}
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold pt-0.5">
                📦 Deliverable: {allottedProblemInfo.problem.deliverable}
              </p>
            </div>
          )}

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitDialogOpen(false)}
                className="text-xs text-foreground hover:bg-muted hover:text-foreground"
              >
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

      {/* ================= ALL 5 PROBLEM STATEMENTS BROWSER MODAL ================= */}
      <Dialog open={allProblemsModalOpen} onOpenChange={setAllProblemsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
              <Dice5 className="h-5 w-5 text-amber-500" />
              Day {selectedDayNumber}: {selectedDayData.event.title} — All 5 Problem Statements
            </DialogTitle>
            <DialogDescription className="text-xs">
              PM SHRI Kendriya Vidyalaya AFS Sulur Autumn Break Festival • Each team or student is randomly allotted one problem statement at 8:00 AM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {dayProblemSet.problems.map((prob) => {
              const isMyAllotted = allottedProblemInfo?.problem.id === prob.id;
              return (
                <div
                  key={prob.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isMyAllotted
                      ? "border-amber-500 bg-amber-500/10 shadow-xs ring-2 ring-amber-500/30"
                      : "border-border/70 bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <h5 className="font-black text-sm text-foreground flex items-center gap-2">
                      <span>{prob.title}</span>
                    </h5>
                    {isMyAllotted && (
                      <span className="text-[10px] font-black bg-amber-600 text-white px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        ⭐ Your Allotted Problem
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed mb-2.5 whitespace-pre-wrap font-normal">
                    {prob.description}
                  </p>
                  <div className="p-2.5 rounded-lg bg-muted/60 text-[11px] text-muted-foreground border">
                    <strong className="text-foreground">Required Deliverable:</strong> {prob.deliverable}
                  </div>
                </div>
              );
            })}
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold truncate text-foreground">
                                    {peer.first_name} {peer.last_name}
                                  </p>
                                  {peer.is_friend ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0 font-bold">
                                      Friend 🤝 Auto-Accepts
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] text-muted-foreground px-1.5 py-0">
                                      Sends Invite ✉️
                                    </Badge>
                                  )}
                                </div>
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

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed space-y-1">
                  <p>
                    🤝 <strong>Smart Auto-Accept:</strong> Teammates who are already your <strong>DLMS Friends</strong> are automatically accepted and joined instantly!
                  </p>
                  <p className="text-[10px] opacity-90">
                    ✉️ Peers who are not yet friends will receive an in-app invite that they can manually accept or decline. All team members can freely change teams or switch to Individual mode before 10:00 AM.
                  </p>
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

                          {/* Action to manage / select / leave this team */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                            {!isLeader && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleLeaveTeam(team.id, team.name)}
                                className="text-xs h-7 px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                <X className="h-3 w-3 mr-1" />
                                <span>Decline / Leave Team</span>
                              </Button>
                            )}

                            <div className="flex items-center gap-2 ml-auto">
                              {!isTeamFormationClosedToday && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    handleConfirmParticipationMode("team", team.id, team.name);
                                    setRegModalOpen(false);
                                  }}
                                  className="text-xs h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 shadow-2xs"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Select Team for Today</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  handleUseTeamInSubmission(team);
                                  setRegModalOpen(false);
                                  setSubmitDialogOpen(true);
                                }}
                                className="text-xs h-7 px-2.5 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 font-semibold"
                              >
                                <Copy className="h-3 w-3 text-amber-500" />
                                <span>Copy Roster</span>
                              </Button>
                            </div>
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
