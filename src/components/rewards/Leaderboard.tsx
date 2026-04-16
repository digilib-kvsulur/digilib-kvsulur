import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Medal, Award, User } from "lucide-react";
import { LeaderboardEntry } from "@/types/rewards";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2: return <Medal className="h-5 w-5 text-gray-400" />;
    case 3: return <Award className="h-5 w-5 text-amber-600" />;
    default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1: return "from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-950/20 dark:to-amber-950/20";
    case 2: return "from-gray-50 to-slate-50 border-gray-200 dark:from-gray-950/20 dark:to-slate-950/20";
    case 3: return "from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/20 dark:to-orange-950/20";
    default: return "";
  }
};

const Leaderboard = ({ entries, currentUserId }: LeaderboardProps) => {
  const validEntries = entries.filter(e => e?.studentName && typeof e.totalPoints === 'number' && e.totalPoints >= 0);
  const topThree = validEntries.slice(0, 3);
  const others = validEntries.slice(3);

  if (validEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-base font-medium text-foreground mb-1">No rankings available</h3>
        <p className="text-sm text-muted-foreground">Start participating to see the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 - responsive podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topThree.map((entry) => (
            <div
              key={entry.id || entry.studentId}
              className={`relative p-4 rounded-xl border bg-gradient-to-b transition-all hover:shadow-md ${getRankBg(entry.rank)} ${
                entry.studentId === currentUserId ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="text-center">
                <div className="flex justify-center mb-2">{getRankIcon(entry.rank)}</div>
                <Avatar className="h-12 w-12 mx-auto mb-2">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {entry.studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-semibold text-sm text-foreground truncate">{entry.studentName}</h4>
                <p className="text-xs text-muted-foreground">Class {entry.studentClass}</p>
                <p className="text-xl font-bold text-primary mt-2">{entry.totalPoints}</p>
                <p className="text-[10px] text-muted-foreground">points</p>
                {entry.studentId === currentUserId && (
                  <Badge variant="secondary" className="mt-2 text-[10px]">You</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Others - compact list */}
      {others.length > 0 && (
        <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/30">
          {others.map((entry) => (
            <div
              key={entry.id || entry.studentId}
              className={`flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/30 ${
                entry.studentId === currentUserId ? 'bg-primary/5 border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="w-7 flex items-center justify-center shrink-0">
                {getRankIcon(entry.rank)}
              </div>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {entry.studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{entry.studentName}</span>
                  {entry.studentId === currentUserId && <Badge variant="secondary" className="text-[10px] px-1.5">You</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Class {entry.studentClass}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-primary">{entry.totalPoints}</span>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
