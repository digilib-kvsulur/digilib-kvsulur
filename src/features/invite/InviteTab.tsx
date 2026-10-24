// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus, Copy, Check, Share2, QrCode, Gift, Star, Zap,
  Users, ChevronRight, ExternalLink, Sparkles, X, CheckCircle2,
  Award, ShieldCheck, MessageCircle, Info, TrendingUp, Flame
} from "lucide-react";
import { triggerConfetti } from "@/lib/confetti";
import InstagramStoryReward from "./InstagramStoryReward";

const INVITE_BASE_URL = "https://dlms.kvsulur.in/invite";
const XP_PER_INVITE = 250;
const MAX_INVITE_XP = 2500;
const MAX_REWARDED_INVITES = MAX_INVITE_XP / XP_PER_INVITE; // 10

const getEarnedInviteXP = (count: number) =>
  Math.min(Math.max(0, count), MAX_REWARDED_INVITES) * XP_PER_INVITE;

interface InviteTabProps {
  userId: string;
  userName?: string;
  admissionNumber?: string | null;
  inviteCode?: string | null;
  userPoints?: number | null;
}

interface TierInfo {
  name: string;
  badge: string;
  color: string;
  border: string;
  bg: string;
  nextTier?: string;
  needed: number;
}

const getTierInfo = (count: number): TierInfo => {
  if (count >= 8) {
    return {
      name: "DLMS Legend",
      badge: "👑",
      color: "text-purple-600 dark:text-purple-300",
      border: "border-purple-300 dark:border-purple-800",
      bg: "bg-purple-500/10 dark:bg-purple-950/40",
      needed: 0,
    };
  }
  if (count >= 5) {
    return {
      name: "Library Ambassador",
      badge: "🥇",
      color: "text-amber-600 dark:text-amber-300",
      border: "border-amber-300 dark:border-amber-800",
      bg: "bg-amber-500/10 dark:bg-amber-950/40",
      nextTier: "DLMS Legend",
      needed: 8 - count,
    };
  }
  if (count >= 2) {
    return {
      name: "Reading Scout",
      badge: "🥈",
      color: "text-sky-600 dark:text-sky-300",
      border: "border-sky-300 dark:border-sky-800",
      bg: "bg-sky-500/10 dark:bg-sky-950/40",
      nextTier: "Library Ambassador",
      needed: 5 - count,
    };
  }
  return {
    name: "Book Pioneer",
    badge: "🥉",
    color: "text-emerald-600 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-800",
    bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
    nextTier: "Reading Scout",
    needed: 2 - count,
  };
};

/** High-res QR code card generator with school library branding */
function QRCodeModal({
  url,
  code,
  userName,
  onClose,
}: {
  url: string;
  code: string;
  userName?: string;
  onClose: () => void;
}) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-background border border-border p-6 shadow-2xl space-y-4 text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">PM SHRI KV AFS SULUR</p>
          <h3 className="text-lg font-black text-foreground">Scan to Join DLMS 📚</h3>
          <p className="text-xs text-muted-foreground">
            Point your phone camera at this QR code to open the invitation
          </p>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
          <img
            src={qrUrl}
            alt="Invite QR Code"
            className="w-52 h-52 object-contain mx-auto rounded-lg"
          />
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
            <span>Invite Code:</span>
            <span className="text-sm font-extrabold">{code}</span>
          </div>
          {userName && (
            <p className="text-xs text-muted-foreground">
              Invited by <span className="font-semibold text-foreground">{userName}</span>
            </p>
          )}
        </div>

        <Button
          onClick={onClose}
          className="w-full h-10 rounded-xl gradient-primary text-white font-semibold"
        >
          Done
        </Button>
      </div>
    </div>
  );
}

export default function InviteTab({
  userId,
  userName,
  admissionNumber: propAdmission,
  inviteCode: propInviteCode,
  userPoints = 0,
}: InviteTabProps) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(propInviteCode || null);
  const [admissionNumber, setAdmissionNumber] = useState<string | null>(propAdmission || null);
  const [inviteCount, setInviteCount] = useState(0);
  const [totalInviteXP, setTotalInviteXP] = useState(0);
  const [friends, setFriends] = useState<any[]>([]);
  const [inviteRewardClaimed, setInviteRewardClaimed] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);

  // If a student already has points or past activity, they are an existing/old student.
  // Old students should NEVER be shown the welcome redemption card.
  const isOldStudent = Boolean(userPoints && userPoints > 0);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Fetch current profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("invite_code, admission_number, invite_reward_claimed, points")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        if (profile.invite_code) setInviteCode(profile.invite_code);
        if (profile.admission_number) setAdmissionNumber(profile.admission_number);
        setInviteRewardClaimed(Boolean(profile.invite_reward_claimed));
      }

      // 2. Fetch stats & friends using dedicated RPC get_my_invite_stats()
      let loadedFromRpc = false;
      try {
        const { data: stats, error: statsErr } = await supabase.rpc("get_my_invite_stats");
        if (!statsErr && stats) {
          loadedFromRpc = true;
          const count = Math.max(0, Number((stats as any).invite_count) || 0);
          setInviteCount(count);
          setTotalInviteXP(getEarnedInviteXP(count));
          if (Array.isArray((stats as any).friends)) {
            setFriends((stats as any).friends);
          }
          if ((stats as any).invite_reward_claimed !== undefined) {
            setInviteRewardClaimed(Boolean((stats as any).invite_reward_claimed));
          }
        }
      } catch (rpcErr) {
        console.warn("get_my_invite_stats RPC fallback:", rpcErr);
      }

      // 3. Fallback: query student_invites table directly or notifications
      if (!loadedFromRpc) {
        try {
          const { data: inviteRows, count: invCount } = await supabase
            .from("student_invites")
            .select(
              "points_awarded, created_at, invited_user_id, profiles!student_invites_invited_user_id_fkey(first_name, last_name, admission_number)",
              { count: "exact" }
            )
            .eq("inviter_id", userId);

          if (invCount !== null && invCount !== undefined) {
            const count = Math.max(0, Number(invCount) || 0);
            setInviteCount(count);
            setTotalInviteXP(getEarnedInviteXP(count));
            if (inviteRows && inviteRows.length > 0) {
              setFriends(
                inviteRows.map((r: any) => ({
                  first_name: r.profiles?.first_name || "Student",
                  last_name: r.profiles?.last_name || "",
                  admission_number: r.profiles?.admission_number || "",
                  created_at: r.created_at,
                  points_awarded: r.points_awarded || XP_PER_INVITE,
                }))
              );
            }
          }
        } catch {
          // Keep default states
        }
      }
    } catch (err) {
      console.error("InviteTab load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleManualRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("claim_invite_reward", {
        p_code: manualCode.trim(),
      });
      if (error) {
        toast({
          title: "Failed to Redeem",
          description: error.message || "Could not claim invite reward.",
          variant: "destructive",
        });
      } else if (data?.success) {
        triggerConfetti();
        toast({
          title: "🎉 +250 XP Awarded!",
          description: data.inviter_name
            ? `Welcome bonus redeemed! You and ${data.inviter_name} each earned 250 XP.`
            : "Welcome bonus redeemed! +250 XP added to your account.",
        });
        setInviteRewardClaimed(true);
        setManualCode("");
        load();
      } else {
        const reasons: Record<string, string> = {
          already_claimed: "You have already claimed an invite bonus.",
          existing_student: "Invite welcome bonuses are strictly for new students joining DLMS for the first time.",
          not_new_student: "Invite welcome bonuses are strictly for new students joining DLMS for the first time.",
          self_invite: "You cannot redeem your own invite code or admission number.",
          invalid_code: "Invalid invite code or admission number. Please check and try again.",
          students_only: "Only students are eligible for invite rewards.",
        };
        toast({
          title: "Could Not Redeem",
          description: reasons[data?.reason] || "Invalid invite code or not eligible.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to redeem code.",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const codeToUse = inviteCode || admissionNumber;
  const inviteUrl = codeToUse ? `${INVITE_BASE_URL}/${codeToUse}` : null;

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast({
        title: "Link Copied! 📋",
        description: "Share it with your classmates who haven't joined yet.",
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleWhatsApp = () => {
    if (!inviteUrl) return;
    const message = encodeURIComponent(
      `📚 Hey! I use DLMS — the Digital Library of PM SHRI KV AFS Sulur.\n\nJoin me on DLMS to track books, play reading games, and compete on our class leaderboard! 🚀\n\n👉 Click my invite link to join:\n${inviteUrl}\n\n💡 Sign in with your 5-digit Admission Number & default password Welcome@123\nYou get a +250 XP bonus on your first login! 🎉`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const handleCopyMessage = async () => {
    if (!inviteUrl) return;
    const message = `📚 Join me on DLMS (PM SHRI KV AFS Sulur Digital Library)!\n\nRead books, play quiz leagues, and earn XP together! 🚀\n\n👉 Sign in here: ${inviteUrl}\n\nUse your Admission Number & Welcome@123 to log in and get +250 XP bonus! 🎉`;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      toast({
        title: "Message Copied! 💬",
        description: "Paste it directly on Instagram, Telegram, or SMS.",
      });
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      handleCopyLink();
    }
  };

  const progressPct = Math.min((totalInviteXP / MAX_INVITE_XP) * 100, 100);
  const tier = getTierInfo(inviteCount);
  const remainingInvites = Math.max(0, MAX_REWARDED_INVITES - inviteCount);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading your invite hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* ── 1. Gamified Hero Card ────────────────────────────────────── */}
      <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white shadow-xl">
        {/* Glow & Grid Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_50%)] pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute right-12 top-6 w-36 h-36 rounded-full bg-teal-400/15 blur-2xl pointer-events-none" />

        <CardContent className="relative z-10 p-6 sm:p-8 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide">
                <span>{tier.badge}</span>
                <span>{tier.name}</span>
                <span className="text-white/60">·</span>
                <span className="text-amber-300 font-extrabold">{totalInviteXP} XP Earned</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
                Invite Friends to DLMS 🚀
              </h2>
              <p className="text-white/85 text-xs sm:text-sm leading-relaxed max-w-xl">
                Share your invite link with classmates who haven't logged in yet. When a new classmate signs in for the first time, you <strong className="text-amber-300">both earn +250 XP</strong> instantly!
              </p>
            </div>

            {/* Quick Badge / Trophy */}
            <div className="hidden sm:flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 min-w-[130px] shrink-0 text-center">
              <span className="text-3xl mb-0.5">{tier.badge}</span>
              <p className="text-xs font-bold text-white leading-tight">{tier.name}</p>
              <p className="text-[10px] text-white/70 mt-0.5">
                {inviteCount >= MAX_REWARDED_INVITES
                  ? "Max Level Reached! 👑"
                  : `${tier.needed} more to next tier`}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/15 text-center">
              <p className="text-xl sm:text-2xl font-black text-white">{inviteCount}</p>
              <p className="text-[11px] sm:text-xs text-white/75 font-medium mt-0.5">Friends Joined</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/15 text-center">
              <p className="text-xl sm:text-2xl font-black text-amber-300">+{totalInviteXP}</p>
              <p className="text-[11px] sm:text-xs text-white/75 font-medium mt-0.5">XP Credited</p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/15 text-center">
              <p className="text-xl sm:text-2xl font-black text-emerald-300">{remainingInvites}</p>
              <p className="text-[11px] sm:text-xs text-white/75 font-medium mt-0.5">Slots Remaining</p>
            </div>
          </div>

          {/* Progress towards 2,500 XP maximum reward cap */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-medium text-white/85">
              <span>Program Reward Progress ({inviteCount}/{MAX_REWARDED_INVITES} Friends)</span>
              <span className="font-bold text-amber-300">{totalInviteXP} / {MAX_INVITE_XP} XP</span>
            </div>
            <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Share Station Card ────────────────────────────────────── */}
      <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Your Personal Invite Link</CardTitle>
                <CardDescription className="text-xs">
                  Give this link or your admission number to classmates who haven't logged in yet
                </CardDescription>
              </div>
            </div>

            {codeToUse && (
              <Badge variant="outline" className="font-mono text-xs font-bold px-3 py-1 rounded-full border-primary/30 text-primary bg-primary/5">
                Code: {codeToUse}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-4">
          {inviteUrl ? (
            <>
              {/* Monospace Link Box */}
              <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-muted/60 border border-border/70 focus-within:border-primary transition-all">
                <ExternalLink className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />
                <span className="flex-1 text-xs sm:text-sm font-mono text-foreground truncate select-all">
                  {inviteUrl}
                </span>
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    copiedLink
                      ? "bg-emerald-600 text-white"
                      : "gradient-primary text-white shadow-xs"
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* 1. Share via WhatsApp */}
                <Button
                  onClick={handleWhatsApp}
                  className="h-11 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm shadow-xs border-0 gap-2"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>Share on WhatsApp</span>
                </Button>

                {/* 2. Copy Full Share Message */}
                <Button
                  variant="outline"
                  onClick={handleCopyMessage}
                  className="h-11 rounded-2xl border-border/80 font-bold text-xs sm:text-sm gap-2"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Message Copied!</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <span>Copy Full Message</span>
                    </>
                  )}
                </Button>

                {/* 3. Open QR Code Dialog */}
                <Button
                  variant="outline"
                  onClick={() => setShowQR(true)}
                  className="h-11 rounded-2xl border-border/80 font-bold text-xs sm:text-sm gap-2"
                >
                  <QrCode className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span>Show QR Code</span>
                </Button>
              </div>

              {/* Informative Hint Banner */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your friend just needs to click your link and log in with their <strong>5-digit Admission Number</strong> and default password <strong>Welcome@123</strong>. Both of you will instantly receive <strong>+250 XP</strong>!
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Your invite link is being prepared. Please refresh in a moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 3. First-Login Welcome Bonus (STRICTLY GATED to new students only) ── */}
      {!inviteRewardClaimed && !isOldStudent && (
        <Card className="rounded-3xl border-amber-300/60 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-yellow-500/10 shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500 shrink-0" />
              <CardTitle className="text-base font-bold text-foreground">
                Were You Invited by a Classmate?
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              New to DLMS? If a classmate invited you and you signed in without their link, enter their Admission Number to claim your <strong>+250 XP welcome bonus</strong>!
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleManualRedeem} className="flex flex-col sm:flex-row gap-2.5">
              <Input
                placeholder="Enter friend's Admission No. (e.g. 15383)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="h-11 rounded-2xl font-mono text-sm uppercase bg-background"
                disabled={redeeming}
              />
              <Button
                type="submit"
                disabled={redeeming || !manualCode.trim()}
                className="h-11 px-6 rounded-2xl gradient-primary text-white font-bold shrink-0 gap-2 shadow-xs"
              >
                {redeeming ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>Claim +250 XP</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── 4. Friends Who Joined Roster ────────────────────────────── */}
      <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Friends Who Joined</CardTitle>
                <CardDescription className="text-xs">
                  {friends.length > 0
                    ? `${friends.length} classmate${friends.length > 1 ? "s" : ""} joined through your invites`
                    : "Track your successful classmate invitations here"}
                </CardDescription>
              </div>
            </div>

            {friends.length > 0 && (
              <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 font-bold px-3 py-1 rounded-full text-xs">
                +{totalInviteXP} XP Earned
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {friends.length > 0 ? (
            <div className="space-y-2.5">
              {friends.map((f: any, idx: number) => {
                const fullName = [f.first_name, f.last_name].filter(Boolean).join(" ") || "Classmate";
                const initial = (f.first_name || "S")[0].toUpperCase();
                const palette = [
                  "bg-indigo-500 text-white",
                  "bg-violet-500 text-white",
                  "bg-emerald-500 text-white",
                  "bg-amber-500 text-white",
                  "bg-rose-500 text-white",
                  "bg-sky-500 text-white",
                ];
                const avatarColor = palette[idx % palette.length];
                const dateStr = f.created_at
                  ? new Date(f.created_at).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/50 hover:border-border transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${avatarColor}`}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{fullName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {f.admission_number && <span>Adm: {f.admission_number}</span>}
                          {dateStr && <span>· Joined {dateStr}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold shrink-0">
                      <Zap className="h-3.5 w-3.5" />
                      <span>+250 XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-muted/70 mx-auto flex items-center justify-center text-muted-foreground/60 shadow-inner">
                <Users className="h-8 w-8" />
              </div>

              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-base font-bold text-foreground">No Classmates Invited Yet</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Share your link with friends in class. As soon as they sign in with their admission number, they'll appear here!
                </p>
              </div>

              {/* 3 Quick Action Ideas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto pt-2 text-left">
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                  <span className="text-base">💬</span>
                  <p className="text-xs font-bold text-foreground">Class WhatsApp</p>
                  <p className="text-[11px] text-muted-foreground">Share the link in your study groups</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                  <span className="text-base">🎮</span>
                  <p className="text-xs font-bold text-foreground">Library Games</p>
                  <p className="text-[11px] text-muted-foreground">Challenge benchmates in Wordle & Book Match</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                  <span className="text-base">🏆</span>
                  <p className="text-xs font-bold text-foreground">Class Rankings</p>
                  <p className="text-[11px] text-muted-foreground">Help your section reach #1 on the leaderboard</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Instagram Story Bonus Card (NGL-Style 1-Click Story) ─── */}
      <InstagramStoryReward
        userId={userId}
        userName={userName}
        admissionNumber={admissionNumber}
        inviteCode={inviteCode}
        onPointsEarned={load}
      />

      {/* ── 6. How It Works & Fair Play Rules ──────────────────────── */}
      <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>How Invites Work</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Simple 3-step process to earn bonus points with your friends
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: "1",
                title: "Share Your Link",
                desc: "Send your invite link or admission number to a classmate who hasn't used DLMS yet.",
                color: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
              },
              {
                step: "2",
                title: "Friend Logs In",
                desc: "They open your link and log in with their 5-digit admission number and Welcome@123.",
                color: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
              },
              {
                step: "3",
                title: "Both Earn 250 XP!",
                desc: "You receive +250 XP and your friend receives +250 XP welcome bonus instantly!",
                color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
              },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${color}`}>
                  {step}
                </div>
                <h5 className="font-bold text-sm text-foreground">{title}</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Fair Play Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <p className="font-bold">Fair Play & Community Guidelines</p>
              <p className="text-amber-700 dark:text-amber-400/90">
                • <strong>New Students Only:</strong> Welcome bonuses apply strictly when a student signs in to DLMS for the first time. Existing students with library activity or points cannot claim invite rewards.
              </p>
              <p className="text-amber-700 dark:text-amber-400/90">
                • <strong>Program Limit:</strong> Each student can earn invite rewards for up to <strong>10 classmates</strong> (maximum <strong>2,500 XP</strong>) to keep school leaderboard rankings fair and competitive.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal Display */}
      {showQR && inviteUrl && (
        <QRCodeModal
          url={inviteUrl}
          code={codeToUse || ""}
          userName={userName}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}
