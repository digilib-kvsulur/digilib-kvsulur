export type LearningTool = "flashcards" | "mocks" | "mastery" | "report" | "offline" | "skills" | "careers";

export type LearningTarget = {
  tool?: LearningTool;
  classNumber?: string;
  subject?: string;
  chapterTitle?: string;
};

export type TodayItem = {
  kind: "flashcards" | "exam" | "chapter" | "weak_topic" | "reading_assignment" | "book_due" | string;
  priority: number;
  title: string;
  detail: string;
  cta_tab: string;
  cta_params: Record<string, string | undefined> | null;
  due_at: string | null;
};

export type TodayResponse = {
  items: TodayItem[];
  generated_at: string;
};

export type ExamCountdown = {
  exam: {
    id: string;
    exam_name: string;
    subject: string;
    exam_date: string;
    days_left: number;
    chapters_total: number;
    chapters_done: number;
    next_chapter: string | null;
    instructions: string | null;
  } | null;
};

export type WeeklyGoal = {
  id: string;
  user_id: string;
  week_start: string;
  subject: string;
  target_chapters: number;
  target_practice: number;
  target_minutes: number;
  created_at: string;
  updated_at: string;
};

export type WeekProgress = {
  week_start: string;
  goals: WeeklyGoal[];
  actuals: { chapters: number; practice: number; minutes: number };
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  subject: string;
  chapter_title: string;
  source_kind: string;
  due_at: string;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
};

export type DueFlashcards = {
  cards: Flashcard[];
  due_count: number;
  total: number;
  learned: number;
};

export type FlashcardReward = {
  awarded: boolean;
  reason?: "need_more_reviews" | "already_claimed";
  points?: number;
  reviews: number;
};

export type MasteryRow = {
  subject: string;
  chapter_title: string;
  attempts: number;
  accuracy: number;
  last_practiced: string;
  checkpoint_passed: boolean;
  checkpoint_score: number;
};

export type MasterySummary = { chapters: MasteryRow[] };

export type CheckpointResult = {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  awarded: number;
};

export type MockSectionScore = { name: string; score: number; max: number };

export type MockStartResponse = {
  attempt_id: string;
  started_at: string;
  expires_at: string;
  paper: {
    id: string;
    title: string;
    subject: string;
    duration_minutes: number;
    sections: Array<{
      name: string;
      marks_per_question: number;
      questions: Array<{ prompt: string; options?: string[] }>;
    }>;
  };
};

export type MockSubmitResult = {
  attempt_id: string;
  score: number;
  max_score: number;
  percent: number;
  section_scores: MockSectionScore[];
};

export type MockPaperContent = {
  duration_minutes?: number;
  sections?: Array<{
    name?: string;
    marks_per_question?: number;
    questions?: Array<{
      prompt?: string;
      options?: string[];
      correct_index?: number;
      explanation?: string;
      topic?: string;
    }>;
  }>;
};

export type MockResultResponse = {
  attempt: {
    id: string;
    paper_id: string;
    subject: string;
    score: number | null;
    max_score: number | null;
    submitted_at: string | null;
    section_scores: MockSectionScore[] | null;
    answers: Record<string, string> | null;  };
  paper: MockPaperContent;
};

export type MockAttemptRow = {
  id: string;
  paper_id: string;
  subject: string;
  status: "active" | "submitted" | "expired";
  score: number | null;
  max_score: number | null;
  section_scores: MockSectionScore[] | null;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
};

export type LearningReport = {
  from: string;
  to: string;
  study_minutes: number;
  study_sessions: number;
  chapters_completed: number;
  practice_attempts: number;
  practice_correct: number;
  practice_accuracy: number;
  flashcard_reviews: number;
  flashcards_practised: number;
  mock_attempts: number;
  best_mock_percent: number;
  books_read: number;
  points_earned: number;
  daily: Array<{ date: string; minutes: number; practice: number; reviews: number }>;
};

export type StudyResource = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  student_class: string | null;
  chapter_title: string | null;
  topic: string | null;
  resource_type: string;
  marks: number | null;
  source_label: string | null;
  source_url: string | null;
  markdown_content: string | null;
  file_url: string | null;
  updated_at: string | null;
};

export type SkillTrack = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  icon: string;
  accent: string;
  min_class: string;
  max_class: string;
  sort_order: number;
};

export type SkillLesson = {
  id: string;
  track_id: string;
  slug: string;
  title: string;
  summary: string;
  content_md: string;
  est_minutes: number;
  sort_order: number;
};

export type SkillTest = {
  input?: unknown[];
  expected?: unknown;
  selector?: string;
  text?: string;
};

export type SkillChallenge = {
  id: string;
  lesson_id: string;
  title: string;
  prompt_md: string;
  starter_code: string;
  language: "javascript" | "html";
  tests: SkillTest[];
  sort_order: number;
};

export type SkillProgress = { lesson_id: string; completed_at: string };
export type SkillSubmission = { challenge_id: string; passed: boolean; created_at: string };

export type SkillContent = {
  tracks: SkillTrack[];
  lessons: SkillLesson[];
  challenges: SkillChallenge[];
  progress: SkillProgress[];
  submissions: SkillSubmission[];
};

export type CareerCategory = "stream" | "exam" | "career" | "scholarship" | "skill";

export type CareerResource = {
  id: string;
  slug: string;
  title: string;
  category: CareerCategory;
  stream: string | null;
  summary: string;
  content_md: string;
  link_url: string | null;
  min_class: string;
  max_class: string;
  sort_order: number;
};

export type ReadingPrefs = {
  fontScale: number;
  lineHeight: number;
  dyslexiaFont: boolean;
  highContrast: boolean;
  readAloud: boolean;
};
