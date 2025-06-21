
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClassData {
  class_name: string;
  student_count: number;
  total_points: number;
  books_read: number;
  quiz_completions: number;
  students: Array<{
    id: string;
    name: string;
    points: number;
    books_count: number;
    quiz_count: number;
  }>;
}

const ClassAnalytics = () => {
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassAnalytics();
  }, []);

  const loadClassAnalytics = async () => {
    try {
      // Get class-wise student data
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, student_class, points')
        .eq('role', 'student')
        .eq('is_approved', true)
        .not('student_class', 'is', null);

      if (studentsError) throw studentsError;

      // Get reading history counts per student
      const { data: readingHistory, error: readingError } = await supabase
        .from('reading_history')
        .select('user_id');

      if (readingError) throw readingError;

      // Get quiz results counts per student
      const { data: quizResults, error: quizError } = await supabase
        .from('quiz_results')
        .select('user_id');

      if (quizError) throw quizError;

      // Group students by class
      const classGroups: { [key: string]: any[] } = {};
      students?.forEach(student => {
        const className = student.student_class || 'Unassigned';
        if (!classGroups[className]) {
          classGroups[className] = [];
        }
        classGroups[className].push(student);
      });

      // Calculate analytics for each class
      const analyticsData: ClassData[] = Object.entries(classGroups).map(([className, classStudents]) => {
        const studentAnalytics = classStudents.map(student => {
          const studentReadingCount = readingHistory?.filter(rh => rh.user_id === student.id).length || 0;
          const studentQuizCount = quizResults?.filter(qr => qr.user_id === student.id).length || 0;
          
          return {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            points: student.points || 0,
            books_count: studentReadingCount,
            quiz_count: studentQuizCount
          };
        });

        return {
          class_name: className,
          student_count: classStudents.length,
          total_points: studentAnalytics.reduce((sum, s) => sum + s.points, 0),
          books_read: studentAnalytics.reduce((sum, s) => sum + s.books_count, 0),
          quiz_completions: studentAnalytics.reduce((sum, s) => sum + s.quiz_count, 0),
          students: studentAnalytics.sort((a, b) => b.points - a.points)
        };
      });

      setClassData(analyticsData.sort((a, b) => a.class_name.localeCompare(b.class_name)));
    } catch (error) {
      console.error('Error loading class analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="mb-6">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <GraduationCap className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Class-wise Analytics</h2>
      </div>

      {classData.map((classInfo) => (
        <Card key={classInfo.class_name}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Class {classInfo.class_name}</span>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {classInfo.student_count} students
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {classInfo.books_read} books
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  {classInfo.quiz_completions} quizzes
                </div>
              </div>
            </CardTitle>
            <CardDescription>
              Total class points: {classInfo.total_points.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Student Performance</h4>
              <div className="grid gap-2">
                {classInfo.students.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>{student.points} pts</span>
                      <span>{student.books_count} books</span>
                      <span>{student.quiz_count} quizzes</span>
                    </div>
                  </div>
                ))}
              </div>
              {classInfo.students.length === 0 && (
                <p className="text-gray-500 text-center py-4">No students found in this class</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {classData.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No class data found</h3>
            <p className="text-gray-600">Students need to be assigned to classes to see analytics here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassAnalytics;
