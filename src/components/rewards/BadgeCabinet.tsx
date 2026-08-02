import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import * as LucideIcons from "lucide-react";
import { Trophy, Lock, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (!userId) return;
    (async () => {
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
    return getStat(b.criteria_type) >= (b.criteria_value || 0);
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
