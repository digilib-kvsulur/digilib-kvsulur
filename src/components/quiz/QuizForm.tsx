
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { Quiz, Question } from "@/types/quiz";

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

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    points: 5
  });

  const handleAddQuestion = () => {
    if (currentQuestion.question && currentQuestion.options?.every(opt => opt.trim())) {
      const newQuestion: Question = {
        id: Date.now().toString(),
        question: currentQuestion.question,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer || 0,
        explanation: currentQuestion.explanation,
        points: currentQuestion.points || 5
      };

      setFormData(prev => ({
        ...prev,
        questions: [...(prev.questions || []), newQuestion]
      }));

      // Reset form
      setCurrentQuestion({
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        explanation: "",
        points: 5
      });
    }
  };

  const handleRemoveQuestion = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions?.filter(q => q.id !== questionId) || []
    }));
  };

  const handleSave = () => {
    if (formData.title && formData.description && formData.questions && formData.questions.length > 0) {
      onSave(formData as Quiz);
    }
  };

  const updateQuestionOption = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || ["", "", "", ""])];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
        <h2 className="text-2xl font-bold">
          {quiz ? "Edit Quiz" : "Create New Quiz"}
        </h2>
      </div>

      {/* Quiz Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Information</CardTitle>
          <CardDescription>Basic details about your quiz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Science, Mathematics"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this quiz covers"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                  setFormData(prev => ({ ...prev, difficulty: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={formData.timeLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="pointsReward">Points Reward</Label>
              <Input
                id="pointsReward"
                type="number"
                value={formData.pointsReward}
                onChange={(e) => setFormData(prev => ({ ...prev, pointsReward: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Question Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Question</CardTitle>
          <CardDescription>Create a multiple choice question</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter your question here"
            />
          </div>

          <div className="space-y-2">
            <Label>Answer Options</Label>
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <Input
                  value={option}
                  onChange={(e) => updateQuestionOption(index, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                />
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={currentQuestion.correctAnswer === index}
                  onChange={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: index }))}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="explanation">Explanation (Optional)</Label>
              <Textarea
                id="explanation"
                value={currentQuestion.explanation}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                placeholder="Explain the correct answer"
              />
            </div>
            <div>
              <Label htmlFor="questionPoints">Points</Label>
              <Input
                id="questionPoints"
                type="number"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <Button onClick={handleAddQuestion} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Questions List */}
      {formData.questions && formData.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions ({formData.questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">
                        {index + 1}. {question.question}
                      </h4>
                      <div className="space-y-1">
                        {question.options.map((option, optIndex) => (
                          <div 
                            key={optIndex} 
                            className={`text-sm flex items-center gap-2 ${
                              question.correctAnswer === optIndex ? 'text-green-600 font-medium' : 'text-gray-600'
                            }`}
                          >
                            <span>{String.fromCharCode(65 + optIndex)}.</span>
                            {option}
                            {question.correctAnswer === optIndex && <span>(Correct)</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Points: {question.points}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveQuestion(question.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={!formData.title || !formData.description || !formData.questions?.length}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {quiz ? "Update Quiz" : "Create Quiz"}
        </Button>
      </div>
    </div>
  );
};
