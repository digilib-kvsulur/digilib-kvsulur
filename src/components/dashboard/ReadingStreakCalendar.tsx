import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, BookOpen, Brain, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StreakCalendarProps {
  userId: string;
}

interface ActivityDay {
  date: string; // "YYYY-MM-DD"
  books: string[];
  quizzes: string[];
}

export default function ReadingStreakCalendar({ userId }: StreakCalendarProps) {
  const [activities, setActivities] = useState<Record<string, ActivityDay>>({});
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadActivities = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      const actMap: Record<string, ActivityDay> = {};

      // 1. Fetch completed books from reading history
      const { data: history } = await supabase
        .from("reading_history")
        .select("book_title, completed_date")
        .eq("user_id", userId);

      history?.forEach(h => {
        const dStr = h.completed_date.substring(0, 10);
        if (!actMap[dStr]) actMap[dStr] = { date: dStr, books: [], quizzes: [] };
        actMap[dStr].books.push(h.book_title);
      });

      // 2. Fetch completed quizzes
      const { data: quizzes } = await supabase
        .from("quiz_results")
        .select("completed_at, quizzes(title)")
        .eq("user_id", userId);

      quizzes?.forEach(q => {
        const dStr = q.completed_at.substring(0, 10);
        if (!actMap[dStr]) actMap[dStr] = { date: dStr, books: [], quizzes: [] };
        const qTitle = (q.quizzes as any)?.title || "Quiz";
        actMap[dStr].quizzes.push(qTitle);
      });

      setActivities(actMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [userId]);

  if (loading) {
    return (
      <Card className="border-border/50 h-[320px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </Card>
    );
  }

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday, etc.
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray: (Date | null)[] = [];
  // Fill initial blanks
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  // Fill dates
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(new Date(year, month, d));
  }

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const getDayDetails = (date: Date) => {
    const localDateStr = date.toLocaleDateString("en-CA"); // YYYY-MM-DD local format
    return activities[localDateStr] || null;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Stats for the displayed month
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const totalActiveDaysThisMonth = Object.keys(activities).filter(d => d.startsWith(currentMonthPrefix)).length;

  return (
    <TooltipProvider>
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Reading Activity Streak
            </CardTitle>
            <CardDescription className="text-xs">Days you read books or completed quizzes</CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={prevMonth}>&lt;</Button>
            <span className="text-xs font-semibold px-1 min-w-[80px] text-center">{monthName}</span>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={nextMonth}>&gt;</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calendar Grid */}
          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(w => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

                const details = getDayDetails(day);
                const hasBook = details && details.books.length > 0;
                const hasQuiz = details && details.quizzes.length > 0;
                const dateNum = day.getDate();

                let bgClass = "bg-muted/30 text-muted-foreground/80 hover:bg-muted/60";
                let ringClass = "";

                if (hasBook && hasQuiz) bgClass = "bg-gradient-to-br from-success/80 to-primary/80 text-white font-bold scale-105 shadow-sm";
                else if (hasBook) bgClass = "bg-success text-success-foreground font-bold scale-105 shadow-sm";
                else if (hasQuiz) bgClass = "bg-primary text-primary-foreground font-bold scale-105 shadow-sm";

                // Highlight today
                const isToday = new Date().toLocaleDateString("en-CA") === day.toLocaleDateString("en-CA");
                if (isToday) ringClass = "ring-2 ring-primary ring-offset-1";

                const dayContent = (
                  <div className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-300 ${bgClass} ${ringClass}`}>
                    {dateNum}
                  </div>
                );

                if (details) {
                  return (
                    <Tooltip key={day.toISOString()}>
                      <TooltipTrigger asChild>{dayContent}</TooltipTrigger>
                      <TooltipContent className="p-3 space-y-2 max-w-[220px]">
                        <p className="text-xs font-semibold text-center pb-1 border-b border-border/40">
                          {day.toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </p>
                        {hasBook && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-success flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> Book Completed:
                            </p>
                            {details.books.map((b, i) => (
                              <p key={i} className="text-[10px] truncate pl-4">"{b}"</p>
                            ))}
                          </div>
                        )}
                        {hasQuiz && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                              <Brain className="h-3 w-3" /> Quiz Taken:
                            </p>
                            {details.quizzes.map((q, i) => (
                              <p key={i} className="text-[10px] truncate pl-4">{q}</p>
                            ))}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={day.toISOString()}>{dayContent}</div>;
              })}
            </div>
          </div>

          {/* Legend and Stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/30 text-xs">
            <div className="flex gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-success inline-block" /> Completed Book
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" /> Taken Quiz
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-success to-primary inline-block" /> Both
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-warning" />
              {totalActiveDaysThisMonth} active day{totalActiveDaysThisMonth === 1 ? "" : "s"} this month
            </Badge>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
