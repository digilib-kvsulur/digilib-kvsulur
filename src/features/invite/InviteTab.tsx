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
  Users, ChevronRight, ExternalLink, Sparkles, X, CheckCircle2
} from "lucide-react";
import InstagramStoryReward from "./InstagramStoryReward";

const INVITE_BASE_URL = "https://dlms.kvsulur.in/invite";
const XP_PER_INVITE = 250;
const MAX_INVITE_XP = 2500;

interface InviteTabProps {
  userId: string;
  userName?: string;
  admissionNumber?: string | null;
  inviteCode?: string | null;
}

/** Simple inline SVG QR-code substitute — renders a QR-like visual using canvas.
 *  We use a lightweight approach: encode URL in a visible box with QR hint since
 *  we can't install qrcode.react without npm. The full QR is shown via Google Charts API. */
function QRCodeDisplay({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src={qrUrl}
        alt="Invite QR Code"
        className="rounded-xl border border-border w-48 h-48 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <p className="text-xs text-muted-foreground text-center max-w-[200px] break-all">{url}</p>
    </div>
  );
}

export default function InviteTab({ userId, userName, admissionNumber: propAdmission, inviteCode: propInviteCode }: InviteTabProps) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(propInviteCode || null);
  const [admissionNumber, setAdmissionNumber] = useState<string | null>(propAdmission || null);
  const [inviteCount, setInviteCount] = useState(0);
  const [totalInviteXP, setTotalInviteXP] = useState(0);
  const [friends, setFriends] = useState<any[]>([]);
  const [inviteRewardClaimed, setInviteRewardClaimed] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Fetch current profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("invite_code, admission_number, invite_reward_claimed")
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
          const count = Number((stats as any).invite_count || 0);
          setInviteCount(count);
          setTotalInviteXP(Number((stats as any).total_xp || count * XP_PER_INVITE));
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
            .select("points_awarded, created_at, invited_user_id, profiles!student_invites_invited_user_id_fkey(first_name, last_name, admission_number)", { count: "exact" })
            .eq("inviter_id", userId);

          if (invCount !== null && invCount !== undefined) {
            setInviteCount(invCount);
            setTotalInviteXP(invCount * XP_PER_INVITE);
            if (inviteRows && inviteRows.length > 0) {
              setFriends(inviteRows.map((r: any) => ({
                first_name: r.profiles?.first_name || "Student",
                last_name: r.profiles?.last_name || "",
                admission_number: r.profiles?.admission_number || "",
                created_at: r.created_at,
                points_awarded: r.points_awarded || XP_PER_INVITE,
              })));
            }
          } else {
            // Last fallback: notifications query
            const { count: notifCount } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("target_user_id", userId)
              .ilike("title", "%Invite Reward%");
            const cnt = notifCount || 0;
            setInviteCount(cnt);
            setTotalInviteXP(cnt * XP_PER_INVITE);
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
      const { data, error } = await supabase.rpc("claim_invite_reward", { p_code: manualCode.trim() });
      if (error) {
        toast({ title: "Failed to Redeem", description: error.message || "Could not claim invite reward.", variant: "destructive" });
      } else if (data?.success) {
        toast({
          title: "🎉 +250 XP Awarded!",
          description: data.inviter_name
            ? `Successfully redeemed invite from ${data.inviter_name}! Both of you earned 250 XP.`
            : "Successfully redeemed invite! +250 XP added to your account.",
        });
        setInviteRewardClaimed(true);
        setManualCode("");
        load();
      } else {
        const reasons: Record<string, string> = {
          already_claimed: "You have already claimed an invite bonus.",
          self_invite: "You cannot redeem your own invite code / admission number.",
          invalid_code: "Invalid invite code or admission number. Please check and try again.",
          students_only: "Only students are eligible for invite rewards.",
        };
        toast({
          title: "Could Not Redeem",
          description: reasons[data?.reason] || "Invalid invite code or already claimed.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to redeem code.", variant: "destructive" });
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const codeToUse = admissionNumber || inviteCode;
  const inviteUrl = codeToUse ? `${INVITE_BASE_URL}/${codeToUse}` : null;
  const shortUrl = codeToUse ? `https://dlms.kvsulur.in/i/${codeToUse}` : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: "Link Copied!", description: "Share it with your friends." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsApp = () => {
    if (!inviteUrl) return;
    const firstName = userName?.split(" ")[0] || "your friend";
    const message = encodeURIComponent(
      `📚 Hey! I use DLMS — the Digital Library of PM SHRI KV AFS Sulur. Join me and start your reading adventure!\n\nSign in here 👇\n${inviteUrl}\n\nUse your admission number & default password to log in 🎉`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const progressPct = Math.min((totalInviteXP / MAX_INVITE_XP) * 100, 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Hero Card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PHBhdGggZD0iTTM2IDE0VjZoLTJ2OGgtOFYyaC0ydjEyaDEwem0wIDBoLTJ2OGgtOHYtOGgtMnYxMGgxMlYxNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
        <CardContent className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1">
                Invite Friends, Earn XP! 🚀
              </h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Share your unique link. When a classmate logs into DLMS for the first time using your link, you earn <strong className="text-yellow-300">+250 XP</strong> instantly!
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
              <p className="text-2xl font-extrabold text-yellow-300">{inviteCount}</p>
              <p className="text-xs text-white/70 mt-0.5">Friends Joined</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
              <p className="text-2xl font-extrabold text-yellow-300">{totalInviteXP}</p>
              <p className="text-xs text-white/70 mt-0.5">XP Earned via Invites</p>
            </div>
          </div>

          {/* Progress towards cap */}
          {inviteCount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Invite XP Progress</span>
                <span>{totalInviteXP} / {MAX_INVITE_XP} XP</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Link Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Your Invite Link
          </CardTitle>
          <CardDescription>Share this with classmates who haven't joined yet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteUrl ? (
            <>
              {/* Link display */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border/50">
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-mono text-foreground truncate select-all">
                  {inviteUrl}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0 gap-1.5 h-8 rounded-lg"
                >
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 text-green-500" /> Copied!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
                  )}
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleWhatsApp}
                  className="flex-1 min-w-[140px] gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl border-0"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Share via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1 min-w-[120px] gap-2 rounded-xl"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowQR(!showQR)}
                  className="gap-2 rounded-xl"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </Button>
              </div>

              {/* QR Code panel */}
              {showQR && (
                <div className="flex flex-col items-center gap-3 pt-4 pb-2 border-t border-border/50">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-sm font-medium">Scan to join DLMS</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowQR(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <QRCodeDisplay url={inviteUrl} />
                  <p className="text-xs text-muted-foreground text-center">
                    Students can scan this QR code to open your invite link directly
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Your invite code is being generated. Please refresh the page in a moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Were You Invited by a Classmate? Manual Redemption */}
      {!inviteRewardClaimed && (
        <Card className="border-amber-300/50 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-yellow-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-500" />
              Were You Invited by a Classmate?
            </CardTitle>
            <CardDescription>
              Missed using an invite link on first login? Enter your friend's admission number or invite code to claim your <strong>+250 XP welcome bonus</strong>! Both of you get rewarded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualRedeem} className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Friend's Admission No. (e.g. 12345) or Code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="h-10 rounded-xl font-mono text-sm uppercase"
                disabled={redeeming}
              />
              <Button
                type="submit"
                disabled={redeeming || !manualCode.trim()}
                className="h-10 px-5 rounded-xl gradient-primary text-white font-bold shrink-0 gap-1.5"
              >
                {redeeming ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Claim +250 XP
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Friends Who Joined List */}
      {friends.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Friends Who Joined ({friends.length})
              </CardTitle>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50">
                +{friends.length * XP_PER_INVITE} XP Earned
              </Badge>
            </div>
            <CardDescription>Classmates who signed up using your invite link or admission number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {friends.map((f: any, idx: number) => {
              const fullName = [f.first_name, f.last_name].filter(Boolean).join(" ") || "Classmate";
              const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "";
              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {(f.first_name || "S")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.admission_number ? `Adm: ${f.admission_number} · ` : ""}{dateStr}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 shrink-0 font-bold text-xs">
                    +{f.points_awarded || XP_PER_INVITE} XP
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Instagram Story Bonus Card (NGL-Style 1-Click Story + Screenshot Proof) */}
      <InstagramStoryReward
        userId={userId}
        userName={userName}
        admissionNumber={admissionNumber}
        inviteCode={inviteCode}
        onPointsEarned={load}
      />


      {/* How it works */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                step: "1",
                title: "Share Your Link",
                desc: "Copy your invite link or share via WhatsApp with classmates who haven't joined DLMS yet.",
                icon: Share2,
                color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
              },
              {
                step: "2",
                title: "Friend Opens Link",
                desc: "They open the invite link and land on the DLMS invite page, then log in with their admission number.",
                icon: UserPlus,
                color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
              },
              {
                step: "3",
                title: "You Earn 250 XP! 🎉",
                desc: "The moment they log in for the first time, 250 XP is instantly credited to your account!",
                icon: Zap,
                color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
              },
            ].map(({ step, title, desc, icon: Icon, color }) => (
              <div key={step} className="flex items-start gap-4 p-3 rounded-xl bg-muted/40 border border-border/30">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${color}`}>
                  {step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color.split(' ')[1]}`} />
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
            <Star className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Max reward:</strong> Earn up to <strong>{MAX_INVITE_XP} XP</strong> ({MAX_INVITE_XP / XP_PER_INVITE} invites) through the invite program. Each new student only counts once!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
