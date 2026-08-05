import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMonthlyReadingGoal } from "@/lib/librarySettings";

interface MonthlyGoalsWidgetProps {
  userId: string;
}

export default function MonthlyGoalsWidget({ userId }: MonthlyGoalsWidgetProps) {
  const [targetValue, setTargetValue] = useState(0);
  const [booksReadThisMonth, setBooksReadThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const monthKey = new Date().toISOString().substring(0, 7);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_reading_goal_progress" as any, {
          p_user_id: userId,
          p_month: monthKey,
        });
        if (!error && data && Array.isArray(data) && data[0]) {
          setTargetValue(Number(data[0].target_books) || 0);
          setBooksReadThisMonth(Number(data[0].books_read) || 0);
        } else {
          const goal = await fetchMonthlyReadingGoal();
          setTargetValue(goal);
          const start = `${monthKey}-01`;
          const { data: history } = await supabase
            .from("reading_history")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "approved")
            .gte("completed_date", start);
          setBooksReadThisMonth(history?.length || 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, monthKey]);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const isGoalMet = targetValue > 0 && booksReadThisMonth >= targetValue;
  const progressPercent = targetValue > 0 ? Math.min((booksReadThisMonth / targetValue) * 100, 100) : 0;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Monthly Reading Goal
          </CardTitle>
          <CardDescription className="text-xs">{monthName} · School target (set by admin)</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {targetValue <= 0 ? (
          <p className="text-sm text-muted-foreground">No school reading goal set yet.</p>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-end justify-between">
              <div className="space-y-0.5">
                <p className="text-2xl font-extrabold tracking-tight">
                  {booksReadThisMonth}{" "}
                  <span className="text-sm font-medium text-muted-foreground">/ {targetValue} books</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {isGoalMet ? "Goal met! Outstanding job!" : `${targetValue - booksReadThisMonth} books to reach the school goal`}
                </p>
              </div>
              {isGoalMet && (
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                </div>
              )}
            </div>
            <Progress value={progressPercent} className={`h-2.5 ${isGoalMet ? "bg-yellow-100" : ""}`} indicatorClassName={isGoalMet ? "bg-yellow-500" : "bg-primary"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
