
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
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "border-yellow-200 bg-yellow-50";
    case 2:
      return "border-gray-200 bg-gray-50";
    case 3:
      return "border-amber-200 bg-amber-50";
    default:
      return "border-gray-200";
  }
};

const Leaderboard = ({ entries, currentUserId }: LeaderboardProps) => {
  console.log('Leaderboard entries:', entries);
  console.log('Current user ID:', currentUserId);

  // Filter out entries with invalid data
  const validEntries = entries.filter(entry => 
    entry && 
    entry.studentName && 
    typeof entry.totalPoints === 'number' &&
    entry.totalPoints >= 0
  );

  console.log('Valid leaderboard entries:', validEntries);

  const topThree = validEntries.slice(0, 3);
  const others = validEntries.slice(3);

  return (
    <div className="space-y-6">
      {/* Top 3 Rankings */}
      {topThree.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Top Performers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((entry) => (
              <Card 
                key={entry.id || entry.studentId} 
                className={`${getRankColor(entry.rank)} ${
                  entry.studentId === currentUserId ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="flex justify-center mb-3">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                        {entry.studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-lg">{entry.studentName}</CardTitle>
                  <CardDescription>
                    Class {entry.studentClass} • @{entry.username || 'no-username'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {entry.totalPoints}
                  </div>
                  <p className="text-sm text-gray-600">points</p>
                  {entry.studentId === currentUserId && (
                    <Badge variant="secondary" className="mt-2">You</Badge>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {entry.recentActivity}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Rankings */}
      {others.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Other Rankings</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {others.map((entry) => (
                  <div 
                    key={entry.id || entry.studentId} 
                    className={`p-4 flex items-center gap-4 ${
                      entry.studentId === currentUserId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {entry.studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                       <div className="flex items-center gap-2">
                        <h4 className="font-medium">{entry.studentName}</h4>
                        {entry.studentId === currentUserId && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Class {entry.studentClass}</p>
                      <p className="text-xs text-gray-500">@{entry.username || 'no-username'}</p>
                      <p className="text-xs text-gray-500">{entry.recentActivity}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {entry.totalPoints}
                      </div>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {validEntries.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rankings available</h3>
            <p className="text-gray-600">Start participating in activities to see the leaderboard!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Leaderboard;
