
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Star, Calendar, TrendingUp, User, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

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

  const userPoints = 180;
  const nextLevelPoints = 200;
  const pointsProgress = (userPoints / nextLevelPoints) * 100;

  if (!user) return null;

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
              <CardTitle className="text-sm font-medium">Books Read</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readingHistory.length}</div>
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
                {currentBooks.length === 0 && (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No books currently issued</p>
                    <Button onClick={() => navigate('/catalog')} className="mt-4">
                      Browse Books
                    </Button>
                  </div>
                )}
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

        {/* Points Breakdown */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Points Breakdown
            </CardTitle>
            <CardDescription>How you've earned your library points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentDashboard;
