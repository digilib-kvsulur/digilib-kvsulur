
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Medal, Award, Trophy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SchoolLeaderboardEntry {
  id: string;
  first_name: string;
  last_name: string;
  student_class: string;
  admission_number: string;
  points: number;
  rank: number;
}

interface SchoolLeaderboardProps {
  currentUserId?: string;
}

const SchoolLeaderboard = ({ currentUserId }: SchoolLeaderboardProps) => {
  const [entries, setEntries] = useState<SchoolLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [schoolStats, setSchoolStats] = useState({
    totalStudents: 0,
    totalPoints: 0,
    averagePoints: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLeaderboard();
  }, [currentUserId]);

  const loadLeaderboard = async () => {
    try {
      console.log('Loading school leaderboard...');
      
      // Get all approved students with points, ordered by points
      const { data: students, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, student_class, admission_number, points')
        .eq('role', 'student')
        .eq('is_approved', true)
        .gte('points', 0) // Only include students with points >= 0
        .order('points', { ascending: false })
        .order('first_name', { ascending: true }); // Secondary sort by name for ties

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Raw school leaderboard data:', students);

      // Filter out students with null points and add rank to each entry
      const validStudents = (students || []).filter(student => 
        student.points !== null && student.points !== undefined
      );

      const rankedEntries: SchoolLeaderboardEntry[] = validStudents.map((student, index) => ({
        ...student,
        points: student.points || 0,
        rank: index + 1
      }));

      console.log('Ranked school leaderboard entries:', rankedEntries);
      setEntries(rankedEntries);

      // Calculate school statistics
      const totalStudents = rankedEntries.length;
      const totalPoints = rankedEntries.reduce((sum, entry) => sum + entry.points, 0);
      const averagePoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;

      setSchoolStats({
        totalStudents,
        totalPoints,
        averagePoints
      });

      console.log('School statistics:', { totalStudents, totalPoints, averagePoints });

      // Find current user's rank
      if (currentUserId) {
        const userEntry = rankedEntries.find(entry => entry.id === currentUserId);
        const userRank = userEntry?.rank || null;
        console.log('Current user rank:', userRank);
        setCurrentUserRank(userRank);
      }

    } catch (error) {
      console.error('Error loading school leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load school leaderboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const topThree = entries.slice(0, 3);
  const others = entries.slice(3);

  return (
    <div className="space-y-6">
      {/* Current User Rank Card */}
      {currentUserId && currentUserRank && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Trophy className="h-5 w-5" />
              Your School Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">#{currentUserRank}</div>
              <p className="text-blue-700">out of {schoolStats.totalStudents} students</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* School Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            School Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{schoolStats.totalStudents}</div>
              <p className="text-sm text-gray-600">Active Students</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{schoolStats.totalPoints}</div>
              <p className="text-sm text-gray-600">Total Points Earned</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{schoolStats.averagePoints}</div>
              <p className="text-sm text-gray-600">Average Points</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                key={entry.id} 
                className={`${getRankColor(entry.rank)} ${
                  entry.id === currentUserId ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="flex justify-center mb-3">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                        {entry.first_name.charAt(0)}{entry.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-lg">{entry.first_name} {entry.last_name}</CardTitle>
                  <CardDescription>
                    Class {entry.student_class} • {entry.admission_number}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {entry.points}
                  </div>
                  <p className="text-sm text-gray-600">points</p>
                  {entry.id === currentUserId && (
                    <Badge variant="secondary" className="mt-2">You</Badge>
                  )}
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
                    key={entry.id} 
                    className={`p-4 flex items-center gap-4 ${
                      entry.id === currentUserId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {entry.first_name.charAt(0)}{entry.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{entry.first_name} {entry.last_name}</h4>
                        {entry.id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Class {entry.student_class}</p>
                      <p className="text-xs text-gray-500">{entry.admission_number}</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {entry.points}
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

      {entries.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600">No approved students with points available for the leaderboard.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchoolLeaderboard;
