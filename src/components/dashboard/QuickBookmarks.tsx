import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMarked, Clock, Star } from "lucide-react";

interface QuickBookmarksProps {
  currentBooks: any[];
  monthlyBooksRead: number;
  totalPoints: number;
}

const QuickBookmarks = ({ currentBooks, monthlyBooksRead, totalPoints }: QuickBookmarksProps) => {
  const nextMilestone = Math.ceil(totalPoints / 100) * 100;
  const pointsToMilestone = nextMilestone - totalPoints;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" /> Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5">
          <Clock className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Currently Reading</p>
            <p className="text-sm font-semibold text-foreground">{currentBooks.length} book{currentBooks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5">
          <BookMarked className="h-4 w-4 text-success" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Read This Month</p>
            <p className="text-sm font-semibold text-foreground">{monthlyBooksRead} books</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5">
          <Star className="h-4 w-4 text-warning" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Next Milestone</p>
            <p className="text-sm font-semibold text-foreground">{pointsToMilestone} pts to {nextMilestone}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickBookmarks;
