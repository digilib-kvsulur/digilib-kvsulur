import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Trophy, Edit3, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MonthlyGoalsWidgetProps {
  userId: string;
}

export default function MonthlyGoalsWidget({ userId }: MonthlyGoalsWidgetProps) {
  const [goal, setGoal] = useState<any>(null);
  const [targetInput, setTargetInput] = useState<number>(3);
  const [isEditing, setIsEditing] = useState(false);
  const [booksReadThisMonth, setBooksReadThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const currentMonthYear = new Date().toISOString().substring(0, 7); // e.g. "2026-07"
  const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  const loadData = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // Load monthly goal
      const { data: goalData } = await supabase
        .from("monthly_reading_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("month_year", currentMonthYear)
        .maybeSingle();

      if (goalData) {
        setGoal(goalData);
        setTargetInput(goalData.target_books);
      } else {
        setGoal(null);
      }

      // Count books read in current month
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const { data: history } = await supabase
        .from("reading_history")
        .select("id")
        .eq("user_id", userId)
        .gte("completed_date", startOfMonth);

      setBooksReadThisMonth(history?.length || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleSaveGoal = async () => {
    if (targetInput <= 0) {
      toast({ title: "Invalid Goal", description: "Goal must be at least 1 book.", variant: "destructive" });
      return;
    }
    try {
      if (goal) {
        // Update existing goal
        const { error } = await supabase
          .from("monthly_reading_goals")
          .update({ target_books: targetInput })
          .eq("id", goal.id);
        if (error) throw error;
        toast({ title: "Goal Updated", description: `Your reading goal is now ${targetInput} books.` });
      } else {
        // Insert new goal
        const { error } = await supabase
          .from("monthly_reading_goals")
          .insert({
            user_id: userId,
            month_year: currentMonthYear,
            target_books: targetInput,
          });
        if (error) throw error;
        toast({ title: "Goal Created", description: `Good luck reading ${targetInput} books this month!` });
      }
      setIsEditing(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const targetValue = goal?.target_books || 0;
  const isGoalMet = targetValue > 0 && booksReadThisMonth >= targetValue;
  const progressPercent = targetValue > 0 ? Math.min((booksReadThisMonth / targetValue) * 100, 100) : 0;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Monthly Reading Goal
          </CardTitle>
          <CardDescription className="text-xs">{monthName}</CardDescription>
        </div>
        {!isEditing && targetValue > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditing(true)}>
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing || targetValue === 0 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="target" className="text-xs">How many books do you want to read this month?</Label>
              <div className="flex gap-2">
                <Input
                  id="target"
                  type="number"
                  min={1}
                  max={30}
                  value={targetInput}
                  onChange={e => setTargetInput(parseInt(e.target.value) || 0)}
                  className="h-9"
                />
                <Button size="sm" className="h-9" onClick={handleSaveGoal}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-end justify-between">
              <div className="space-y-0.5">
                <p className="text-2xl font-extrabold text-foreground tracking-tight">
                  {booksReadThisMonth} <span className="text-sm font-medium text-muted-foreground">/ {targetValue} books</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {isGoalMet ? "Goal met! Outstanding job! 🎉" : `${targetValue - booksReadThisMonth} books to reach your goal`}
                </p>
              </div>
              {isGoalMet && (
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center animate-bounce">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                </div>
              )}
            </div>

            <Progress
              value={progressPercent}
              className={`h-2.5 ${isGoalMet ? 'bg-yellow-100' : ''}`}
              indicatorClassName={isGoalMet ? 'bg-yellow-500' : 'bg-primary'}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
