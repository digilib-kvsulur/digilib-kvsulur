import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, GripVertical, CheckCircle2, Wand2, Loader2 } from "lucide-react";
import { Quiz, Question } from "@/types/quiz";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuizFormProps {
  quiz?: Quiz | null;
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}

export const QuizForm = ({ quiz, onSave, onCancel }: QuizFormProps) => {
  const [formData, setFormData] = useState<Partial<Quiz>>({
    title: quiz?.title || "",
    description: quiz?.description || "",
    subject: quiz?.subject || "",
    difficulty: quiz?.difficulty || "medium",
    timeLimit: quiz?.timeLimit || 30,
    pointsReward: quiz?.pointsReward || 50,
    questions: quiz?.questions || [],
    isActive: quiz?.isActive ?? true,
    createdAt: quiz?.createdAt || new Date().toISOString().split('T')[0],
    createdBy: quiz?.createdBy || "admin"
  });

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", points: 5
  });

  const handleAddQuestion = () => {
    if (!currentQuestion.question?.trim() || !currentQuestion.options?.every(opt => opt.trim())) return;
    const newQ: Question = {
      id: Date.now().toString(),
      question: currentQuestion.question!,
      options: currentQuestion.options!,
      correctAnswer: currentQuestion.correctAnswer || 0,
      explanation: currentQuestion.explanation,
      points: currentQuestion.points || 5
    };
    setFormData(prev => ({ ...prev, questions: [...(prev.questions || []), newQ] }));
    setCurrentQuestion({ question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "", points: 5 });
    setShowQuestionForm(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setFormData(prev => ({ ...prev, questions: prev.questions?.filter(q => q.id !== id) || [] }));
  };

  const handleSave = () => {
    if (formData.title && formData.questions && formData.questions.length > 0) {
      onSave(formData as Quiz);
    }
  };

  const [loadingAI, setLoadingAI] = useState(false);
  const { toast } = useToast();
  
  const generateWithAI = async () => {
    if (!formData.title) {
      toast({ title: "Please enter a quiz title first", variant: "destructive" });
      return;
    }
    setLoadingAI(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          title: formData.title, 
          description: formData.description,
          numQuestions: 5 
        })
      });

      if (!res.ok) throw new Error("Failed to generate quiz");
      const data = await res.json();
      
      if (data.questions && Array.isArray(data.questions)) {
        const generatedQs: Question[] = data.questions.map((q: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          question: q.question,
          options: q.options,
          correctAnswer: q.options.indexOf(q.correctAnswer) !== -1 ? q.options.indexOf(q.correctAnswer) : 0,
          explanation: q.explanation || "",
          points: 10
        }));
        
        setFormData(prev => ({ 
          ...prev, 
          questions: [...(prev.questions || []), ...generatedQs] 
        }));
        toast({ title: "Successfully generated questions with AI!" });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to generate AI quiz", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAI(false);
    }
  };

  const updateOption = (i: number, v: string) => {
    const opts = [...(currentQuestion.options || ["", "", "", ""])];
    opts[i] = v;
    setCurrentQuestion(prev => ({ ...prev, options: opts }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{quiz ? "Edit Quiz" : "Create Quiz"}</h2>
          <p className="text-xs text-muted-foreground">Fill in details and add questions</p>
        </div>
      </div>

      {/* Compact quiz info */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Quiz title" />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={formData.subject} onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))} placeholder="e.g., Science" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setFormData(prev => ({ ...prev, difficulty: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Time (min)</Label>
              <Input type="number" value={formData.timeLimit} onChange={e => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 30 }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Points</Label>
              <Input type="number" value={formData.pointsReward} onChange={e => setFormData(prev => ({ ...prev, pointsReward: parseInt(e.target.value) || 50 }))} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Questions</h3>
            <Badge variant="secondary" className="text-xs">{formData.questions?.length || 0}</Badge>
          </div>
          {!showQuestionForm && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={generateWithAI} disabled={loadingAI} className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                {loadingAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                Generate with AI
              </Button>
              <Button size="sm" onClick={() => setShowQuestionForm(true)} className="gradient-primary border-0">
                <Plus className="h-4 w-4 mr-1" /> Add Question
              </Button>
            </div>
          )}
        </div>

        {/* Inline question form */}
        {showQuestionForm && (
          <Card className="border-primary/30 border-2">
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs">Question *</Label>
                <Textarea value={currentQuestion.question} onChange={e => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))} placeholder="Type your question" rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Options (click radio to mark correct)</Label>
                {currentQuestion.options?.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: i }))}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${currentQuestion.correctAnswer === i ? "border-success bg-success/10" : "border-border hover:border-primary"}`}
                    >
                      {currentQuestion.correctAnswer === i && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {currentQuestion.correctAnswer !== i && <span className="text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>}
                    </button>
                    <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="h-9" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Explanation (optional)</Label>
                  <Input value={currentQuestion.explanation} onChange={e => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))} placeholder="Why is this correct?" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Points</Label>
                  <Input type="number" value={currentQuestion.points} onChange={e => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 5 }))} className="h-9" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddQuestion} size="sm" className="flex-1">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowQuestionForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question list */}
        {formData.questions?.map((q, idx) => (
          <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 group">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{q.question}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {q.options.map((opt, oi) => (
                  <Badge key={oi} variant={q.correctAnswer === oi ? "default" : "outline"} className={`text-[10px] ${q.correctAnswer === oi ? "bg-success/15 text-success border-success/30" : ""}`}>
                    {String.fromCharCode(65 + oi)}. {opt}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleRemoveQuestion(q.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}

        {(!formData.questions || formData.questions.length === 0) && !showQuestionForm && (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">No questions added yet</p>
            <Button variant="outline" size="sm" onClick={() => setShowQuestionForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add your first question
            </Button>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex gap-3 sticky bottom-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={!formData.title || !formData.questions?.length} className="flex-1 gradient-primary border-0">
          <Save className="h-4 w-4 mr-2" /> {quiz ? "Update" : "Create"} Quiz
        </Button>
      </div>
    </div>
  );
};
