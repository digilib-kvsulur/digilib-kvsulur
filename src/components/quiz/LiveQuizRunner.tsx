import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Quiz, Question } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";
import { Timer, ArrowRight, CheckCircle2, XCircle, Trophy } from "lucide-react";

interface LiveQuizRunnerProps {
  quiz: Quiz;
  sessionId: string;
  isHost: boolean;
  onFinish: () => void;
}

export const LiveQuizRunner = ({ quiz, sessionId, isHost, onFinish }: LiveQuizRunnerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60); // Assuming timeLimit is in minutes, converting to seconds per quiz or question. We will do 30s per question.
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  const question = quiz.questions[currentIndex] as Question;

  useEffect(() => {
    // Reset state for new question
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(30); // 30 seconds per question for live mode

    const channel = supabase.channel(`quiz_session_${sessionId}`);
    
    channel
      .on("broadcast", { event: "next_question" }, (payload) => {
        setCurrentIndex(payload.payload.index);
      })
      .on("broadcast", { event: "end_quiz" }, () => {
        submitResults();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentIndex]);

  useEffect(() => {
    if (showResult || !isHost) return; // Only host ticks the timer or both? Let's have both tick visually, but host triggers next.
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isHost) handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, showResult, isHost]);

  const handleTimeUp = async () => {
    setShowResult(true);
    // Wait 5 seconds to show correct answer, then move to next
    setTimeout(() => {
      if (isHost) handleNextQuestion();
    }, 5000);
  };

  const handleNextQuestion = async () => {
    if (currentIndex < quiz.questions.length - 1) {
      const nextIdx = currentIndex + 1;
      await supabase.from("quiz_sessions").update({ current_question_index: nextIdx }).eq("id", sessionId);
      await supabase.channel(`quiz_session_${sessionId}`).send({
        type: "broadcast",
        event: "next_question",
        payload: { index: nextIdx }
      });
      setCurrentIndex(nextIdx);
    } else {
      await supabase.from("quiz_sessions").update({ status: "finished" }).eq("id", sessionId);
      await supabase.channel(`quiz_session_${sessionId}`).send({
        type: "broadcast",
        event: "end_quiz",
        payload: {}
      });
      submitResults();
    }
  };

  const submitResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      if (!isHost) {
        await supabase.from("quiz_results").insert({
          quiz_id: quiz.id,
          user_id: user.id,
          score,
          points_earned: Math.round((score / quiz.questions.length) * quiz.pointsReward),
          answers: {} // omit detailed answers for simplicity in this version
        });
      }
      onFinish();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showResult || isHost) return;
    setSelectedAnswer(index);
    if (index === question.correctAnswer) {
      setScore(s => s + 1);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto shadow-xl border-primary/20 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-muted p-2 h-2 w-full overflow-hidden rounded-t-xl">
        <div 
          className="h-full bg-primary transition-all duration-1000 rounded-full" 
          style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
        </div>
        <div className={`flex items-center gap-2 font-bold text-lg ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
          <Timer className="h-5 w-5" />
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-4">
        <h3 className="text-2xl font-bold leading-tight">{question.question}</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          {question.options.map((opt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrect = i === question.correctAnswer;
            
            let btnClass = "h-auto py-4 px-6 text-left justify-start items-center whitespace-normal border-2 text-base transition-all duration-200 ";
            
            if (showResult) {
              if (isCorrect) btnClass += "bg-success/20 border-success text-success-foreground";
              else if (isSelected) btnClass += "bg-destructive/20 border-destructive text-destructive";
              else btnClass += "opacity-50 border-border bg-background";
            } else {
              if (isSelected) btnClass += "border-primary bg-primary/5 shadow-md scale-[1.02]";
              else btnClass += "border-border hover:border-primary/50 hover:bg-muted bg-background";
            }

            return (
              <Button
                key={i}
                variant="outline"
                className={btnClass}
                onClick={() => handleAnswerSelect(i)}
                disabled={showResult || isHost}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 shrink-0 ${
                    showResult && isCorrect ? 'bg-success border-success text-white' :
                    showResult && isSelected && !isCorrect ? 'bg-destructive border-destructive text-white' :
                    isSelected ? 'border-primary text-primary font-bold' : 'border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {showResult && isCorrect ? <CheckCircle2 className="h-5 w-5" /> : 
                     showResult && isSelected && !isCorrect ? <XCircle className="h-5 w-5" /> : 
                     String.fromCharCode(65 + i)}
                  </div>
                  <span className="flex-1 font-medium">{opt}</span>
                </div>
              </Button>
            );
          })}
        </div>
        
        {isHost && (
          <div className="pt-6 border-t flex justify-between items-center bg-muted/50 p-4 rounded-xl mt-6">
            <div className="text-sm text-muted-foreground">You are hosting this live quiz.</div>
            <Button onClick={handleTimeUp} className="bg-primary shadow-lg hover:shadow-primary/25">
              Skip Timer <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
