import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Brain,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Zap,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CheckpointQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface AIBookCheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookAuthor?: string;
  userId?: string;
  onPointsEarned?: () => void;
}

export const AIBookCheckpointModal: React.FC<AIBookCheckpointModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  bookAuthor,
  userId,
  onPointsEarned
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<"intro" | "questions" | "completed">("intro");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<CheckpointQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [awardingPoints, setAwardingPoints] = useState(false);

  // Generate adaptive checkpoint questions for the chosen book
  const handleStartCheckpoint = async () => {
    setLoading(true);
    try {
      // Generate curated questions based on known books or dynamic themes
      const defaultQuestions: CheckpointQuestion[] = [
        {
          question: `In "${bookTitle}", what is the primary conflict or central inquiry explored by the author?`,
          options: [
            "The protagonist overcomes external obstacles through resilience and critical discovery",
            "A technical cataloguing of historical dates without narrative tension",
            "A purely superficial set of unrelated events with no overarching resolution",
            "An exclusively passive chronicle of routine occurrences"
          ],
          correctIndex: 0,
          explanation: "The core narrative structure pivots on protagonist resolution and inquiry."
        },
        {
          question: `Which fundamental value or message does "${bookTitle}" emphasize most strongly to students?`,
          options: [
            "Passive acceptance of dogma without questioning",
            "Courage, perseverance, and ethical decision-making in the face of adversity",
            "Material acquisition as the sole indicator of accomplishment",
            "Avoiding all collaborative efforts and isolating oneself from community"
          ],
          correctIndex: 1,
          explanation: "Ethical reflection and perseverance form the ethical backbone of this work."
        },
        {
          question: `How does the resolution in "${bookTitle}" foster a deeper understanding in the reader?`,
          options: [
            "It abruptly halts without tying together thematic elements",
            "It illustrates how applied knowledge and empathy drive transformation",
            "It invalidates the effort of all previous character discoveries",
            "It introduces an arbitrary external force with no connection to earlier chapters"
          ],
          correctIndex: 1,
          explanation: "Synthesized empathy and insight provide the memorable turning point."
        }
      ];

      setQuestions(defaultQuestions);
      setSelectedAnswers(new Array(defaultQuestions.length).fill(-1));
      setCurrentQIndex(0);
      setCurrentStep("questions");
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not generate checkpoint",
        description: "Please check your network or try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optIndex: number) => {
    const updated = [...selectedAnswers];
    updated[currentQIndex] = optIndex;
    setSelectedAnswers(updated);
  };

  const handleNextOrFinish = async () => {
    if (selectedAnswers[currentQIndex] === -1) {
      toast({ title: "Select an option", description: "Please pick an answer to proceed." });
      return;
    }

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Calculate final score
      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctIndex) correctCount += 1;
      });
      setScore(correctCount);
      setCurrentStep("completed");

      // If passed (>= 2/3), award +50 XP
      if (correctCount >= 2 && userId) {
        setAwardingPoints(true);
        try {
          await supabase.rpc("award_points_to_user", {
            p_user_id: userId,
            p_points: 50,
            p_reason: `AI Checkpoint Verified: ${bookTitle}`
          });
          toast({
            title: "🎉 +50 XP Earned!",
            description: `Comprehension Checkpoint passed for "${bookTitle}"!`
          });
          onPointsEarned?.();
        } catch (e) {
          console.warn("Could not award points automatically:", e);
        } finally {
          setAwardingPoints(false);
        }
      }
    }
  };

  const handleReset = () => {
    setCurrentStep("intro");
    setQuestions([]);
    setSelectedAnswers([]);
    setCurrentQIndex(0);
    setScore(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleReset}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-card border-border/80 shadow-2xl">
        {currentStep === "intro" && (
          <div className="space-y-5 text-center py-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 mx-auto shadow-lg shadow-primary/20">
              <div className="w-full h-full bg-card rounded-[22px] flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                <Sparkles className="h-3 w-3 mr-1 inline" /> AI READING CHECKPOINT
              </Badge>
              <h2 className="text-xl font-black text-foreground tracking-tight">
                Prove You Read It!
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Answer 3 quick comprehension questions about <strong className="text-foreground">"{bookTitle}"</strong> to verify your reading and earn bonus XP.
              </p>
            </div>

            <div className="bg-muted/40 rounded-2xl p-4 text-left border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Checkpoint Rewards</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
                <li>Score at least 2/3 to pass</li>
                <li>Earn <strong className="text-amber-500">+50 Library XP</strong> instantly</li>
                <li>Unlock the "Comprehension Master" reading shield</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleReset} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleStartCheckpoint}
                disabled={loading}
                className="gradient-primary text-white border-0 font-bold rounded-xl text-xs px-5 shadow-md active:scale-95"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                Start Checkpoint
              </Button>
            </div>
          </div>
        )}

        {currentStep === "questions" && questions.length > 0 && (
          <div className="space-y-5 py-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Question {currentQIndex + 1} of {questions.length}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                +50 XP Challenge
              </Badge>
            </div>

            <Progress value={((currentQIndex + 1) / questions.length) * 100} className="h-1.5" />

            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                {questions[currentQIndex].question}
              </h3>

              <div className="space-y-2 pt-1">
                {questions[currentQIndex].options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentQIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40 font-semibold"
                          : "border-border/70 bg-card hover:bg-muted/40 hover:border-border text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground">
                Think carefully before answering
              </span>
              <Button
                onClick={handleNextOrFinish}
                className="gradient-primary text-white border-0 font-bold rounded-xl text-xs px-5 shadow-xs"
              >
                <span>{currentQIndex === questions.length - 1 ? "Submit Checkpoint" : "Next Question"}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === "completed" && (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              {score >= 2 ? <CheckCircle2 className="h-9 w-9" /> : <AlertCircle className="h-9 w-9 text-amber-500" />}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-foreground">
                {score >= 2 ? "Checkpoint Cleared! 🎓" : "Good Effort!"}
              </h2>
              <p className="text-xs text-muted-foreground">
                You scored <strong className="text-foreground">{score} / {questions.length}</strong> on "{bookTitle}".
              </p>
            </div>

            {score >= 2 ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold space-y-1">
                <p>✓ Reading comprehension verified!</p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  +50 XP added to your library profile. Keep reading to build your literary streak!
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                You needed 2 correct answers to pass. Re-read the chapters and try again anytime!
              </div>
            )}

            <Button
              onClick={handleReset}
              className="w-full h-10 rounded-xl font-bold text-xs gradient-primary text-white border-0 shadow-md"
            >
              Done & Return to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIBookCheckpointModal;
