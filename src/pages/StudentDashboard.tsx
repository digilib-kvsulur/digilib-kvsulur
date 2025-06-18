import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Quiz, QuizResult } from "@/types/quiz";
import { Achievement, LeaderboardEntry, ReadingChallenge, UserStats } from "@/types/rewards";
import { StudentQuiz } from "@/components/quiz/StudentQuiz";
import Achievements from "@/components/rewards/Achievements";
import Leaderboard from "@/components/rewards/Leaderboard";
import ReadingChallenges from "@/components/rewards/ReadingChallenges";
import StudentHeader from "@/components/dashboard/StudentHeader";
import StatsCards from "@/components/dashboard/StatsCards";
import CurrentBooks from "@/components/dashboard/CurrentBooks";
import ReadingHistory from "@/components/dashboard/ReadingHistory";
import AvailableQuizzes from "@/components/dashboard/AvailableQuizzes";
import QuizResults from "@/components/dashboard/QuizResults";
import PointsBreakdown from "@/components/dashboard/PointsBreakdown";

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

  // Mock data
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

  // New reward system data
  const userStats: UserStats = {
    totalPoints: 180 + quizResults.reduce((total, result) => total + result.pointsEarned, 0),
    booksRead: 8,
    quizzesCompleted: quizResults.length,
    averageQuizScore: quizResults.length > 0 ? 
      quizResults.reduce((total, result) => total + result.score, 0) / quizResults.length : 0,
    consecutiveDays: 5,
    achievements: [],
    currentChallenges: []
  };

  const achievements: Achievement[] = [
    {
      id: "1",
      title: "Quiz Master",
      description: "Complete 5 quizzes with 80% or higher score",
      icon: "trophy",
      points: 100,
      condition: { type: 'quizzes_completed', value: 5, comparison: 'gte' },
      isUnlocked: userStats.quizzesCompleted >= 5,
      unlockedAt: userStats.quizzesCompleted >= 5 ? "2024-06-17" : undefined
    },
    {
      id: "2",
      title: "Bookworm",
      description: "Read 10 books this semester",
      icon: "book",
      points: 150,
      condition: { type: 'books_read', value: 10, comparison: 'gte' },
      isUnlocked: userStats.booksRead >= 10,
    },
    {
      id: "3",
      title: "Point Collector",
      description: "Earn 500 total points",
      icon: "zap",
      points: 200,
      condition: { type: 'total_points', value: 500, comparison: 'gte' },
      isUnlocked: userStats.totalPoints >= 500,
    }
  ];

  const leaderboardEntries: LeaderboardEntry[] = [
    {
      id: "1",
      studentId: user?.id || "current",
      studentName: user?.firstName + " " + user?.lastName || "You",
      studentClass: user?.studentClass || "10A",
      totalPoints: userStats.totalPoints,
      rank: 3,
      recentActivity: "Completed Science Quiz"
    },
    {
      id: "2",
      studentId: "student1",
      studentName: "Arjun Sharma",
      studentClass: "10A",
      totalPoints: 450,
      rank: 1,
      recentActivity: "Completed Math Challenge"
    },
    {
      id: "3",
      studentId: "student2",
      studentName: "Priya Patel",
      studentClass: "10B",
      totalPoints: 380,
      rank: 2,
      recentActivity: "Read 'The Alchemist'"
    }
  ].sort((a, b) => b.totalPoints - a.totalPoints).map((entry, index) => ({ ...entry, rank: index + 1 }));

  const readingChallenges: ReadingChallenge[] = [
    {
      id: "1",
      title: "Summer Reading Sprint",
      description: "Read 5 books before the end of summer break",
      targetValue: 5,
      currentProgress: userStats.booksRead >= 5 ? 5 : userStats.booksRead,
      type: "books_read",
      reward: { points: 200 },
      deadline: "2024-07-31",
      isCompleted: userStats.booksRead >= 5,
      completedAt: userStats.booksRead >= 5 ? "2024-06-15" : undefined
    },
    {
      id: "2",
      title: "Quiz Champion",
      description: "Complete 10 quizzes this month",
      targetValue: 10,
      currentProgress: userStats.quizzesCompleted,
      type: "quiz_completed",
      reward: { points: 150 },
      deadline: "2024-06-30",
      isCompleted: userStats.quizzesCompleted >= 10,
    }
  ];

  const userPoints = userStats.totalPoints;
  const nextLevelPoints = 200;
  const pointsProgress = (userPoints / nextLevelPoints) * 100;

  if (!user) return null;

  if (selectedQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StudentHeader user={user} onLogout={() => setSelectedQuiz(null)} />
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
      <StudentHeader user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards 
          userPoints={userPoints}
          nextLevelPoints={nextLevelPoints}
          currentBooksCount={currentBooks.length}
          quizResultsCount={quizResults.length}
          classRank={leaderboardEntries.find(e => e.studentId === user?.id)?.rank || 'N/A'}
          userClass={user.studentClass}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <CurrentBooks books={currentBooks} />
              <ReadingHistory books={readingHistory} />
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AvailableQuizzes quizzes={availableQuizzes} onSelectQuiz={setSelectedQuiz} />
              <QuizResults results={quizResults} />
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <Achievements achievements={achievements} userStats={userStats} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard entries={leaderboardEntries} currentUserId={user?.id} />
          </TabsContent>

          <TabsContent value="challenges">
            <ReadingChallenges 
              challenges={readingChallenges}
              onJoinChallenge={(challengeId) => console.log('Joining challenge:', challengeId)}
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <PointsBreakdown quizResults={quizResults} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
