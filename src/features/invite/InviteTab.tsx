// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus, Copy, Check, Share2, QrCode, Gift, Star, Zap,
  Users, ChevronRight, ExternalLink, Sparkles, X
} from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("invite_code, admission_number")
          .eq("id", userId)
          .single();

        if (!error && profile) {
          if ((profile as any).invite_code) setInviteCode((profile as any).invite_code);
          if ((profile as any).admission_number) setAdmissionNumber((profile as any).admission_number);
        }
      } catch {
        // Fallback if invite_code column isn't created yet
        try {
          const { data: prof2 } = await supabase
            .from("profiles")
            .select("admission_number")
            .eq("id", userId)
            .single();
          if (prof2?.admission_number) setAdmissionNumber(prof2.admission_number);
        } catch {}
      }

      // Count how many students have redeemed via this user's invite
      // We approximate by checking profiles where invite_reward_claimed = true
      // and who joined after this user (since we can't track exact inviter without a join column)
      // For now, show a count from notifications of type 'points' that we sent to this user as invite rewards
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("target_user_id", userId)
        .eq("type", "points")
        .like("title", "%Invite Reward%");

      const invCount = count || 0;
      setInviteCount(invCount);
      setTotalInviteXP(invCount * XP_PER_INVITE);
    } catch (err) {
      console.error("InviteTab load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
