import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const tips = [
  "📚 Try reading for just 15 minutes before bed — it reduces stress by 68%!",
  "🧠 Discussing books with friends boosts comprehension by 40%.",
  "✍️ Keep a reading journal to track your favorite quotes and ideas.",
  "🎯 Set a monthly reading goal — students who do read 3x more!",
  "⭐ Rate every book you finish to help your classmates find great reads.",
  "🔥 Maintain your login streak to earn bonus points every week!",
  "📖 Mix fiction and non-fiction to become a well-rounded reader.",
  "🏆 Complete challenges to earn special badges and climb the leaderboard!",
  "💡 Preview a book's first chapter before borrowing — it saves time!",
  "🎮 Take quizzes after reading to test your understanding and earn XP.",
];

const DailyTip = () => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const day = new Date().getDate();
    setTipIndex(day % tips.length);
  }, []);

  const nextTip = () => setTipIndex((prev) => (prev + 1) % tips.length);

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="h-1 gradient-primary" />
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Daily Tip</p>
            <p className="text-xs text-foreground leading-relaxed">{tips[tipIndex]}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={nextTip}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyTip;
