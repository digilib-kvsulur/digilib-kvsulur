
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  condition: {
    type: 'quiz_score' | 'quizzes_completed' | 'books_read' | 'consecutive_days' | 'total_points';
    value: number;
    comparison: 'gte' | 'lte' | 'eq';
  };
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  totalPoints: number;
  rank: number;
  avatar?: string;
  recentActivity: string;
  username?: string;
}

export interface ReadingChallenge {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentProgress: number;
  type: 'books_read' | 'quiz_completed' | 'points_earned';
  reward: {
    points: number;
    badge?: string;
  };
  deadline: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface UserStats {
  totalPoints: number;
  booksRead: number;
  quizzesCompleted: number;
  averageQuizScore: number;
  consecutiveDays: number;
  achievements: Achievement[];
  currentChallenges: ReadingChallenge[];
}
