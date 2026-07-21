import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Play, Pause, Trophy, FileText, Upload } from "lucide-react";
import { Quiz } from "@/types/quiz";
import { QuizForm } from "./QuizForm";
import BulkImportQuiz from "./BulkImportQuiz";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuizResult {
  id: string;
  score: number;
  points_earned: number;
  completed_at: string;
  answers: any;
  quiz_id: string;
  user_id: string;
  quizzes?: {
    title: string;
    subject: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    admission_number: string;
    student_class: string;
  };
}

const QuizManager = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadQuizzes();
    loadQuizResults();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading quizzes:', error);
        toast({
          title: "Error",
          description: "Failed to load quizzes",
          variant: "destructive",
        });
        return;
      }

      // Transform data to match Quiz interface
      const transformedQuizzes: Quiz[] = (data || []).map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || '',
        subject: quiz.subject,
        difficulty: quiz.difficulty as 'easy' | 'medium' | 'hard',
        questions: quiz.questions as any[],
        timeLimit: quiz.time_limit,
        pointsReward: quiz.points_reward,
        isActive: quiz.is_active || false,
        createdAt: quiz.created_at || new Date().toISOString(),
        createdBy: quiz.created_by
      }));

      setQuizzes(transformedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizResults = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quizzes (title, subject)
        `)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error loading quiz results:', error);
        toast({
          title: "Error",
          description: "Failed to load quiz results",
          variant: "destructive",
        });
        return;
      }

      // Manually fetch profile data for each result
      const resultsWithProfiles = await Promise.all(
        (data || []).map(async (result) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, admission_number, student_class')
            .eq('id', result.user_id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }

          return {
            ...result,
            profiles: profileData ? {
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              admission_number: profileData.admission_number || '',
              student_class: profileData.student_class || ''
            } : undefined
          };
        })
      );

      setQuizResults(resultsWithProfiles);
    } catch (error) {
      console.error('Error loading quiz results:', error);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setShowQuizForm(true);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setShowQuizForm(true);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });

      loadQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: "Failed to delete quiz",
        variant: "destructive",
      });
    }
  };

  const handleToggleQuizStatus = async (quizId: string) => {
    try {
      const quiz = quizzes.find(q => q.id === quizId);
      if (!quiz) return;

      const { error } = await supabase
        .from('quizzes')
        .update({ is_active: !quiz.isActive })
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quiz ${!quiz.isActive ? 'activated' : 'deactivated'}`,
      });

      loadQuizzes();
    } catch (error) {
      console.error('Error toggling quiz status:', error);
      toast({
        title: "Error",
        description: "Failed to update quiz status",
        variant: "destructive",
      });
    }
  };

  const handleQuizSaved = async (quiz: Quiz) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const quizData = {
        title: quiz.title,
        description: quiz.description,
        subject: quiz.subject,
        difficulty: quiz.difficulty,
        time_limit: quiz.timeLimit,
        points_reward: quiz.pointsReward,
        questions: quiz.questions as any, // Cast to Json type
        is_active: quiz.isActive,
        created_by: user.id
      };

      if (editingQuiz) {
        const { error } = await supabase
          .from('quizzes')
          .update(quizData)
          .eq('id', editingQuiz.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Quiz updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('quizzes')
          .insert(quizData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Quiz created successfully",
        });
      }

      setShowQuizForm(false);
      setEditingQuiz(null);
      loadQuizzes();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showQuizForm) {
    return (
      <QuizForm
        quiz={editingQuiz}
        onSave={handleQuizSaved}
        onCancel={() => {
          setShowQuizForm(false);
          setEditingQuiz(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quiz Management</h2>
        <Button onClick={handleCreateQuiz} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Quiz
        </Button>
      </div>

      <Tabs defaultValue="quizzes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quizzes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Quiz Results
          </TabsTrigger>
          <TabsTrigger value="bulk-import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes">
          <div className="grid gap-6">
            {quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {quiz.title}
                        <Badge variant={quiz.isActive ? "default" : "secondary"}>
                          {quiz.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className={
                          quiz.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                          quiz.difficulty === 'medium' ? 'border-yellow-500 text-yellow-700' :
                          'border-red-500 text-red-700'
                        }>
                          {quiz.difficulty}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{quiz.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleQuizStatus(quiz.id)}
                      >
                        {quiz.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuiz(quiz)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Subject:</span> {quiz.subject}
                    </div>
                    <div>
                      <span className="font-medium">Time Limit:</span> {quiz.timeLimit} min
                    </div>
                    <div>
                      <span className="font-medium">Points:</span> {quiz.pointsReward}
                    </div>
                    <div>
                      <span className="font-medium">Questions:</span> {quiz.questions.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {quizzes.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes created yet</h3>
                  <p className="text-gray-600 mb-4">Create your first quiz to get started with interactive learning.</p>
                  <Button onClick={handleCreateQuiz} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Quiz Results
              </CardTitle>
              <CardDescription>View all quiz attempts and scores</CardDescription>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Points Earned</TableHead>
                      <TableHead>Completed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {result.profiles?.first_name || 'Unknown'} {result.profiles?.last_name || 'User'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {result.profiles?.admission_number || 'N/A'} - {result.profiles?.student_class || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{result.quizzes?.title || 'Unknown Quiz'}</TableCell>
                        <TableCell>{result.quizzes?.subject || 'Unknown Subject'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={result.score >= 80 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'}
                            className={
                              result.score >= 80 ? 'bg-green-100 text-green-800' :
                              result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {result.score}%
                          </Badge>
                        </TableCell>
                        <TableCell>{result.points_earned}</TableCell>
                        <TableCell>{new Date(result.completed_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {quizResults.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          No quiz results found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-import">
          <Card>
            <CardContent className="pt-6">
              <BulkImportQuiz onDone={loadQuizzes} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default QuizManager;
