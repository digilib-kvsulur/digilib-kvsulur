import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Award, BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { Quiz, Question, QuizAttempt, QuizResult } from "@/types/quiz";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentQuizProps {
  quiz: Quiz;
  onComplete: (result: QuizResult) => void;
  onBack: () => void;
}

export const StudentQuiz = ({ quiz, onComplete, onBack }: StudentQuizProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit * 60); // Convert minutes to seconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const { toast } = useToast();

  // Check if user has already taken this quiz - Enhanced check
  useEffect(() => {
    checkPreviousAttempt();
  }, [quiz.id]);

  const checkPreviousAttempt = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingResult, error } = await supabase
        .from('quiz_results')
        .select('id, completed_at, score')
        .eq('quiz_id', quiz.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking previous attempt:', error);
        return;
      }

      if (existingResult) {
        setAlreadyTaken(true);
        toast({
          title: "Quiz Already Completed",
          description: `You completed this quiz on ${new Date(existingResult.completed_at).toLocaleDateString()} with a score of ${existingResult.score}%. Each quiz can only be taken once.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking quiz attempt:', error);
    } finally {
      setCheckingAttempt(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isCompleted && !alreadyTaken) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !isCompleted && !alreadyTaken) {
      handleSubmitQuiz();
    }
  }, [timeRemaining, isCompleted, alreadyTaken]);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  const handleAnswerSelect = (optionIndex: number) => {
    if (alreadyTaken) return;
    
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateResult = (): QuizResult => {
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;
    const pointsReward = Number(quiz.pointsReward) || 50;

    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    // Award points proportionally based on score percentage
    const pointsEarned = Math.round((score / 100) * pointsReward);
    const timeSpent = (quiz.timeLimit * 60) - timeRemaining;

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      score,
      totalQuestions,
      correctAnswers,
      pointsEarned,
      completedAt: new Date().toISOString(),
      timeSpent,
      answers: [...answers]
    };
  };

  const handleSubmitQuiz = async () => {
    if (alreadyTaken) return;

    setIsCompleted(true);
    const result = calculateResult();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Double-check that user hasn't taken this quiz (race condition protection)
      const { data: doubleCheck } = await supabase
        .from('quiz_results')
        .select('id')
        .eq('quiz_id', quiz.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (doubleCheck) {
        toast({
          title: "Quiz Already Completed",
          description: "You have already completed this quiz.",
          variant: "destructive",
        });
        setAlreadyTaken(true);
        return;
      }

      // Save quiz result to database
      const { error: insertError } = await supabase
        .from('quiz_results')
        .insert({
          quiz_id: quiz.id,
          user_id: user.id,
          score: result.score,
          points_earned: result.pointsEarned,
          answers: answers
        });

      if (insertError) {
        throw insertError;
      }

      // Update user points safely using fetch-then-update pattern
      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current points:', fetchError);
      } else if (result.pointsEarned > 0) {
        const newPoints = (Number(currentUser.points) || 0) + result.pointsEarned;
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', user.id);
        if (pointsError) {
          console.error('Error updating user points:', pointsError);
        }
      }

      toast({
        title: "Quiz Completed!",
        description: `You scored ${result.score}% and earned ${result.pointsEarned} points!`,
      });

    } catch (error) {
      console.error('Error saving quiz result:', error);
      toast({
        title: "Error",
        description: "Failed to save quiz result. Please try again.",
        variant: "destructive",
      });
      setIsCompleted(false);
      return;
    }

    setShowResult(true);
    
    setTimeout(() => {
      onComplete(result);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (checkingAttempt) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking quiz availability...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyTaken) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Quiz Already Completed</CardTitle>
            <CardDescription>You have already taken this quiz and cannot retake it</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Each quiz can only be attempted once. You have already completed "{quiz.title}".
            </p>
            <Button onClick={onBack}>
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResult) {
    const result = calculateResult();
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
          <CardDescription>Here are your results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{result.score}%</div>
            <p className="text-gray-600">Your Score</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{result.correctAnswers}</div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{result.pointsEarned}</div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600">
              You answered {result.correctAnswers} out of {result.totalQuestions} questions correctly
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Time taken: {formatTime(result.timeSpent)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {quiz.title}
              </CardTitle>
              <CardDescription>{quiz.description}</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <Badge variant="outline">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Question {currentQuestionIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-lg font-medium leading-relaxed">
            {currentQuestion.question}
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  answers[currentQuestionIndex] === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                    answers[currentQuestionIndex] === index
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-600">{currentQuestion.points} points</span>
            </div>

            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                disabled={answers[currentQuestionIndex] === -1}
                className="bg-green-600 hover:bg-green-700"
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={answers[currentQuestionIndex] === -1}
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : answers[index] !== -1
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-500"></div>
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-gray-300"></div>
              <span>Not Answered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
