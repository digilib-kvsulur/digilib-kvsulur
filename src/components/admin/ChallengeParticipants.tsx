
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Users, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at?: string;
  points_earned: number;
  challenge?: {
    title: string;
    type: string;
    target_value: number;
    reward_points: number;
  };
  user?: {
    first_name: string;
    last_name: string;
    admission_number: string;
    student_class: string;
  };
}

interface Challenge {
  id: string;
  title: string;
  type: string;
  target_value: number;
}

const ChallengeParticipants = () => {
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load challenge progress with challenge and user details
      const { data: progressData, error: progressError } = await supabase
        .from('challenge_progress')
        .select(`
          *,
          challenges:challenge_id (title, type, target_value, reward_points),
          profiles:user_id (first_name, last_name, admission_number, student_class)
        `)
        .order('current_progress', { ascending: false });

      if (progressError) throw progressError;

      // Load all challenges for filter
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('id, title, type, target_value')
        .eq('is_active', true)
        .order('title');

      if (challengesError) throw challengesError;

      setChallengeProgress(progressData || []);
      setChallenges(challengesData || []);
    } catch (error) {
      console.error('Error loading challenge participants:', error);
      toast({
        title: "Error",
        description: "Failed to load challenge participants data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProgress = selectedChallenge === "all" 
    ? challengeProgress 
    : challengeProgress.filter(progress => progress.challenge_id === selectedChallenge);

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'books_read': return "bg-blue-100 text-blue-800";
      case 'quiz_completed': return "bg-green-100 text-green-800";
      case 'points_earned': return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const completedChallenges = challengeProgress.filter(p => p.is_completed).length;
  const totalParticipants = new Set(challengeProgress.map(p => p.user_id)).size;
  const averageProgress = challengeProgress.length > 0 
    ? challengeProgress.reduce((sum, p) => sum + getProgressPercentage(p.current_progress, p.challenge?.target_value || 1), 0) / challengeProgress.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <p className="text-xs text-gray-600">Students participating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Challenges</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedChallenges}</div>
            <p className="text-xs text-gray-600">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageProgress)}%</div>
            <p className="text-xs text-gray-600">Across all challenges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{challenges.length}</div>
            <p className="text-xs text-gray-600">Available to join</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Challenge Participants
              </CardTitle>
              <CardDescription>View student progress in challenges</CardDescription>
            </div>
            <div className="w-64">
              <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by challenge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Challenges</SelectItem>
                  {challenges.map((challenge) => (
                    <SelectItem key={challenge.id} value={challenge.id}>
                      {challenge.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Challenge</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Points Earned</TableHead>
                <TableHead>Completed Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProgress.map((progress) => {
                const progressPercentage = getProgressPercentage(
                  progress.current_progress, 
                  progress.challenge?.target_value || 1
                );
                
                return (
                  <TableRow key={progress.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {progress.user?.first_name} {progress.user?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {progress.user?.admission_number} - {progress.user?.student_class}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{progress.challenge?.title}</p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={getTypeColor(progress.challenge?.type || '')}
                      >
                        {progress.challenge?.type?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{progress.current_progress} / {progress.challenge?.target_value}</span>
                          <span>{Math.round(progressPercentage)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={progress.is_completed ? 'default' : 'secondary'}
                        className={
                          progress.is_completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {progress.is_completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {progress.points_earned} pts
                      </span>
                    </TableCell>
                    <TableCell>
                      {progress.completed_at 
                        ? new Date(progress.completed_at).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProgress.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No challenge participants found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChallengeParticipants;
