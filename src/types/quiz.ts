
export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
  timeLimit: number; // in minutes
  pointsReward: number;
  completionBonus?: number; // bonus points just for finishing
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  explanation?: string;
  points: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: number[];
  score: number;
  totalPoints: number;
  completedAt: string;
  timeSpent: number; // in seconds
}

export interface QuizResult {
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  pointsEarned: number;
  completionBonus: number;
  totalPointsAwarded: number;
  completedAt: string;
  timeSpent: number;
  answers: number[];
  questionResults: QuestionResult[];
}

export interface QuestionResult {
  questionIndex: number;
  question: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation?: string;
}
