
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Play, Pause } from "lucide-react";
import { Quiz } from "@/types/quiz";
import { QuizForm } from "./QuizForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const QuizManager = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadQuizzes();
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
        questions: quiz.questions,
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
    </div>
  );
};

export default QuizManager;
