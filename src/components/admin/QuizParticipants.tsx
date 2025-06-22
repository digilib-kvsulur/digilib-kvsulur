
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuizResult {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  points_earned: number;
  completed_at: string;
  quiz?: {
    title: string;
    subject: string;
    difficulty: string;
  };
  user?: {
    first_name: string;
    last_name: string;
    admission_number: string;
    student_class: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
}

const QuizParticipants = () => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load quiz results with quiz and user details
      const { data: resultsData, error: resultsError } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes:quiz_id (title, subject, difficulty),
          profiles:user_id (first_name, last_name, admission_number, student_class)
        `)
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Load all quizzes for filter
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id, title, subject, difficulty')
        .eq('is_active', true)
        .order('title');

      if (quizzesError) throw quizzesError;

      setQuizResults(resultsData || []);
      setQuizzes(quizzesData || []);
    } catch (error) {
      console.error('Error loading quiz participants:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz participants data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = selectedQuiz === "all" 
    ? quizResults 
    : quizResults.filter(result => result.quiz_id === selectedQuiz);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return "bg-green-100 text-green-800";
      case 'medium': return "bg-yellow-100 text-yellow-800";
      case 'hard': return "bg-red-100 text-red-800";
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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quiz Attempts</CardTitle>
            <Trophy className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizResults.length}</div>
            <p className="text-xs text-gray-600">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Participants</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(quizResults.map(r => r.user_id)).size}
            </div>
            <p className="text-xs text-gray-600">Students participated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quizResults.length > 0 
                ? Math.round(quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length)
                : 0
              }%
            </div>
            <p className="text-xs text-gray-600">Across all quizzes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Quiz Participants
              </CardTitle>
              <CardDescription>View quiz attempts and scores by students</CardDescription>
            </div>
            <div className="w-64">
              <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by quiz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quizzes</SelectItem>
                  {quizzes.map((quiz) => (
                    <SelectItem key={quiz.id} value={quiz.id}>
                      {quiz.title}
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
                <TableHead>Quiz</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Points Earned</TableHead>
                <TableHead>Completed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {result.user?.first_name} {result.user?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {result.user?.admission_number} - {result.user?.student_class}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{result.quiz?.title}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{result.quiz?.subject}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={getDifficultyColor(result.quiz?.difficulty || '')}
                    >
                      {result.quiz?.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={getScoreColor(result.score)}
                    >
                      {result.score}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-blue-600">
                      {result.points_earned} pts
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(result.completed_at).toLocaleDateString()} {new Date(result.completed_at).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredResults.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No quiz participants found
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

export default QuizParticipants;
