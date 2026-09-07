import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import * as LucideIcons from "lucide-react";
import { Trophy, Lock, Award, Crown, Calendar, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveRotationalCycle, VerifiedWinnerRecord, VerifiedRotationalCycle } from "@/lib/rotationalBadgeService";

interface BadgeCabinetProps { userId: string; }
interface BadgeRow { id: string; name: string; description?: string; icon_name?: string; color?: string; points: number; criteria_type?: string; criteria_value?: number; is_active: boolean; }

const iconFor = (name?: string) => {
  const key = (name || "Award") as keyof typeof LucideIcons;
  const Cmp = (LucideIcons as any)[key];
  return Cmp || Award;
};

export default function BadgeCabinet({ userId }: BadgeCabinetProps) {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [awards, setAwards] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    points: 0,
    booksRead: 0,
    quizzes: 0,
    streak: 0,
    postsCount: 0,
    commentsCount: 0,
    friendsCount: 0,
    booksIssued: 0,
    reviewsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [rotationalAward, setRotationalAward] = useState<{
    winner: VerifiedWinnerRecord;
    cycle: VerifiedRotationalCycle;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      // Also fetch rotational award status
      getActiveRotationalCycle().then((c) => {
        if (c?.winners) {
          const w = c.winners.find((x) => x.studentId === userId);
          if (w) setRotationalAward({ winner: w, cycle: c });
        }
      });

      const [{ data: bs }, { data: aw }, { data: profile }, { count: books }, { count: quizzes }, { data: streak }, { data: actStats }] = await Promise.all([
        supabase.from("badges").select("*").eq("is_active", true).order("points"),
        supabase.from("badge_awards").select("badge_id").eq("user_id", userId),
        supabase.from("profiles").select("points").eq("id", userId).maybeSingle(),
        supabase.from("reading_history").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "approved"),
        supabase.from("quiz_results").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("login_streaks").select("current_streak").eq("user_id", userId).maybeSingle(),
        supabase.rpc("get_user_activity_stats", { _user_id: userId }),
      ]);
      const act: any = ((actStats as any) || [])[0] || {};
      setBadges((bs as any) || []);
      setAwards(new Set((aw || []).map((a: any) => a.badge_id)));
      setStats({
        points: profile?.points || 0,
        booksRead: books || 0,
        quizzes: quizzes || 0,
        streak: streak?.current_streak || 0,
        postsCount: act.posts_count || 0,
        commentsCount: act.comments_count || 0,
        friendsCount: act.friends_count || 0,
        booksIssued: act.books_issued || 0,
        reviewsCount: act.reviews_count || 0
      });
      setLoading(false);
    })();
  }, [userId]);

  const getStat = (t?: string) => {
    if (t === "points") return stats.points;
    if (t === "books_read") return stats.booksRead;
    if (t === "quizzes_completed") return stats.quizzes;
    if (t === "login_streak") return stats.streak;
    if (t === "posts_count") return stats.postsCount;
    if (t === "comments_count") return stats.commentsCount;
    if (t === "friends_count") return stats.friendsCount;
    if (t === "books_issued") return stats.booksIssued;
    if (t === "reviews_count") return stats.reviewsCount;
    return 0;
  };

  if (loading) return <Card><CardContent className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></CardContent></Card>;

  const isUnlocked = (b: BadgeRow) => {
    if (awards.has(b.id)) return true;
    if (b.criteria_type === "manual" || !b.criteria_type) return false;
    const target = b.criteria_value ?? 0;
    if (target <= 0) return false;
    return getStat(b.criteria_type) >= target;
  };

  const unlockedCount = badges.filter(isUnlocked).length;

  return (
    <div className="space-y-6">
      <Card className="border-border/50 overflow-hidden bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <CardTitle className="text-xl flex items-center justify-center sm:justify-start gap-2"><Trophy className="h-6 w-6 text-yellow-500" /> Badge Cabinet</CardTitle>
            <CardDescription>Earn badges by reading, quizzes, streaks & admin awards.</CardDescription>
          </div>
          <div className="bg-background px-4 py-2.5 rounded-xl border shadow-sm text-center">
            <span className="text-2xl font-bold text-primary">{unlockedCount}</span>
            <span className="text-muted-foreground text-xs"> / {badges.length} Unlocked</span>
          </div>
        </CardContent>
      </Card>

      {rotationalAward && (
        <Card className={`overflow-hidden border-2 shadow-md ${
          rotationalAward.winner.badgeType === "best_library_user"
            ? "border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/15"
            : "border-indigo-500/50 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-indigo-500/15"
        }`}>
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                rotationalAward.winner.badgeType === "best_library_user"
                  ? "bg-amber-500 text-white"
                  : "bg-indigo-600 text-white"
              }`}>
                {rotationalAward.winner.badgeType === "best_library_user" ? (
                  <Crown className="h-7 w-7" />
                ) : (
                  <Award className="h-7 w-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={
                    rotationalAward.winner.badgeType === "best_library_user"
                      ? "bg-amber-500 text-white font-bold text-[10px]"
                      : "bg-indigo-600 text-white font-bold text-[10px]"
                  }>
                    {rotationalAward.winner.badgeType === "best_library_user"
                      ? "👑 Best Library User"
                      : "📚 Reader of the Month"}
                  </Badge>
                  <span className="text-xs font-bold text-foreground">
                    {rotationalAward.cycle.cycleLabel} Holder
                  </span>
                </div>
                <p className="text-sm font-black text-foreground mt-1">
                  Awarded for {rotationalAward.winner.scopeValue}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                  <span>{rotationalAward.winner.points} XP Earned</span>
                  <span>•</span>
                  <span>{rotationalAward.winner.booksIssuedCount} Books Borrowed</span>
                  <span>•</span>
                  <span>Score: {rotationalAward.winner.compositeScore}</span>
                </p>
              </div>
            </div>

            <div className="bg-background/80 backdrop-blur-xs p-3 rounded-xl border border-border/80 text-xs shrink-0 sm:text-right w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Physical Badge Collection
              </span>
              <span className="font-black text-primary text-xs flex items-center gap-1 sm:justify-end mt-0.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(rotationalAward.cycle.settings.collectionDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate max-w-[200px] mt-0.5" title={rotationalAward.cycle.settings.collectionVenue}>
                {rotationalAward.cycle.settings.collectionVenue}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {badges.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No badges configured yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(b => {
            const Icon = iconFor(b.icon_name);
            const unlocked = isUnlocked(b);
            const target = b.criteria_value || 1;
            const val = b.criteria_type === "manual" ? (awards.has(b.id) ? 1 : 0) : getStat(b.criteria_type);
            const progress = b.criteria_type === "manual" ? (awards.has(b.id) ? 100 : 0) : Math.min((val / target) * 100, 100);

            return (
              <Card key={b.id} className={`transition-all relative overflow-hidden group hover:shadow-md ${unlocked ? 'border-yellow-200/50 bg-gradient-to-br from-yellow-50/30 to-amber-50/10 dark:from-yellow-950/5' : 'border-border/40 opacity-85'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl shrink-0 ${unlocked ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                      {unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-6 w-6 opacity-60" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`font-semibold text-sm truncate ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{b.name}</h4>
                        {unlocked && <Badge className="bg-yellow-500 text-[10px] text-white">+{b.points} XP</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{b.description || (b.criteria_type === "manual" ? "Awarded by admin" : "")}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-2 space-y-1.5 border-t border-border/30">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>{unlocked ? "Completed" : b.criteria_type === "manual" ? "Awarded by admin" : "Progress"}</span>
                      {b.criteria_type !== "manual" && <span>{val} / {target}</span>}
                    </div>
                    <Progress value={progress} className={`h-1.5 ${unlocked ? 'bg-yellow-100 dark:bg-yellow-950' : ''}`} indicatorClassName={unlocked ? 'bg-yellow-500' : 'bg-primary'} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
