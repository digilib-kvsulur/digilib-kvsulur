
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Play, Pause } from "lucide-react";
import { Quiz, Question } from "@/types/quiz";
import { QuizForm } from "./QuizForm";

const QuizManager = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Mock data for demonstration
  const mockQuizzes: Quiz[] = [
    {
      id: "1",
      title: "General Science Quiz",
      description: "Test your knowledge of basic scientific concepts",
      subject: "Science",
      difficulty: "medium",
      questions: [],
      timeLimit: 30,
      pointsReward: 50,
      isActive: true,
      createdAt: "2024-06-15",
      createdBy: "admin"
    },
    {
      id: "2",
      title: "Mathematics Fundamentals",
      description: "Basic mathematics quiz for Class 10",
      subject: "Mathematics",
      difficulty: "easy",
      questions: [],
      timeLimit: 45,
      pointsReward: 40,
      isActive: false,
      createdAt: "2024-06-14",
      createdBy: "admin"
    }
  ];

  useState(() => {
    setQuizzes(mockQuizzes);
  });

  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setShowQuizForm(true);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setShowQuizForm(true);
  };

  const handleDeleteQuiz = (quizId: string) => {
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  const handleToggleQuizStatus = (quizId: string) => {
    setQuizzes(prev => prev.map(q => 
      q.id === quizId ? { ...q, isActive: !q.isActive } : q
    ));
  };

  const handleQuizSaved = (quiz: Quiz) => {
    if (editingQuiz) {
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? quiz : q));
    } else {
      setQuizzes(prev => [...prev, { ...quiz, id: Date.now().toString() }]);
    }
    setShowQuizForm(false);
    setEditingQuiz(null);
  };

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
