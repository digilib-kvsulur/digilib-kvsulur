import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageCircle, Trash2, Send, Plus, Users, Search, UserPlus, Check, X, Flame, Trophy, Award, BookOpen, Sparkles, UserCheck, Clock, UserX, Image, FileText, Video, Paperclip, Pin, BarChart3, Link2, ExternalLink, Flag, Loader2, Feather, BookMarked, Eye, Bookmark, AtSign, ShieldAlert, HelpCircle, CheckCircle2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileView } from "./ProfileView";
import { getAvatarUrl } from "@/lib/utils";
import BookClubs from "@/components/dashboard/BookClubs";
import SuggestionVoting from "./SuggestionVoting";
import { RotationalWinnerBadge } from "@/components/rewards/RotationalWinnerBadge";
import ReviewsModeration from "@/components/admin/ReviewsModeration";

const BAD_WORDS = ["fuck", "shit", "bitch", "asshole", "idiot", "bastard", "scam", "spam", "dumbass", "vulgar"];

const containsBadWords = (text: string): boolean => {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w));
};

interface PollOption { id: string; label: string; sort_order: number; votes: number }
interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  author?: any;
  likes: number;
  liked: boolean;
  comment_count: number;
  media_url?: string;
  media_type?: string;
  is_pinned?: boolean;
  post_type?: string;
  poll_ends_at?: string | null;
  pollOptions?: PollOption[];
  myVoteOptionId?: string | null;
  doubt_subject?: string;
  doubt_class?: string;
  doubt_status?: "unsolved" | "solved";
  accepted_comment_id?: string | null;
  scheduled_for?: string | null;
}
interface Comment { id: string; content: string; user_id: string; created_at: string; author?: any; is_accepted_solution?: boolean; }

const nameOf = (p: any) => p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username || "User" : "User";
const initials = (p: any) => nameOf(p).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

const Community = ({ currentUserId, isAdmin }: { currentUserId: string; isAdmin: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [postKind, setPostKind] = useState<"text" | "poll" | "link" | "story" | "doubt">("text");
  const [storyGenre, setStoryGenre] = useState("Adventure");
  const [doubtSubject, setDoubtSubject] = useState("Mathematics");
  const [doubtClass, setDoubtClass] = useState("10");
  const [doubtFilterSubject, setDoubtFilterSubject] = useState("all");
  const [doubtFilterClass, setDoubtFilterClass] = useState("all");
  const [doubtFilterStatus, setDoubtFilterStatus] = useState<"all" | "unsolved" | "solved">("all");
  const [viewingStory, setViewingStory] = useState<Post | null>(null);
  const [feedCategory, setFeedCategory] = useState<"all" | "doubts" | "stories" | "polls" | "media" | "scheduled">("all");
  
  // WhatsApp Community & Reward State
  const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/FuoV7sig8CwHEMRKvpA9A5";
  const [waRewardClaimed, setWaRewardClaimed] = useState(false);
  const [claimingWaReward, setClaimingWaReward] = useState(false);

  // Post Scheduling State
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [reschedulingPost, setReschedulingPost] = useState<Post | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2);
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const setSchedulePreset = (preset: "1h" | "tomorrow_morning" | "tomorrow_evening" | "weekend") => {
    const d = new Date();
    if (preset === "1h") {
      d.setHours(d.getHours() + 1);
    } else if (preset === "tomorrow_morning") {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (preset === "tomorrow_evening") {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
    } else if (preset === "weekend") {
      const day = d.getDay();
      const diff = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(10, 0, 0, 0);
    }
    const tzOffset = d.getTimezoneOffset() * 60000;
    setScheduledDate(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  const handlePublishNow = async (postId: string) => {
    try {
      setActionLoadingId(postId);
      const { error } = await supabase
        .from("posts")
        .update({ scheduled_for: null })
        .eq("id", postId);

      if (error) throw error;
      toast({ title: "Post Published to Community Feed! 🚀" });
      load();
    } catch (e: any) {
      toast({ title: "Failed to publish", description: e.message, variant: "destructive" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!reschedulingPost || !rescheduleDate) return;
    try {
      setActionLoadingId(reschedulingPost.id);
      const isoDate = new Date(rescheduleDate).toISOString();
      const { error } = await supabase
        .from("posts")
        .update({ scheduled_for: isoDate })
        .eq("id", reschedulingPost.id);

      if (error) throw error;
      toast({ title: "Post Rescheduled! 📅" });
      setReschedulingPost(null);
      setRescheduleDate("");
      load();
    } catch (e: any) {
      toast({ title: "Failed to reschedule", description: e.message, variant: "destructive" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const [linkUrl, setLinkUrl] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState("");
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const [statsCache, setStatsCache] = useState<Record<string, any>>({});
  const [friendshipsMap, setFriendshipsMap] = useState<Record<string, any>>({});
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileDialogUser, setProfileDialogUser] = useState<string | null>(null);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("feed");
  const [hasClubs, setHasClubs] = useState(true);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);

  // Tagging state
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagResults, setTagResults] = useState<any[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string }[]>([]);
  const tagSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Report Post State
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleReportPost = async () => {
    if (!reportingPost) return;
    setSubmittingReport(true);
    try {
      await (supabase as any).from("community_reports").insert({
        post_id: reportingPost.id,
        reporter_id: currentUserId,
        reason: reportReason,
        details: reportDetails.trim(),
      });

      toast({
        title: "Post Reported 🚩",
        description: "Thank you for helping keep our KV Sulur Digital Library community safe. Our moderators will review this post.",
      });
      setReportingPost(null);
      setReportReason("inappropriate");
      setReportDetails("");
    } catch {
      toast({
        title: "Report Submitted 🚩",
        description: "Your report has been logged for moderator review.",
      });
      setReportingPost(null);
      setReportReason("inappropriate");
      setReportDetails("");
    } finally {
      setSubmittingReport(false);
    }
  };

  const checkUserBlockStatus = async () => {
    const { data } = await supabase.from("profiles")
      .select("community_blocked_until")
      .eq("id", currentUserId)
      .maybeSingle();
    if (data?.community_blocked_until) {
      if (new Date(data.community_blocked_until).getTime() > Date.now()) {
        setBlockedUntil(data.community_blocked_until);
      } else {
        setBlockedUntil(null);
      }
    } else {
      setBlockedUntil(null);
    }
  };

  const handleModerationStrike = async () => {
    try {
      const { data: profile } = await supabase.from("profiles")
        .select("community_warn_count")
        .eq("id", currentUserId)
        .single();
      
      const nextWarnCount = (profile?.community_warn_count || 0) + 1;
      
      if (nextWarnCount >= 2) {
        const blockedUntilTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("profiles").update({
          community_warn_count: nextWarnCount,
          community_blocked_until: blockedUntilTime
        }).eq("id", currentUserId);
        
        setBlockedUntil(blockedUntilTime);
        toast({
          title: "Account Temporarily Blocked",
          description: "You have been temporarily blocked from the community for 24 hours due to multiple content policy violations.",
          variant: "destructive"
        });
      } else {
        await supabase.from("profiles").update({
          community_warn_count: nextWarnCount
        }).eq("id", currentUserId);
        
        toast({
          title: "Warning: Content Policy Violation",
          description: "Your post/comment contains blocked words. Please keep the community respectful. One more warning will result in a 24-hour block.",
          variant: "destructive"
        });
      }
    } catch (e: any) {
      console.error("Moderation check error:", e);
    }
  };

  const loadFriendshipsMap = async () => {
    if (!currentUserId) return;
    const { data } = await supabase.from("friendships")
      .select("id, requester_id, addressee_id, status, created_at, updated_at")
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);
    const m: Record<string, any> = {};
    (data || []).forEach((f: any) => {
      const other = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
      m[other] = f;
    });
    setFriendshipsMap(m);
  };

  const fetchProfileStats = async (userId: string) => {
    if (statsCache[userId]) return statsCache[userId];
    const [{ data: profRows }, { data: statsRows }, { data: awards }, { data: allBadges }, { data: actStats }] = await Promise.all([
      supabase.rpc("get_public_profiles", { _ids: [userId] }),
      supabase.rpc("get_public_profile_stats", { _id: userId }),
      supabase.from("badge_awards").select("badge_id, badges(name, icon_name, color)").eq("user_id", userId),
      supabase.from("badges").select("id, name, icon_name, color, criteria_type, criteria_value").eq("is_active", true),
      supabase.rpc("get_user_activity_stats", { _user_id: userId }),
    ]);
    const prof: any = (profRows || [])[0] || {};
    const stats: any = (statsRows || [])[0] || {};
    const act: any = (actStats || [])[0] || {};

    // Merge manually awarded badges with auto-criterion earned badges
    const manualIds = new Set((awards || []).map((a: any) => a.badge_id));
    const manualBadges = (awards || []).map((a: any) => a.badges).filter(Boolean);
    const statMap: Record<string, number> = {
      points: prof.points || 0,
      books_read: stats.books_read || 0,
      quizzes_completed: stats.quizzes || 0,
      login_streak: stats.current_streak || 0,
      posts_count: act.posts_count || 0,
      comments_count: act.comments_count || 0,
      friends_count: act.friends_count || 0,
      books_issued: act.books_issued || 0,
      reviews_count: act.reviews_count || 0,
    };
    const autoBadges = (allBadges || [])
      .filter((b: any) => !manualIds.has(b.id) && b.criteria_type && b.criteria_type !== "manual")
      .filter((b: any) => (statMap[b.criteria_type] || 0) >= (b.criteria_value || 0))
      .map((b: any) => ({ name: b.name, icon_name: b.icon_name, color: b.color }));

    const full = {
      ...prof,
      booksRead: stats.books_read || 0,
      quizzes: stats.quizzes || 0,
      streak: stats.current_streak || 0,
      longestStreak: stats.longest_streak || 0,
      badges: [...manualBadges, ...autoBadges],
    };
    setStatsCache((c) => ({ ...c, [userId]: full }));
    setProfileCache((c) => ({ ...c, [userId]: prof }));
    return full;
  };

  const load = async () => {
    setLoading(true);
    await checkUserBlockStatus();
    
    // Check WhatsApp reward status
    if (currentUserId) {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("whatsapp_reward_claimed")
          .eq("id", currentUserId)
          .maybeSingle();
        if ((prof as any)?.whatsapp_reward_claimed || localStorage.getItem(`wa_claimed_${currentUserId}`) === "true") {
          setWaRewardClaimed(true);
        }
      } catch (e) {
        console.error("Error loading WhatsApp claim status:", e);
      }
    }

    // Check if there are any book clubs
    const { count: clubCount } = await supabase.from("book_clubs").select("*", { count: 'exact', head: true }).eq("is_active", true);
    setHasClubs((clubCount || 0) > 0);

    let postsData: any[] = [];
    const doubtRes = await supabase
      .from("posts")
      .select("id, user_id, title, content, post_type, media_url, media_type, poll_ends_at, is_pinned, created_at, doubt_subject, doubt_class, doubt_status, accepted_comment_id, scheduled_for")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);

    if (doubtRes.error) {
      // Fallback query if doubt columns are not yet added to DB table
      const fallbackRes = await supabase
        .from("posts")
        .select("id, user_id, title, content, post_type, media_url, media_type, poll_ends_at, is_pinned, created_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      postsData = fallbackRes.data || [];
    } else {
      postsData = doubtRes.data || [];
    }

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }
    const ids = postsData.map((p) => p.id);
    const userIds = Array.from(new Set(postsData.map((p) => p.user_id)));
    const pollPostIds = postsData.filter((p: any) => p.post_type === "poll").map((p: any) => p.id);

    const [{ data: profs }, likesRes, commentsRes, optionsRes, votesRes] = await Promise.all([
      supabase.rpc("get_public_profiles", { _ids: userIds }),
      ids.length ? supabase.from("post_likes").select("post_id, user_id").in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("post_comments").select("post_id").in("post_id", ids) : Promise.resolve({ data: [] as any[] }),
      pollPostIds.length
        ? supabase.from("poll_options").select("id, post_id, label, sort_order").in("post_id", pollPostIds).order("sort_order")
        : Promise.resolve({ data: [] as any[] }),
      pollPostIds.length
        ? supabase.from("poll_votes").select("post_id, option_id, user_id").in("post_id", pollPostIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profs || []).map((p: any) => [p.id, p]));
    setProfileCache((c) => ({ ...c, ...Object.fromEntries((profs || []).map((p: any) => [p.id, p])) }));
    const likeMap = new Map<string, { count: number; liked: boolean }>();
    (likesRes.data || []).forEach((l: any) => {
      const e = likeMap.get(l.post_id) || { count: 0, liked: false };
      e.count++; if (l.user_id === currentUserId) e.liked = true;
      likeMap.set(l.post_id, e);
    });
    const commentMap = new Map<string, number>();
    (commentsRes.data || []).forEach((c: any) => commentMap.set(c.post_id, (commentMap.get(c.post_id) || 0) + 1));

    const voteCountByOption = new Map<string, number>();
    const myVoteByPost = new Map<string, string>();
    (votesRes.data || []).forEach((v: any) => {
      voteCountByOption.set(v.option_id, (voteCountByOption.get(v.option_id) || 0) + 1);
      if (v.user_id === currentUserId) myVoteByPost.set(v.post_id, v.option_id);
    });
    const optionsByPost = new Map<string, PollOption[]>();
    (optionsRes.data || []).forEach((o: any) => {
      const list = optionsByPost.get(o.post_id) || [];
      list.push({ id: o.id, label: o.label, sort_order: o.sort_order, votes: voteCountByOption.get(o.id) || 0 });
      optionsByPost.set(o.post_id, list);
    });

    setPosts(postsData.map((p: any) => {
      let subject = p.doubt_subject;
      let status = p.doubt_status || "unsolved";
      if (!subject && p.title && p.title.startsWith("[Doubt")) {
        const match = p.title.match(/\[Doubt\s*-\s*([^\]]+)\]/i);
        if (match) subject = match[1].trim();
      }
      return {
        ...p,
        doubt_subject: subject,
        doubt_status: status,
        author: profileMap.get(p.user_id),
        likes: likeMap.get(p.id)?.count || 0,
        liked: likeMap.get(p.id)?.liked || false,
        comment_count: commentMap.get(p.id) || 0,
        pollOptions: optionsByPost.get(p.id) || [],
        myVoteOptionId: myVoteByPost.get(p.id) || null,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { if (currentUserId) { load(); loadFriendshipsMap(); } }, [currentUserId]);

  // ── Helper: insert a notification row ──────────────────────────────────────
  const sendNotification = async (targetUserId: string, title: string, message: string, type = "info", actionLink = "") => {
    if (targetUserId === currentUserId) return; // never notify yourself
    await supabase.from("notifications").insert({
      target_user_id: targetUserId,
      sent_by: currentUserId,
      title,
      message,
      type,
      action_link: actionLink || null,
      is_read: false,
    });
  };

  // ── Helper: search taggable users ──────────────────────────────────────────
  const searchTaggable = async (q: string) => {
    if (!q.trim()) {
      // For students: show accepted friends only
      if (!isAdmin) {
        const friendIds = Object.entries(friendshipsMap)
          .filter(([, f]: any) => f.status === "accepted")
          .map(([uid]) => uid);
        if (friendIds.length === 0) { setTagResults([]); return; }
        const { data } = await supabase.rpc("get_public_profiles", { _ids: friendIds });
        setTagResults(data || []);
      } else {
        setTagResults([]);
      }
      return;
    }
    const { data } = await supabase.rpc("search_public_profiles", { _q: q.trim(), _exclude: currentUserId });
    if (!isAdmin) {
      // Students may only tag friends
      const friendIds = new Set(Object.entries(friendshipsMap).filter(([, f]: any) => f.status === "accepted").map(([uid]) => uid));
      setTagResults((data || []).filter((p: any) => friendIds.has(p.id)));
    } else {
      setTagResults(data || []);
    }
  };

  const handleTagSearchChange = (value: string) => {
    setTagSearch(value);
    if (tagSearchTimeout.current) clearTimeout(tagSearchTimeout.current);
    tagSearchTimeout.current = setTimeout(() => searchTaggable(value), 300);
  };

  const renderWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@everyone|@[a-zA-Z0-9_.-]+)/g);
    return parts.map((part, i) => {
      if (part === "@everyone") {
        return (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40">
            <AtSign className="h-3 w-3 inline" />everyone
          </span>
        );
      }
      if (part.startsWith("@") && part.length > 1) {
        return (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-xs bg-primary/15 text-primary">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const addTag = (user: any) => {
    const name = user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.username || "User";
    const tagText = user.username ? `@${user.username}` : `@${name.replace(/\s+/g, "_")}`;
    if (!taggedUsers.find(t => t.id === user.id)) {
      setTaggedUsers(prev => [...prev, { id: user.id, name }]);
      setDraft(prev => ({
        ...prev,
        content: prev.content ? `${prev.content} ${tagText} ` : `${tagText} `
      }));
    }
    setTagPopoverOpen(false);
    setTagSearch("");
    setTagResults([]);
  };

  const removeTag = (id: string) => setTaggedUsers(prev => prev.filter(t => t.id !== id));

  const createPost = async () => {
    if (blockedUntil && new Date(blockedUntil).getTime() > Date.now()) {
      toast({ title: "Action Blocked", description: "You are temporarily blocked from creating posts.", variant: "destructive" });
      return;
    }
    if (!draft.title.trim()) { toast({ title: "Add a title", variant: "destructive" }); return; }
    if ((postKind === "text" || postKind === "story") && !draft.content.trim()) { toast({ title: "Add content", variant: "destructive" }); return; }
    if (postKind === "link" && !linkUrl.trim()) { toast({ title: "Add a link URL", variant: "destructive" }); return; }
    if (postKind === "link" && !linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
      toast({ title: "Invalid URL", description: "Link URL must start with http:// or https://", variant: "destructive" });
      return;
    }
    
    // Check bad words
    if (containsBadWords(draft.title) || containsBadWords(draft.content) || (postKind === "link" && containsBadWords(linkUrl))) {
      await handleModerationStrike();
      return;
    }

    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (postKind === "poll" && cleanOptions.length < 2) {
      toast({ title: "Polls need at least 2 options", variant: "destructive" });
      return;
    }
    setUploadingPost(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (mediaFile && (postKind === "text" || postKind === "story")) {
        const ext = mediaFile.name.split(".").pop()?.toLowerCase();
        const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community-media").upload(path, mediaFile, { contentType: mediaFile.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("community-media").createSignedUrl(path, 60 * 60 * 24 * 365);
        mediaUrl = signed?.signedUrl || "";
        mediaType = mediaFile.type.startsWith("image") ? "image" : mediaFile.type.startsWith("video") ? "video" : "pdf";
      } else if (postKind === "link") {
        mediaUrl = linkUrl.trim();
        mediaType = "link";
      }
      
      const finalTitle = postKind === "story" && !draft.title.startsWith(`[${storyGenre}]`)
        ? `[${storyGenre}] ${draft.title.trim()}`
        : postKind === "doubt" && !draft.title.startsWith(`[Doubt]`)
        ? `[Doubt - ${doubtSubject}] ${draft.title.trim()}`
        : draft.title.trim();

      const postPayload: any = {
        user_id: currentUserId,
        title: finalTitle,
        content: draft.content.trim() || (postKind === "poll" ? "Poll" : ""),
        media_url: mediaUrl,
        media_type: mediaType,
        post_type: postKind,
      };
      if (postKind === "doubt") {
        postPayload.doubt_subject = doubtSubject;
        postPayload.doubt_class = doubtClass;
        postPayload.doubt_status = "unsolved";
      }
      if (isScheduling && scheduledDate) {
        postPayload.scheduled_for = new Date(scheduledDate).toISOString();
      }

      let { data: postRow, error } = await supabase.from("posts").insert(postPayload).select("id").single();
      if (error && (postKind === "doubt" || postPayload.scheduled_for)) {
        // Fallback: If DB schema doesn't have doubt or scheduled_for columns yet
        delete postPayload.doubt_subject;
        delete postPayload.doubt_class;
        delete postPayload.doubt_status;
        delete postPayload.scheduled_for;
        const retry = await supabase.from("posts").insert(postPayload).select("id").single();
        postRow = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      if (postKind === "poll" && postRow?.id) {
        const { error: optErr } = await supabase.from("poll_options").insert(
          cleanOptions.map((label, i) => ({ post_id: postRow.id, label, sort_order: i }))
        );
        if (optErr) throw optErr;
      }

      const wasScheduled = isScheduling && !!scheduledDate;
      const scheduledDisplayDate = scheduledDate ? new Date(scheduledDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";

      setDraft({ title: "", content: "" });
      setLinkUrl("");
      setPollOptions(["", ""]);
      setPostKind("text");
      setMediaFile(null);
      setIsScheduling(false);
      setScheduledDate("");
      setShowNew(false);

      // Notify tagged users
      const notifPromises: Promise<any>[] = [];
      if (isAdmin && taggedUsers.find(t => t.id === "__everyone__")) {
        // @everyone: send a broadcast (no target_user_id = null → shown to all)
        notifPromises.push(supabase.from("notifications").insert({
          target_user_id: null,
          sent_by: currentUserId,
          title: "📢 Community Announcement",
          message: `New post: "${finalTitle}"`,
          type: "info",
          is_read: false,
        }));
      } else {
        taggedUsers.forEach(t => {
          notifPromises.push(sendNotification(t.id, "📌 You were tagged in a post", `Check out: "${finalTitle}"`, "info"));
        });
      }
      await Promise.allSettled(notifPromises);
      setTaggedUsers([]);

      toast({
        title: wasScheduled
          ? "Post Scheduled! ⏱️📅"
          : postKind === "story"
          ? "Story Published! 📖✨"
          : "Posted!",
        description: wasScheduled
          ? `Will automatically go live on ${scheduledDisplayDate}. View or manage under the "Scheduled" tab.`
          : undefined,
      });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingPost(false);
    }
  };

  const handleJoinAndClaimWhatsApp = async () => {
    // Open WhatsApp link in new tab
    window.open(WHATSAPP_COMMUNITY_URL, "_blank", "noopener,noreferrer");

    if (waRewardClaimed) {
      return;
    }

    setClaimingWaReward(true);
    try {
      // 1. Attempt invoking database RPC function
      const { error: rpcErr } = await (supabase as any).rpc("claim_whatsapp_community_reward");

      if (!rpcErr) {
        setWaRewardClaimed(true);
        try { localStorage.setItem(`wa_claimed_${currentUserId}`, "true"); } catch {}
        toast({
          title: "🎉 250 Points Awarded!",
          description: "Thank you for joining the PM SHRI KV Sulur WhatsApp Community! 250 XP has been added to your profile.",
        });
        load();
        return;
      }

      // 2. Direct fallback
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("points, whatsapp_reward_claimed")
        .eq("id", currentUserId)
        .single();

      if (profErr) throw profErr;

      if ((profile as any)?.whatsapp_reward_claimed || localStorage.getItem(`wa_claimed_${currentUserId}`) === "true") {
        setWaRewardClaimed(true);
        return;
      }

      const currentPts = profile?.points || 0;
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          points: currentPts + 250,
          whatsapp_reward_claimed: true,
          whatsapp_joined_at: new Date().toISOString(),
        } as any)
        .eq("id", currentUserId);

      if (updateErr) {
        // Fallback without new columns
        await supabase
          .from("profiles")
          .update({ points: currentPts + 250 })
          .eq("id", currentUserId);
      }

      // Record notification for user
      await supabase.from("notifications").insert({
        target_user_id: currentUserId,
        sent_by: currentUserId,
        title: "🎉 250 XP WhatsApp Bonus Claimed!",
        message: "You received 250 XP for joining the KV Sulur WhatsApp Community group!",
        type: "points",
        is_read: false,
      });

      setWaRewardClaimed(true);
      try { localStorage.setItem(`wa_claimed_${currentUserId}`, "true"); } catch {}

      toast({
        title: "🎉 250 Points Awarded!",
        description: "Thank you for joining the PM SHRI KV Sulur WhatsApp Community! 250 XP has been added to your profile.",
      });
      load();
    } catch (err: any) {
      console.error("Error claiming WhatsApp points:", err);
      toast({
        title: "Notice",
        description: err.message || "Failed to reward points.",
        variant: "destructive",
      });
    } finally {
      setClaimingWaReward(false);
    }
  };

  const deletePost = async (id: string) => { await supabase.from("posts").delete().eq("id", id); toast({ title: "Deleted" }); load(); };

  const togglePin = async (post: Post) => {
    if (!isAdmin) return;
    const next = !post.is_pinned;
    const { error } = await supabase.from("posts").update({
      is_pinned: next,
      pinned_at: next ? new Date().toISOString() : null,
    }).eq("id", post.id);
    if (error) toast({ title: "Could not pin", description: error.message, variant: "destructive" });
    else {
      toast({ title: next ? "Post pinned" : "Pin removed" });
      load();
    }
  };

  const votePoll = async (post: Post, optionId: string) => {
    if (post.myVoteOptionId) {
      toast({ title: "You already voted on this poll" });
      return;
    }
    const { error } = await supabase.from("poll_votes").insert({
      post_id: post.id,
      option_id: optionId,
      user_id: currentUserId,
    });
    if (error) toast({ title: "Vote failed", description: error.message, variant: "destructive" });
    else load();
  };

  const toggleLike = async (post: Post) => {
    if (post.liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: currentUserId });
      // notify post author
      if (post.user_id !== currentUserId) {
        sendNotification(post.user_id, "❤️ Someone liked your post", `Your post "${post.title}" received a new like!`, "info");
      }
    }
    setPosts((ps) => ps.map((p) => p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase.from("post_comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (!data) return;
    const userIds = Array.from(new Set(data.map((c: any) => c.user_id)));
    const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: userIds });
    const m = new Map((profs || []).map((p: any) => [p.id, p]));
    setComments((c) => ({ ...c, [postId]: data.map((x: any) => ({ ...x, author: m.get(x.user_id) })) }));
  };
  const toggleComments = async (postId: string) => {
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    if (!comments[postId]) await loadComments(postId);
  };
  const addComment = async (postId: string) => {
    if (blockedUntil && new Date(blockedUntil).getTime() > Date.now()) {
      toast({ title: "Action Blocked", description: "You are temporarily blocked from commenting.", variant: "destructive" });
      return;
    }
    if (!commentDraft.trim()) return;
    if (containsBadWords(commentDraft)) {
      await handleModerationStrike();
      return;
    }
    await supabase.from("post_comments").insert({ post_id: postId, user_id: currentUserId, content: commentDraft });
    setCommentDraft(""); await loadComments(postId);
    setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    // notify post author
    const post = posts.find(p => p.id === postId);
    if (post && post.user_id !== currentUserId) {
      sendNotification(post.user_id, "💬 New comment on your post", `Someone replied to "${post.title}"`, "info");
    }
  };
  const deleteComment = async (postId: string, id: string) => {
    await supabase.from("post_comments").delete().eq("id", id);
    await loadComments(postId);
    setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p));
  };

  const markCommentAsSolution = async (post: Post, commentId: string, commentAuthorId: string) => {
    try {
      await supabase.from("posts").update({
        doubt_status: "solved",
        accepted_comment_id: commentId,
      }).eq("id", post.id);

      await supabase.from("post_comments").update({
        is_accepted_solution: true,
      } as any).eq("id", commentId);

      // Award +25 XP to solver if it's someone else
      if (commentAuthorId !== currentUserId) {
        await (supabase.rpc as any)("award_user_points", {
          _user_id: commentAuthorId,
          _points: 25,
          _reason: "Accepted Solution to Academic Doubt",
        });
        sendNotification(commentAuthorId, "🏆 Solution Accepted (+25 XP)!", `Your answer was marked as the accepted solution to: "${post.title}"`, "success");
      }

      toast({
        title: "Solution Accepted! 🎉",
        description: "This answer has been verified as the accepted solution.",
      });

      setPosts((ps) => ps.map((p) => p.id === post.id ? { ...p, doubt_status: "solved", accepted_comment_id: commentId } : p));
      await loadComments(post.id);
    } catch (e: any) {
      toast({ title: "Failed to mark solution", description: e.message, variant: "destructive" });
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const existing = friendshipsMap[userId];
      let data, error;
      if (existing?.id) {
        // If an existing row exists (e.g. rejected or cancelled), update it back to pending
        const res = await supabase
          .from("friendships")
          .update({
            requester_id: currentUserId,
            addressee_id: userId,
            status: "pending",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id)
          .select()
          .single();
        data = res.data;
        error = res.error;
      } else {
        // Check DB directly in case it wasn't loaded in map
        const { data: existingDb } = await supabase
          .from("friendships")
          .select("id")
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`)
          .maybeSingle();

        if (existingDb?.id) {
          const res = await supabase
            .from("friendships")
            .update({
              requester_id: currentUserId,
              addressee_id: userId,
              status: "pending",
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", existingDb.id)
            .select()
            .single();
          data = res.data;
          error = res.error;
        } else {
          const res = await supabase
            .from("friendships")
            .insert({ requester_id: currentUserId, addressee_id: userId, status: "pending" })
            .select()
            .single();
          data = res.data;
          error = res.error;
        }
      }

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      setFriendshipsMap((m) => ({ ...m, [userId]: data }));
      toast({ title: "Friend request sent!" });
      sendNotification(userId, "👋 New Friend Request", "Someone from KV Sulur DLMS sent you a friend request!", "info");
      loadFriendshipsMap();
    } catch (err: any) {
      toast({ title: "Failed to send request", description: err.message, variant: "destructive" });
    }
  };

  const respondFriendRequest = async (userId: string, status: string) => {
    try {
      const f = friendshipsMap[userId];
      let fid = f?.id;
      if (!fid) {
        const { data: found } = await supabase
          .from("friendships")
          .select("id")
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`)
          .maybeSingle();
        fid = found?.id;
      }

      if (!fid) {
        toast({ title: "Error", description: "Friend request record not found.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("friendships")
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", fid);

      if (error) throw error;

      setFriendshipsMap((m) => ({ ...m, [userId]: { ...(f || {}), id: fid, status } }));
      toast({ title: status === "accepted" ? "🎉 Friend request accepted!" : "Friend request declined" });
      if (status === "accepted") {
        sendNotification(userId, "🎉 Friend Request Accepted", "Your friend request was accepted! You are now friends.", "success");
      }
      loadFriendshipsMap();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const removeFriend = async (userId: string) => {
    try {
      const f = friendshipsMap[userId];
      let fid = f?.id;
      if (!fid) {
        const { data: found } = await supabase
          .from("friendships")
          .select("id")
          .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`)
          .maybeSingle();
        fid = found?.id;
      }

      if (fid) {
        await supabase.from("friendships").delete().eq("id", fid);
      }
      setFriendshipsMap((m) => { const c = { ...m }; delete c[userId]; return c; });
      toast({ title: "Friend removed" });
      loadFriendshipsMap();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Community</h2>
          <p className="text-sm text-muted-foreground">Share thoughts, connect with classmates & teachers</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            {hasClubs && <TabsTrigger value="clubs">Book Clubs</TabsTrigger>}
            <TabsTrigger value="survey">Suggestions Survey</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="moderation" className="text-destructive data-[state=active]:text-destructive">
                <ShieldAlert className="h-3.5 w-3.5 mr-1" />Moderation
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex gap-2">
            <Dialog open={friendsOpen} onOpenChange={setFriendsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-2" />Friends</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>My Network</DialogTitle></DialogHeader>
                <FriendsPanel
                  currentUserId={currentUserId}
                  friendshipsMap={friendshipsMap}
                  reload={loadFriendshipsMap}
                  openProfile={(id) => { setFriendsOpen(false); setProfileDialogUser(id); }}
                />
              </DialogContent>
            </Dialog>
            {activeTab === "feed" && (!blockedUntil || new Date(blockedUntil).getTime() <= Date.now()) && (
              <Button size="sm" className="gradient-primary border-0" onClick={() => setShowNew((s) => !s)}>
                <Plus className="h-4 w-4 mr-2" />New Post
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="feed" className="space-y-4">
          {blockedUntil && new Date(blockedUntil).getTime() > Date.now() && (
            <Card className="border-destructive/50 bg-destructive/5 text-destructive p-4">
              <div className="flex items-start gap-3">
                <UserX className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Community Posting Blocked</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have been temporarily suspended from posting or commenting in the community due to content policy violations.
                    Your access will be restored on: <strong>{new Date(blockedUntil).toLocaleString()}</strong>.
                  </p>
                </div>
              </div>
            </Card>
          )}

      {showNew && (!blockedUntil || new Date(blockedUntil).getTime() <= Date.now()) && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant={postKind === "text" ? "default" : "outline"} type="button" onClick={() => setPostKind("text")}>
                Post
              </Button>
              <Button size="sm" variant={postKind === "doubt" ? "default" : "outline"} type="button" onClick={() => setPostKind("doubt")} className="border-amber-500/30">
                <HelpCircle className="h-3.5 w-3.5 mr-1 text-amber-500" /> Ask Doubt
              </Button>
              <Button size="sm" variant={postKind === "story" ? "default" : "outline"} type="button" onClick={() => setPostKind("story")}>
                <Feather className="h-3.5 w-3.5 mr-1 text-amber-500" /> Story / Writing
              </Button>
              <Button size="sm" variant={postKind === "poll" ? "default" : "outline"} type="button" onClick={() => setPostKind("poll")}>
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> Poll
              </Button>
              <Button size="sm" variant={postKind === "link" ? "default" : "outline"} type="button" onClick={() => setPostKind("link")}>
                <Link2 className="h-3.5 w-3.5 mr-1" /> Link
              </Button>
            </div>
            
            {postKind === "doubt" && (
              <div className="flex items-center gap-3 flex-wrap p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <HelpCircle className="h-4 w-4" /> Academic Doubt Details:
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Class:</span>
                  <select
                    value={doubtClass}
                    onChange={(e) => setDoubtClass(e.target.value)}
                    className="text-xs h-7 px-2 rounded-lg border border-border bg-background"
                  >
                    {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Subject:</span>
                  <select
                    value={doubtSubject}
                    onChange={(e) => setDoubtSubject(e.target.value)}
                    className="text-xs h-7 px-2 rounded-lg border border-border bg-background"
                  >
                    {["Mathematics", "Science", "Physics", "Chemistry", "Biology", "Social Science", "English", "Computer Science"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {postKind === "story" && (
              <div className="flex items-center gap-2 flex-wrap pb-1">
                <span className="text-xs font-semibold text-muted-foreground">Genre / Type:</span>
                {["Adventure", "Fantasy", "Mystery", "Sci-Fi", "Poem", "Moral & Fable", "School Life", "Comedy", "Essay"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setStoryGenre(g)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      storyGenre === g
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            <Input 
              placeholder={postKind === "story" ? "Story title (e.g. The Mystery of the Old Clock)..." : "Post title..."} 
              value={draft.title} 
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} 
              maxLength={150} 
            />
            {postKind === "text" && (
              <Textarea placeholder="What's on your mind?" rows={4} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} maxLength={2000} />
            )}
            {postKind === "story" && (
              <div className="space-y-2">
                <Textarea 
                  placeholder="Write your story, chapter, poem or essay here... Let your creativity flow!" 
                  rows={8} 
                  value={draft.content} 
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })} 
                  maxLength={10000} 
                  className="font-serif leading-relaxed text-sm"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Words: {draft.content.split(/\s+/).filter(Boolean).length}</span>
                  <span>Est. read time: {Math.max(1, Math.round(draft.content.split(/\s+/).filter(Boolean).length / 180))} min</span>
                </div>
              </div>
            )}
            {postKind === "link" && (
              <div className="space-y-3">
                <Input placeholder="Link URL (e.g. https://example.com)..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                <Textarea placeholder="Optional description for the link..." rows={3} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} maxLength={500} />
              </div>
            )}
            {postKind === "poll" && (
              <div className="space-y-2">
                <Textarea placeholder="Optional description for the poll" rows={2} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} maxLength={500} />
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => setPollOptions((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))}
                      maxLength={120}
                    />
                    {pollOptions.length > 2 && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setPollOptions((prev) => [...prev, ""])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {postKind === "text" && (
                <>
                  <label htmlFor="community-media" className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-primary">
                    <Paperclip className="h-3.5 w-3.5" /> {mediaFile ? mediaFile.name : "Attach photo / video / PDF"}
                  </label>
                  <input id="community-media" type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={(e) => setMediaFile(e.target.files?.[0] || null)} />
                  {mediaFile && (
                    <button onClick={() => setMediaFile(null)} className="text-xs text-destructive hover:text-destructive/80"><X className="h-3.5 w-3.5" /></button>
                  )}
                </>
              )}

              {/* @ Tag button */}
              <Popover open={tagPopoverOpen} onOpenChange={(o) => { setTagPopoverOpen(o); if (o) searchTaggable(""); }}>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg border border-dashed border-border hover:border-primary">
                    <AtSign className="h-3.5 w-3.5" /> Tag
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Tag people</p>
                  {isAdmin && (
                    <button
                      type="button"
                      className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-400/30 flex items-center gap-2"
                      onClick={() => {
                        const existing = taggedUsers.find(t => t.id === "__everyone__");
                        if (!existing) {
                          setTaggedUsers(prev => [{ id: "__everyone__", name: "@everyone" }, ...prev.filter(t => t.id !== "__everyone__")]);
                          setDraft(prev => ({
                            ...prev,
                            content: prev.content ? `${prev.content} @everyone ` : `@everyone `
                          }));
                        }
                        setTagPopoverOpen(false);
                      }}
                    >
                      <AtSign className="h-3 w-3" /> @everyone (broadcast)
                    </button>
                  )}
                  <Input
                    placeholder="Search by name…"
                    value={tagSearch}
                    onChange={(e) => handleTagSearchChange(e.target.value)}
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {tagResults.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{isAdmin ? "Type to search all students" : "No friends found"}</p>}
                    {tagResults.map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => addTag(r)}
                        className="w-full text-left text-xs px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          {r.avatar_url && <AvatarImage src={getAvatarUrl(r.avatar_url)} />}
                          <AvatarFallback className="text-[9px] gradient-primary text-primary-foreground">{initials(r)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{r.first_name ? `${r.first_name} ${r.last_name || ""}`.trim() : r.username}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Schedule button */}
              <button
                type="button"
                onClick={() => {
                  if (!isScheduling && !scheduledDate) {
                    setSchedulePreset("1h");
                  }
                  setIsScheduling(!isScheduling);
                }}
                className={`flex items-center gap-1 text-xs transition-all px-2.5 py-1.5 rounded-lg border border-dashed font-semibold ${
                  isScheduling
                    ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {isScheduling ? "Scheduled" : "Schedule"}
              </button>

              {/* Tagged chips */}
              {taggedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 w-full mt-1">
                  {taggedUsers.map(t => (
                    <span key={t.id} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.id === "__everyone__" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30" : "bg-primary/10 text-primary border border-primary/20"}`}>
                      <AtSign className="h-2.5 w-2.5" />{t.name}
                      <button type="button" onClick={() => removeTag(t.id)} className="ml-0.5 hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setMediaFile(null); setPostKind("text"); setPollOptions(["", ""]); setTaggedUsers([]); setIsScheduling(false); setScheduledDate(""); }}>Cancel</Button>
              <Button
                size="sm"
                onClick={createPost}
                disabled={uploadingPost || (isScheduling && !scheduledDate)}
                className={isScheduling ? "bg-amber-600 hover:bg-amber-700 text-white font-bold" : ""}
              >
                {uploadingPost ? "Saving..." : isScheduling ? "Schedule Post ⏱️" : "Post"}
              </Button>
            </div>

            {/* Expandable Scheduling Box */}
            {isScheduling && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span>Schedule Release Time:</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-medium">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSchedulePreset("1h")}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-background border hover:bg-muted font-semibold text-foreground"
                    >
                      +1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulePreset("tomorrow_morning")}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-background border hover:bg-muted font-semibold text-foreground"
                    >
                      Tomorrow 9 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulePreset("tomorrow_evening")}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-background border hover:bg-muted font-semibold text-foreground"
                    >
                      Tomorrow 6 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulePreset("weekend")}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-background border hover:bg-muted font-semibold text-foreground"
                    >
                      Weekend
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    min={getMinDateTime()}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    required={isScheduling}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Private until scheduled time, then automatically published to all students & teachers.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feed Sub-filters */}
      {/* Feed Sub-filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(() => {
          const isLivePost = (p: Post) => !p.scheduled_for || new Date(p.scheduled_for).getTime() <= Date.now();
          const scheduledCount = posts.filter(p => p.scheduled_for && new Date(p.scheduled_for).getTime() > Date.now() && (p.user_id === currentUserId || isAdmin)).length;
          
          return [
            { id: "all", label: "All Posts" },
            { id: "doubts", label: "❓ Academic Doubts", count: posts.filter(p => p.post_type === "doubt" && isLivePost(p)).length },
            { id: "stories", label: "📖 Student Stories", count: posts.filter(p => p.post_type === "story" && isLivePost(p)).length },
            { id: "polls", label: "📊 Polls", count: posts.filter(p => p.post_type === "poll" && isLivePost(p)).length },
            { id: "media", label: "🖼️ Photos & PDFs", count: posts.filter(p => !!p.media_url && isLivePost(p)).length },
            ...(scheduledCount > 0 || isAdmin ? [{ id: "scheduled", label: "⏱️ Scheduled", count: scheduledCount }] : []),
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFeedCategory(cat.id as any)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                feedCategory === cat.id
                  ? "gradient-primary text-white shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {cat.label}
              {cat.count !== undefined && cat.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${feedCategory === cat.id ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}>
                  {cat.count}
                </span>
              )}
            </button>
          ));
        })()}
      </div>

      {/* Doubts Subject & Status Sub-Filter Bar */}
      {feedCategory === "doubts" && (
        <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl bg-muted/40 border border-border text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-muted-foreground">Class:</span>
            <select
              value={doubtFilterClass}
              onChange={(e) => setDoubtFilterClass(e.target.value)}
              className="text-xs h-7 px-2 rounded-lg border border-border bg-background"
            >
              <option value="all">All Classes</option>
              {["6", "7", "8", "9", "10", "11", "12"].map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-muted-foreground">Subject:</span>
            <select
              value={doubtFilterSubject}
              onChange={(e) => setDoubtFilterSubject(e.target.value)}
              className="text-xs h-7 px-2 rounded-lg border border-border bg-background"
            >
              <option value="all">All Subjects</option>
              {["Mathematics", "Science", "Physics", "Chemistry", "Biology", "Social Science", "English", "Computer Science"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="font-semibold text-muted-foreground">Status:</span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setDoubtFilterStatus("all")}
                className={`px-2 py-0.5 text-[11px] font-medium ${doubtFilterStatus === "all" ? "bg-primary text-white font-bold" : "hover:bg-muted"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDoubtFilterStatus("unsolved")}
                className={`px-2 py-0.5 text-[11px] font-medium ${doubtFilterStatus === "unsolved" ? "bg-amber-500 text-white font-bold" : "hover:bg-muted"}`}
              >
                Unsolved
              </button>
              <button
                type="button"
                onClick={() => setDoubtFilterStatus("solved")}
                className={`px-2 py-0.5 text-[11px] font-medium ${doubtFilterStatus === "solved" ? "bg-emerald-600 text-white font-bold" : "hover:bg-muted"}`}
              >
                Solved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Official WhatsApp Community Notice & Reward */}
      {feedCategory === "all" && (
        <Card className="relative overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 shadow-sm hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -mr-14 -mt-14" />
          <CardContent className="p-4 sm:p-5 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 text-[11px] font-extrabold flex items-center gap-1 shadow-xs">
                    <Pin className="h-3 w-3 fill-amber-500 text-amber-600" /> PINNED ANNOUNCEMENT
                  </Badge>
                  <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Official Community
                  </Badge>
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-[11px] border-none shadow-xs flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> +250 XP Reward
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
                    📢 Join PM SHRI KV Sulur WhatsApp Community & Claim 250 XP!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                    Stay connected with PM SHRI KV Sulur Digital Library! Get real-time updates on new book arrivals, reading leagues, live quizzes, and school events directly on WhatsApp. <strong className="text-foreground font-semibold">Join today and earn 250 bonus XP points!</strong> (Reward credited once per student/user).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-center gap-2 shrink-0">
                {waRewardClaimed ? (
                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2">
                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      250 XP Claimed · Group Member
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(WHATSAPP_COMMUNITY_URL, "_blank", "noopener,noreferrer")}
                      className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 gap-1.5 font-semibold h-9 rounded-xl"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open WhatsApp Group
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="default"
                    onClick={handleJoinAndClaimWhatsApp}
                    disabled={claimingWaReward}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all gap-2 py-5 px-5 rounded-xl border border-emerald-400/30 active:scale-95 cursor-pointer"
                  >
                    {claimingWaReward ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Claiming 250 Points...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 fill-white/20" />
                        Join Group & Claim 250 XP
                        <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (() => {
        const filteredPosts = posts.filter(p => {
          const isScheduledFuture = p.scheduled_for && new Date(p.scheduled_for).getTime() > Date.now();
          if (feedCategory === "scheduled") {
            return isScheduledFuture && (p.user_id === currentUserId || isAdmin);
          }
          if (isScheduledFuture) return false;

          if (feedCategory === "doubts") {
            if (p.post_type !== "doubt") return false;
            if (doubtFilterClass !== "all" && p.doubt_class !== doubtFilterClass) return false;
            if (doubtFilterSubject !== "all" && p.doubt_subject !== doubtFilterSubject) return false;
            if (doubtFilterStatus !== "all" && (p.doubt_status || "unsolved") !== doubtFilterStatus) return false;
            return true;
          }
          if (feedCategory === "stories") return p.post_type === "story";
          if (feedCategory === "polls") return p.post_type === "poll";
          if (feedCategory === "media") return !!p.media_url;
          return true;
        });

        if (filteredPosts.length === 0) {
          return (
            <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
              <CardContent className="p-10 text-center flex flex-col items-center justify-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Users className="h-7 w-7 opacity-80" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-1">
                  {feedCategory === "scheduled"
                    ? "No Scheduled Posts"
                    : feedCategory === "doubts"
                    ? "No Academic Doubts Yet"
                    : feedCategory === "stories"
                    ? "No Student Stories Shared Yet"
                    : feedCategory === "polls"
                    ? "No Community Polls Open"
                    : "No Community Posts Yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-5">
                  {feedCategory === "scheduled"
                    ? "You have no upcoming posts waiting to be published. Click 'Schedule' when drafting a post to set a future release time."
                    : feedCategory === "doubts"
                    ? "Have a doubt from your NCERT chapters or school subjects? Ask your classmates & teachers!"
                    : feedCategory === "stories"
                    ? "Share your book review, summary, or creative reading reflections."
                    : feedCategory === "polls"
                    ? "Create a quick poll for your peers to vote on reading preferences and library suggestions."
                    : "Be the first to share an academic question, book reflection, or announcement!"}
                </p>
                <Button
                  onClick={() => {
                    if (feedCategory === "doubts") setPostKind("doubt");
                    else if (feedCategory === "stories") setPostKind("story");
                    else if (feedCategory === "polls") setPostKind("poll");
                    setShowNew(true);
                  }}
                  className="gap-2 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  {feedCategory === "doubts" ? "Ask a Doubt" : "Create New Post"}
                </Button>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-3">
            {filteredPosts.map((p) => (
            <Card key={p.id} className="border-border/50 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <UserHoverCard userId={p.user_id} author={p.author} currentUserId={currentUserId} fetchStats={fetchProfileStats} friendship={friendshipsMap[p.user_id]} onSend={sendFriendRequest} onRespond={respondFriendRequest} onRemove={removeFriend} onView={setProfileDialogUser}>
                    <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-primary/40 transition-all">
                      {p.author?.avatar_url && <AvatarImage src={getAvatarUrl(p.author.avatar_url)} className="object-cover" />}
                      <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials(p.author)}</AvatarFallback>
                    </Avatar>
                  </UserHoverCard>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <UserHoverCard userId={p.user_id} author={p.author} currentUserId={currentUserId} fetchStats={fetchProfileStats} friendship={friendshipsMap[p.user_id]} onSend={sendFriendRequest} onRespond={respondFriendRequest} onRemove={removeFriend} onView={setProfileDialogUser}>
                          <p className="text-sm font-semibold hover:underline cursor-pointer inline-flex items-center gap-1.5 flex-wrap">
                            <span>{nameOf(p.author)}</span>
                            <RotationalWinnerBadge userId={p.user_id} size="xs" />
                            {p.author?.role && p.author.role !== "student" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 capitalize">{p.author.role}</Badge>}
                          </p>
                        </UserHoverCard>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {p.author?.username ? `@${p.author.username} · ` : ""}Class {p.author?.student_class || "—"} · {new Date(p.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap">
                        {p.scheduled_for && new Date(p.scheduled_for).getTime() > Date.now() && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] gap-1 font-bold">
                            <Clock className="h-3 w-3 text-amber-500" />
                            Scheduled: {new Date(p.scheduled_for).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </Badge>
                        )}
                        {p.scheduled_for && new Date(p.scheduled_for).getTime() > Date.now() && (p.user_id === currentUserId || isAdmin) && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                              disabled={actionLoadingId === p.id}
                              onClick={() => handlePublishNow(p.id)}
                            >
                              <Send className="h-2.5 w-2.5 mr-1" /> Publish Now
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                              disabled={actionLoadingId === p.id}
                              onClick={() => {
                                setReschedulingPost(p);
                                const d = new Date(p.scheduled_for || Date.now());
                                const tzOffset = d.getTimezoneOffset() * 60000;
                                setRescheduleDate(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
                              }}
                            >
                              <Calendar className="h-2.5 w-2.5 mr-1" /> Reschedule
                            </Button>
                          </div>
                        )}
                        {p.is_pinned && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Pin className="h-3 w-3" /> Pinned
                          </Badge>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => togglePin(p)}
                            className="text-muted-foreground hover:text-primary p-1"
                            title={p.is_pinned ? "Unpin" : "Pin to top"}
                          >
                            <Pin className={`h-4 w-4 ${p.is_pinned ? "text-primary fill-primary/20" : ""}`} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setReportingPost(p)}
                          className="text-muted-foreground hover:text-amber-600 p-1 shrink-0 transition-colors"
                          title="Report post"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                        {(p.user_id === currentUserId || isAdmin) && (
                          <button onClick={() => deletePost(p.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {p.post_type === "doubt" ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[10px] font-extrabold flex items-center gap-1">
                            <HelpCircle className="h-3 w-3" /> Class {p.doubt_class || "—"} {p.doubt_subject || "Academic"}
                          </Badge>
                          {p.doubt_status === "solved" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Solved
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              Unsolved · Needs Answer
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-extrabold text-base text-foreground mt-1">{p.title}</h3>
                        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
                          <p className="text-sm text-foreground/95 leading-relaxed whitespace-pre-wrap">
                            {renderWithMentions(p.content)}
                          </p>
                        </div>
                      </div>
                    ) : p.post_type === "story" ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
                            <Feather className="h-3 w-3" /> Original Story
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1 inline" />
                            {Math.max(1, Math.round((p.content || "").split(/\s+/).filter(Boolean).length / 180))} min read
                          </Badge>
                        </div>
                        <h3 className="font-extrabold text-base text-foreground mt-1">{p.title}</h3>
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/5 via-primary/5 to-purple-500/5 border border-primary/20 space-y-2">
                          <p className="text-sm font-serif italic text-foreground/90 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                            {p.content}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => setViewingStory(p)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> Read Full Story
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold mt-2">{p.title}</h3>
                        {p.content && p.content !== "Poll" && (
                          <p className="text-sm whitespace-pre-wrap mt-1">{renderWithMentions(p.content)}</p>
                        )}
                      </>
                    )}
                    {p.post_type === "poll" && (p.pollOptions?.length || 0) > 0 && (
                      <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" /> Poll
                          {p.myVoteOptionId ? " · you voted" : " · tap an option"}
                        </p>
                        {(() => {
                          const totalVotes = (p.pollOptions || []).reduce((s, o) => s + o.votes, 0) || 0;
                          return (p.pollOptions || []).map((opt) => {
                            const pct = totalVotes ? Math.round((opt.votes / totalVotes) * 100) : 0;
                            const mine = p.myVoteOptionId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={!!p.myVoteOptionId}
                                onClick={() => votePoll(p, opt.id)}
                                className={`w-full text-left rounded-lg border px-3 py-2 text-sm relative overflow-hidden transition-colors ${
                                  mine ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                                } ${p.myVoteOptionId ? "cursor-default" : "cursor-pointer"}`}
                              >
                                {p.myVoteOptionId && (
                                  <span
                                    className="absolute inset-y-0 left-0 bg-primary/15"
                                    style={{ width: `${pct}%` }}
                                  />
                                )}
                                <span className="relative flex items-center justify-between gap-2">
                                  <span className="font-medium">{opt.label}</span>
                                  {p.myVoteOptionId && (
                                    <span className="text-xs text-muted-foreground shrink-0">{opt.votes} · {pct}%</span>
                                  )}
                                </span>
                              </button>
                            );
                          });
                        })()}
                        {(p.pollOptions || []).some((o) => o.votes > 0) && (
                          <p className="text-[10px] text-muted-foreground">
                            {(p.pollOptions || []).reduce((s, o) => s + o.votes, 0)} vote(s)
                          </p>
                        )}
                      </div>
                    )}
                    {p.media_url && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-border/50">
                        {p.media_type === "image" && (
                          <img src={p.media_url} alt="Post media" className="w-full max-h-96 object-contain bg-muted/30" />
                        )}
                        {p.media_type === "video" && (
                          <video src={p.media_url} controls className="w-full max-h-80" />
                        )}
                        {p.media_type === "pdf" && (
                          <a href={p.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 hover:bg-muted/40 transition-colors">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="text-sm text-primary hover:underline">View Attached PDF</span>
                          </a>
                        )}
                        {p.media_type === "link" && (
                          <a href={p.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors bg-muted/10 border-l-4 border-primary">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Link2 className="h-4.5 w-4.5 text-primary shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-semibold text-primary truncate block hover:underline">{p.media_url}</span>
                                <span className="text-xs text-muted-foreground block">Click to visit external link</span>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                          </a>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                      <button onClick={() => toggleLike(p)} className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                        <Heart className={`h-4 w-4 ${p.liked ? "fill-destructive text-destructive" : ""}`} /> {p.likes}
                      </button>
                      <button onClick={() => toggleComments(p.id)} className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                        <MessageCircle className="h-4 w-4" /> {p.comment_count}
                      </button>
                    </div>
                    {openComments === p.id && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        {(comments[p.id] || []).map((c) => (
                          <div key={c.id} className={`flex items-start gap-2 p-2.5 rounded-lg border ${c.id === p.accepted_comment_id || c.is_accepted_solution ? "bg-emerald-500/10 border-emerald-500/40" : "bg-muted/40 border-transparent"}`}>
                            <UserHoverCard userId={c.user_id} author={c.author} currentUserId={currentUserId} fetchStats={fetchProfileStats} friendship={friendshipsMap[c.user_id]} onSend={sendFriendRequest} onRespond={respondFriendRequest} onRemove={removeFriend} onView={setProfileDialogUser}>
                              <Avatar className="h-6 w-6 cursor-pointer">
                                {c.author?.avatar_url && <AvatarImage src={getAvatarUrl(c.author.avatar_url)} className="object-cover" />}
                                <AvatarFallback className="text-[10px] gradient-primary text-primary-foreground">{initials(c.author)}</AvatarFallback>
                              </Avatar>
                            </UserHoverCard>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold">{nameOf(c.author)}</span>
                                <RotationalWinnerBadge userId={c.user_id} size="xs" />
                                <span className="font-normal text-muted-foreground text-[10px]">· {new Date(c.created_at).toLocaleDateString()}</span>
                                {(c.id === p.accepted_comment_id || c.is_accepted_solution) && (
                                  <Badge className="bg-emerald-500 text-white text-[9px] font-bold py-0 px-1.5 ml-auto flex items-center gap-0.5">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED SOLUTION
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs mt-0.5 leading-relaxed">{renderWithMentions(c.content)}</p>
                              {p.post_type === "doubt" && (p.user_id === currentUserId || isAdmin) && p.accepted_comment_id !== c.id && (
                                <button
                                  type="button"
                                  onClick={() => markCommentAsSolution(p, c.id, c.user_id)}
                                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline mt-1 inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Accept as Best Solution (+25 XP)
                                </button>
                              )}
                            </div>
                            {(c.user_id === currentUserId || isAdmin) && (
                              <button onClick={() => deleteComment(p.id, c.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input placeholder="Add a comment..." value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addComment(p.id); }} />
                          <Button size="sm" onClick={() => addComment(p.id)}><Send className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        );
      })()}
        </TabsContent>

        <TabsContent value="clubs" className="mt-4">
          <BookClubs userId={currentUserId} />
        </TabsContent>

        <TabsContent value="survey" className="mt-4">
          <SuggestionVoting userId={currentUserId} isAdmin={isAdmin} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="moderation" className="mt-4">
            <ReviewsModeration />
          </TabsContent>
        )}
      </Tabs>

      {/* Story Reader Dialog */}
      <Dialog open={!!viewingStory} onOpenChange={(o) => !o && setViewingStory(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-primary/20 shadow-2xl bg-card">
          {viewingStory && (
            <div className="space-y-6">
              <div className="space-y-3 border-b border-border pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-0.5">
                    <Feather className="h-3.5 w-3.5 mr-1 inline" /> Student Story
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3.5 w-3.5 mr-1 inline text-muted-foreground" />
                    {Math.max(1, Math.round((viewingStory.content || "").split(/\s+/).filter(Boolean).length / 180))} min read
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(viewingStory.created_at).toLocaleDateString(undefined, { dateStyle: "long" })}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {viewingStory.title}
                </h2>

                <div className="flex items-center gap-3 pt-1">
                  <Avatar className="h-9 w-9">
                    {viewingStory.author?.avatar_url && (
                      <AvatarImage src={getAvatarUrl(viewingStory.author.avatar_url)} />
                    )}
                    <AvatarFallback className="gradient-primary text-white text-xs font-bold">
                      {initials(viewingStory.author)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-foreground">{nameOf(viewingStory.author)}</p>
                      <RotationalWinnerBadge userId={viewingStory.user_id} size="xs" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Class {viewingStory.author?.student_class || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Story Body */}
              <div className="font-serif text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap selection:bg-amber-500/20 py-2">
                {viewingStory.content}
              </div>

              {/* Reader Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant={viewingStory.liked ? "default" : "outline"}
                  onClick={() => toggleLike(viewingStory.id)}
                  className={`h-9 px-4 rounded-xl text-xs font-bold gap-1.5 ${viewingStory.liked ? "bg-rose-500 text-white hover:bg-rose-600 border-0" : ""}`}
                >
                  <Heart className={`h-4 w-4 ${viewingStory.liked ? "fill-white" : ""}`} />
                  {viewingStory.likes} {viewingStory.likes === 1 ? "Like" : "Likes"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const id = viewingStory.id;
                    setViewingStory(null);
                    setOpenComments(id);
                    if (!comments[id]) loadComments(id);
                  }}
                  className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" /> Comments ({viewingStory.comment_count})
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!profileDialogUser} onOpenChange={(o) => !o && setProfileDialogUser(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {profileDialogUser && (
            <ProfileView
              userId={profileDialogUser}
              currentUserId={currentUserId}
              friendship={friendshipsMap[profileDialogUser]}
              onSend={sendFriendRequest}
              onRespond={respondFriendRequest}
              onRemove={removeFriend}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Report Post Dialog */}
      <Dialog open={!!reportingPost} onOpenChange={(o) => !o && setReportingPost(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5 gap-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-500" /> Report Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Reporting: <span className="font-semibold text-foreground">"{reportingPost?.title}"</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Reason for Report</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="inappropriate">⚠️ Inappropriate or Vulgar Content</option>
                <option value="spam">🚫 Spam or Unwanted Promotion</option>
                <option value="harassment">🛑 Harassment or Bullying</option>
                <option value="misinformation">❌ Misinformation / Incorrect Study Material</option>
                <option value="other">❓ Other Reason</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Additional Details (Optional)</label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Explain why this post violates community guidelines..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setReportingPost(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleReportPost}
              disabled={submittingReport}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {submittingReport ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Flag className="h-4 w-4 mr-1" />}
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Post Dialog */}
      <Dialog open={!!reschedulingPost} onOpenChange={(o) => { if (!o) setReschedulingPost(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-5 gap-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500" />
              Reschedule Publication Time
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Select a new date and time for &ldquo;{reschedulingPost?.title}&rdquo; to go live.
            </p>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground font-medium">Quick presets:</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setHours(d.getHours() + 1);
                  const tz = d.getTimezoneOffset() * 60000;
                  setRescheduleDate(new Date(d.getTime() - tz).toISOString().slice(0, 16));
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 font-semibold"
              >
                +1 Hour
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(9, 0, 0, 0);
                  const tz = d.getTimezoneOffset() * 60000;
                  setRescheduleDate(new Date(d.getTime() - tz).toISOString().slice(0, 16));
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 font-semibold"
              >
                Tomorrow 9 AM
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(18, 0, 0, 0);
                  const tz = d.getTimezoneOffset() * 60000;
                  setRescheduleDate(new Date(d.getTime() - tz).toISOString().slice(0, 16));
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 font-semibold"
              >
                Tomorrow 6 PM
              </button>
            </div>

            <input
              type="datetime-local"
              value={rescheduleDate}
              min={getMinDateTime()}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setReschedulingPost(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                disabled={!rescheduleDate || actionLoadingId === reschedulingPost?.id}
                onClick={handleRescheduleSubmit}
              >
                {actionLoadingId === reschedulingPost?.id ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

/* ============ Hover card ============ */
function UserHoverCard({ userId, author, currentUserId, fetchStats, friendship, onSend, onRespond, onRemove, onView, children }: any) {
  const [full, setFull] = useState<any>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => { if (hovered && !full) fetchStats(userId).then(setFull); }, [hovered]);

  const isSelf = userId === currentUserId;
  const status = friendship?.status;
  const iSent = friendship?.requester_id === currentUserId;

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setHovered}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 overflow-hidden border-2">
        <div className="h-16 gradient-primary" />
        <div className="p-4 -mt-8 space-y-3">
          <div className="flex items-end gap-3">
            <Avatar className="h-16 w-16 ring-4 ring-background">
              {author?.avatar_url && <AvatarImage src={getAvatarUrl(author.avatar_url)} className="object-cover" />}
              <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-lg">{initials(author)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <p className="font-bold text-sm truncate flex items-center gap-1.5 flex-wrap">
                <span>{nameOf(author)}</span>
                <RotationalWinnerBadge userId={userId} size="xs" />
              </p>
              {author?.username && <p className="text-xs text-muted-foreground truncate">@{author.username}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {author?.role && <Badge variant="secondary" className="capitalize">{author.role}</Badge>}
            {author?.student_class && <Badge variant="outline">Class {author.student_class}</Badge>}
          </div>
          {full ? (
            <>
              <div className="grid grid-cols-4 gap-1 text-center pt-1">
                <StatMini icon={<Trophy className="h-3 w-3 text-yellow-500" />} value={full.points || 0} label="pts" />
                <StatMini icon={<Flame className="h-3 w-3 text-orange-500" />} value={full.streak} label="streak" />
                <StatMini icon={<BookOpen className="h-3 w-3 text-blue-500" />} value={full.booksRead} label="books" />
                <StatMini icon={<Sparkles className="h-3 w-3 text-purple-500" />} value={full.quizzes} label="quiz" />
              </div>
              {full.badges?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {full.badges.slice(0, 4).map((b: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[9px]"><Award className="h-2.5 w-2.5 mr-0.5" />{b.name}</Badge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
          )}
          {!isSelf && (
            <div className="pt-2 border-t space-y-1.5">
              {(!friendship || status === "rejected") && (
                <Button size="sm" className="w-full h-8" onClick={() => onSend(userId)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  {status === "rejected" ? "Send Request Again" : "Add Friend"}
                </Button>
              )}
              {status === "pending" && iSent && (
                <Button size="sm" variant="outline" className="w-full h-8" disabled>
                  <Clock className="h-3.5 w-3.5 mr-1.5" />Request Sent
                </Button>
              )}
              {status === "pending" && !iSent && (
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 h-8" onClick={() => onRespond(userId, "accepted")}>
                    <Check className="h-3.5 w-3.5 mr-1" />Accept
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => onRespond(userId, "rejected")}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {status === "accepted" && (
                <div className="flex gap-1.5">
                  <Badge className="flex-1 justify-center py-1.5 bg-green-600">
                    <UserCheck className="h-3.5 w-3.5 mr-1" />Friends
                  </Badge>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => onRemove(userId)}>
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Button size="sm" variant="ghost" className="w-full h-8" onClick={() => onView(userId)}>View full profile →</Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

const StatMini = ({ icon, value, label }: any) => (
  <div className="rounded-md bg-muted/40 p-1.5">
    <div className="flex justify-center mb-0.5">{icon}</div>
    <p className="text-xs font-bold leading-none">{value}</p>
    <p className="text-[8px] text-muted-foreground mt-0.5">{label}</p>
  </div>
);

/* ============ Full profile dialog ============ */
function ProfileDialog({ userId, currentUserId, fetchStats, friendship, onSend, onRespond, onRemove, onClose }: any) {
  const [full, setFull] = useState<any>(null);
  useEffect(() => { fetchStats(userId).then(setFull); }, [userId]);
  const isSelf = userId === currentUserId;
  const status = friendship?.status;
  const iSent = friendship?.requester_id === currentUserId;

  if (!full) return <div className="p-8 text-center text-sm text-muted-foreground">Loading profile…</div>;

  return (
    <div>
      <div className="h-24 gradient-primary" />
      <div className="px-6 pb-6 -mt-12">
        <Avatar className="h-24 w-24 ring-4 ring-background mb-3">
          {full?.avatar_url && <AvatarImage src={getAvatarUrl(full.avatar_url)} className="object-cover" />}
          <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-2xl">{initials(full)}</AvatarFallback>
        </Avatar>
        <DialogHeader className="text-left space-y-1 mb-4">
          <DialogTitle className="text-xl">{nameOf(full)}</DialogTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {full.username && <p className="text-sm text-muted-foreground">@{full.username}</p>}
            {full.role && <Badge variant="secondary" className="capitalize">{full.role}</Badge>}
            {full.student_class && <Badge variant="outline">Class {full.student_class}</Badge>}
          </div>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2 mb-4">
          <BigStat icon={<Trophy className="h-4 w-4 text-yellow-500" />} value={full.points || 0} label="Points" />
          <BigStat icon={<Flame className="h-4 w-4 text-orange-500" />} value={full.streak} label="Day streak" />
          <BigStat icon={<BookOpen className="h-4 w-4 text-blue-500" />} value={full.booksRead} label="Books" />
          <BigStat icon={<Sparkles className="h-4 w-4 text-purple-500" />} value={full.quizzes} label="Quizzes" />
        </div>
        {full.badges?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Badges Earned</p>
            <div className="flex flex-wrap gap-1.5">
              {full.badges.map((b: any, i: number) => (
                <Badge key={i} variant="secondary"><Award className="h-3 w-3 mr-1" />{b.name}</Badge>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground mb-4">
          <p><span className="font-semibold text-foreground">Longest streak:</span> {full.longestStreak} days</p>
        </div>
        {!isSelf && (
          <div className="space-y-2">
            {(!friendship || status === "rejected") && (
              <Button className="w-full" onClick={() => onSend(userId)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {status === "rejected" ? "Send Request Again" : "Send Friend Request"}
              </Button>
            )}
            {status === "pending" && iSent && (
              <Button variant="outline" className="w-full" disabled>
                <Clock className="h-4 w-4 mr-2" />Request Sent
              </Button>
            )}
            {status === "pending" && !iSent && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => onRespond(userId, "accepted")}>
                  <Check className="h-4 w-4 mr-2" />Accept
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => onRespond(userId, "rejected")}>
                  <X className="h-4 w-4 mr-2" />Decline
                </Button>
              </div>
            )}
            {status === "accepted" && (
              <div className="flex gap-2">
                <Badge className="flex-1 justify-center py-2 bg-green-600 text-sm">
                  <UserCheck className="h-4 w-4 mr-2" />Friends
                </Badge>
                <Button variant="outline" onClick={() => onRemove(userId)}>
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const BigStat = ({ icon, value, label }: any) => (
  <div className="rounded-lg bg-muted/40 p-2 text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <p className="text-lg font-bold leading-none">{value}</p>
    <p className="text-[9px] text-muted-foreground mt-1">{label}</p>
  </div>
);

/* ============ Friends panel ============ */
function FriendsPanel({ currentUserId, friendshipsMap, reload, openProfile }: any) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const ids = Object.keys(friendshipsMap);
    if (ids.length === 0) { setProfiles({}); return; }
    supabase.rpc("get_public_profiles", { _ids: ids }).then(({ data }) => {
      const m: Record<string, any> = {};
      (data || []).forEach((p: any) => { m[p.id] = p; });
      setProfiles(m);
    });
  }, [friendshipsMap]);

  const search = async () => {
    if (!q.trim()) { setResults([]); return; }
    const { data, error } = await supabase.rpc("search_public_profiles", { _q: q.trim(), _exclude: currentUserId });
    if (error) toast({ title: "Search failed", description: error.message, variant: "destructive" });
    else setResults(data || []);
  };

  const sendRequest = async (userId: string) => {
    try {
      const existing = friendshipsMap[userId];
      if (existing?.id) {
        await supabase.from("friendships").update({
          requester_id: currentUserId,
          addressee_id: userId,
          status: "pending",
          updated_at: new Date().toISOString()
        } as any).eq("id", existing.id);
      } else {
        const { error } = await supabase.from("friendships").insert({ requester_id: currentUserId, addressee_id: userId });
        if (error) throw error;
      }
      toast({ title: "Friend request sent!" });
      reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };
  const respond = async (id: string, status: string) => {
    await supabase.from("friendships").update({ status }).eq("id", id); reload();
  };
  const remove = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id); reload();
  };

  const entries = Object.entries(friendshipsMap) as [string, any][];
  const accepted = entries.filter(([, f]) => f.status === "accepted");
  const incoming = entries.filter(([, f]) => f.status === "pending" && f.addressee_id === currentUserId);
  const outgoing = entries.filter(([, f]) => f.status === "pending" && f.requester_id === currentUserId);

  const Row = ({ userId, f, actions }: any) => {
    const p = profiles[userId];
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
        <Avatar className="h-10 w-10 cursor-pointer" onClick={() => openProfile(userId)}>
          {p?.avatar_url && <AvatarImage src={getAvatarUrl(p.avatar_url)} className="object-cover" />}
          <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials(p)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openProfile(userId)}>
          <p className="text-sm font-semibold truncate flex items-center gap-1.5 flex-wrap">
            <span>{nameOf(p)}</span>
            <RotationalWinnerBadge userId={userId} size="xs" />
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {p?.username ? `@${p.username} · ` : ""}Class {p?.student_class || "—"}
          </p>
        </div>
        <div className="flex gap-1">{actions}</div>
      </div>
    );
  };

  return (
    <Tabs defaultValue="friends" className="space-y-3">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="friends" className="text-xs">Friends {accepted.length > 0 && `(${accepted.length})`}</TabsTrigger>
        <TabsTrigger value="incoming" className="text-xs">Requests {incoming.length > 0 && `(${incoming.length})`}</TabsTrigger>
        <TabsTrigger value="sent" className="text-xs">Sent {outgoing.length > 0 && `(${outgoing.length})`}</TabsTrigger>
        <TabsTrigger value="discover" className="text-xs">Discover</TabsTrigger>
      </TabsList>

      <TabsContent value="friends" className="space-y-1">
        {accepted.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No friends yet — Discover people to add!</p>
          </div>
        ) : accepted.map(([uid, f]) => (
          <Row key={uid} userId={uid} f={f} actions={
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><UserX className="h-4 w-4" /></Button>
          } />
        ))}
      </TabsContent>

      <TabsContent value="incoming" className="space-y-1">
        {incoming.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No incoming requests</p> : incoming.map(([uid, f]) => (
          <Row key={uid} userId={uid} f={f} actions={
            <>
              <Button size="sm" onClick={() => respond(f.id, "accepted")}><Check className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => respond(f.id, "rejected")}><X className="h-4 w-4" /></Button>
            </>
          } />
        ))}
      </TabsContent>

      <TabsContent value="sent" className="space-y-1">
        {outgoing.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No pending requests sent</p> : outgoing.map(([uid, f]) => (
          <Row key={uid} userId={uid} f={f} actions={
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><X className="h-4 w-4" /></Button>
          } />
        ))}
      </TabsContent>

      <TabsContent value="discover" className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Search by name or @username…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
          <Button size="sm" onClick={search}><Search className="h-4 w-4" /></Button>
        </div>
        {results.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Search for classmates or teachers to connect with.</p>
        ) : (
          <div className="space-y-1">
            {results.map((r) => {
              const existing = friendshipsMap[r.id];
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60">
                  <Avatar className="h-10 w-10 cursor-pointer" onClick={() => openProfile(r.id)}>
                    {r?.avatar_url && <AvatarImage src={getAvatarUrl(r.avatar_url)} className="object-cover" />}
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">{initials(r)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openProfile(r.id)}>
                    <p className="text-sm font-semibold truncate flex items-center gap-1.5 flex-wrap">
                      <span>{nameOf(r)}</span>
                      <RotationalWinnerBadge userId={r.id} size="xs" />
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{r.username || "—"} · {r.role} · Class {r.student_class || "—"}</p>
                  </div>
                  {(!existing || existing.status === "rejected") ? (
                    <Button size="sm" onClick={() => sendRequest(r.id)}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  ) : existing.status === "accepted" ? (
                    <Badge className="bg-green-600">Friends</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
    </Tabs>
  );
}

export default Community;

