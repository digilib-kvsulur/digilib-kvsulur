import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Star, Calendar, TrendingUp, User, Search, Trophy, Clock, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Quiz, QuizResult } from "@/types/quiz";
import { StudentQuiz } from "@/components/quiz/StudentQuiz";

const StudentDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate("/login");
    }

    // Load quiz results
    const results = JSON.parse(localStorage.getItem('quizResults') || '[]');
    setQuizResults(results);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleQuizComplete = (result: QuizResult) => {
    setQuizResults(prev => [...prev, result]);
    setSelectedQuiz(null);
  };

  // Mock quiz data
  const availableQuizzes: Quiz[] = [
    {
      id: "1",
      title: "General Science Quiz",
      description: "Test your knowledge of basic scientific concepts",
      subject: "Science",
      difficulty: "medium",
      questions: [
        {
          id: "1",
          question: "What is the chemical symbol for water?",
          options: ["H2O", "CO2", "NaCl", "O2"],
          correctAnswer: 0,
          explanation: "Water is composed of two hydrogen atoms and one oxygen atom.",
          points: 5
        },
        {
          id: "2",
          question: "Which planet is known as the Red Planet?",
          options: ["Venus", "Mars", "Jupiter", "Saturn"],
          correctAnswer: 1,
          explanation: "Mars appears red due to iron oxide (rust) on its surface.",
          points: 5
        }
      ],
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
      questions: [
        {
          id: "3",
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correctAnswer: 1,
          points: 3
        }
      ],
      timeLimit: 45,
      pointsReward: 40,
      isActive: true,
      createdAt: "2024-06-14",
      createdBy: "admin"
    }
  ];

  // Mock data for the dashboard
  const currentBooks = [
    {
      id: 1,
      title: "The Alchemist",
      author: "Paulo Coelho",
      issueDate: "2024-06-10",
      dueDate: "2024-06-24",
      daysLeft: 7
    },
    {
      id: 2,
      title: "Harry Potter and the Philosopher's Stone",
      author: "J.K. Rowling",
      issueDate: "2024-06-15",
      dueDate: "2024-06-29",
      daysLeft: 12
    }
  ];

  const readingHistory = [
    { title: "To Kill a Mockingbird", completedDate: "2024-06-01", rating: 5, points: 25 },
    { title: "The Science of Everything", completedDate: "2024-05-20", rating: 4, points: 20 },
    { title: "Mathematics for Class X", completedDate: "2024-05-10", rating: 3, points: 15 }
  ];

  const userPoints = 180 + quizResults.reduce((total, result) => total + result.pointsEarned, 0);
  const nextLevelPoints = 200;
  const pointsProgress = (userPoints / nextLevelPoints) * 100;

  if (!user) return null;

  if (selectedQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Taking Quiz</h1>
                  <p className="text-sm text-gray-600">Good luck!</p>
                </div>
              </div>
              <Button onClick={() => setSelectedQuiz(null)} variant="outline">
                Exit Quiz
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StudentQuiz 
            quiz={selectedQuiz} 
            onComplete={handleQuizComplete}
            onBack={() => setSelectedQuiz(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome, {user.firstName}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate('/catalog')} variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Browse Books
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Library Points</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{userPoints}</div>
              <div className="mt-2">
                <Progress value={pointsProgress} className="h-2" />
                <p className="text-xs text-gray-600 mt-1">
                  {nextLevelPoints - userPoints} points to next level
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Books</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentBooks.length}</div>
              <p className="text-xs text-gray-600">Books issued</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
              <Trophy className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizResults.length}</div>
              <p className="text-xs text-gray-600">This semester</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Class Rank</CardTitle>
              <User className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#3</div>
              <p className="text-xs text-gray-600">In {user.studentClass} class</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Current Books */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Currently Issued Books
                  </CardTitle>
                  <CardDescription>Books you have currently issued</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentBooks.map((book) => (
                      <div key={book.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{book.title}</h4>
                          <p className="text-sm text-gray-600">by {book.author}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Issued: {new Date(book.issueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={book.daysLeft <= 3 ? "destructive" : "default"}>
                            {book.daysLeft} days left
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {new Date(book.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Reading History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Reading History
                  </CardTitle>
                  <CardDescription>Books you've completed recently</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {readingHistory.map((book, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{book.title}</h4>
                          <p className="text-sm text-gray-600">
                            Completed: {new Date(book.completedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < book.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <Badge variant="outline">+{book.points} points</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Available Quizzes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Available Quizzes
                  </CardTitle>
                  <CardDescription>Test your knowledge and earn points</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {availableQuizzes.map((quiz) => (
                      <div key={quiz.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium">{quiz.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                          </div>
                          <Badge variant="outline" className={
                            quiz.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                            quiz.difficulty === 'medium' ? 'border-yellow-500 text-yellow-700' :
                            'border-red-500 text-red-700'
                          }>
                            {quiz.difficulty}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {quiz.timeLimit} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            {quiz.pointsReward} points
                          </span>
                          <span>{quiz.questions.length} questions</span>
                        </div>

                        <Button 
                          onClick={() => setSelectedQuiz(quiz)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Start Quiz
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quiz Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Quiz Results
                  </CardTitle>
                  <CardDescription>Your quiz performance history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {quizResults.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No quizzes taken yet</p>
                        <p className="text-sm text-gray-400">Start your first quiz to see results here</p>
                      </div>
                    ) : (
                      quizResults.slice(-5).reverse().map((result, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{result.quizTitle}</h4>
                            <Badge variant={result.score >= 80 ? "default" : result.score >= 60 ? "secondary" : "destructive"}>
                              {result.score}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{result.correctAnswers}/{result.totalQuestions} correct</span>
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              +{result.pointsEarned} points
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Completed: {new Date(result.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {/* Points Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Points Breakdown
                </CardTitle>
                <CardDescription>How you've earned your library points</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">120</div>
                    <p className="text-sm text-gray-600">Books Completed</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">45</div>
                    <p className="text-sm text-gray-600">Timely Returns</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">15</div>
                    <p className="text-sm text-gray-600">Book Reviews</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {quizResults.reduce((total, result) => total + result.pointsEarned, 0)}
                    </div>
                    <p className="text-sm text-gray-600">Quiz Points</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
