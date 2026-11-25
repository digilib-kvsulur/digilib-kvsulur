import { supabase } from "@/integrations/supabase/client";
import type {
  CareerResource,
  CheckpointResult,
  DueFlashcards,
  ExamCountdown,
  Flashcard,
  FlashcardReward,
  LearningReport,
  MasterySummary,
  MockAttemptRow,
  MockResultResponse,
  MockStartResponse,
  MockSubmitResult,
  SkillContent,
  StudyResource,
  TodayResponse,
  WeekProgress,
  WeeklyGoal,
} from "./types";

const FRIENDLY: Array<[RegExp, string]> = [
  [/authentication required/i, "Please sign in again."],
  [/student access required/i, "Only student accounts can use this."],
  [/only students can claim/i, "Only student accounts can claim review rewards."],
  [/flashcard not found/i, "That card is no longer in your deck."],
  [/resource not found or not approved/i, "This resource is not available yet."],
  [/practice set not found|checkpoint not found|mock paper not found/i, "This resource is not available yet."],
  [/has no questions|has no sections|not valid json/i, "This resource is not ready yet. Please tell your teacher."],
  [/rating must be between/i, "Choose a rating between 1 and 4."],
  [/add at most/i, "Add fewer cards at a time."],
  [/daily submission limit/i, "You have reached today's practice limit. Try again tomorrow."],
  [/write some code/i, "Write some code before submitting."],
  [/goal values are out of range/i, "Those goal values are too large."],
  [/report range/i, "Choose a range of one year or less."],
  [/attempt not found/i, "That attempt could not be found."],
  [/already submitted/i, "This test was already submitted."],
  [/row-level security|permission denied/i, "You do not have permission to do that."],
  [/failed to fetch|networkerror|load failed/i, "You appear to be offline. Check your connection and try again."],
];

export function learningErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong. Please try again.";
  for (const [pattern, message] of FRIENDLY) {
    if (pattern.test(raw)) return message;
  }
  return raw;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(learningErrorMessage(error.message));
  return data as T;
}

export const fetchToday = () => rpc<TodayResponse>("student_today");
export const fetchExamCountdown = () => rpc<ExamCountdown>("student_exam_countdown");
export const fetchWeekProgress = () => rpc<WeekProgress>("study_week_progress");

export async function saveWeeklyGoal(input: { subject?: string; chapters: number; practice: number; minutes: number }): Promise<WeeklyGoal> {
  return rpc<WeeklyGoal>("study_set_weekly_goal", {
    p_subject: input.subject || "",
    p_chapters: input.chapters,
    p_practice: input.practice,
    p_minutes: input.minutes,
  });
}

export const fetchDueFlashcards = (limit = 30) => rpc<DueFlashcards>("study_flashcards_due", { p_limit: limit });

export async function addFlashcards(cards: Array<{ front: string; back: string; subject?: string; chapter_title?: string; source_kind?: string }>): Promise<{ added: number }> {
  return rpc<{ added: number }>("study_add_flashcards", { p_cards: cards });
}

export const seedFlashcardsFromResource = (resourceId: string) => rpc<{ added: number }>("study_seed_flashcards", { p_resource: resourceId });

export async function reviewFlashcard(cardId: string, rating: 1 | 2 | 3 | 4) {
  return rpc<{ due_at: string; interval_days: number; ease: number; reps: number; lapses: number }>("study_review_flashcard", {
    p_card: cardId,
    p_rating: rating,
  });
}

export const claimFlashcardReward = () => rpc<FlashcardReward>("claim_flashcard_reward");

export async function recordPracticeAnswer(resourceId: string, questionIndex: number, selectedIndex: number) {
  return rpc<{ recorded: boolean; correct_index: number; is_correct: boolean }>("study_record_practice_answer", {
    p_resource: resourceId,
    p_question_index: questionIndex,
    p_selected_index: selectedIndex,
  });
}

export const fetchMastery = (classNumber?: string) => rpc<MasterySummary>("study_mastery_summary", classNumber ? { p_class: classNumber } : undefined);

export async function submitCheckpoint(resourceId: string, answers: number[]) {
  return rpc<CheckpointResult>("study_chapter_checkpoint", { p_resource: resourceId, p_answers: answers });
}

export const startMock = (paperId: string) => rpc<MockStartResponse>("study_mock_start", { p_paper: paperId });

export async function submitMock(attemptId: string, answers: Record<string, number | string | null>) {
  return rpc<MockSubmitResult>("study_mock_submit", { p_attempt: attemptId, p_answers: answers });
}

export const fetchMockResult = (attemptId: string) => rpc<MockResultResponse>("study_mock_result", { p_attempt: attemptId });

export async function fetchLearningReport(from?: string, to?: string) {
  return rpc<LearningReport>("student_learning_report", {
    ...(from ? { p_from: from } : {}),
    ...(to ? { p_to: to } : {}),
  });
}

export async function logLearningEvent(event: string, entityType?: string, entityId?: string, metadata?: Record<string, unknown>) {
  try {
    await rpc<void>("study_log_event", {
      p_event: event,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_metadata: metadata || {},
    });
  } catch {
    // Analytics must never block a learning action.
  }
}

export async function fetchLearningResources(classNumber: string, types: string[], subject?: string): Promise<StudyResource[]> {
  let query = (supabase as any)
    .from("study_materials")
    .select("id,title,description,subject,student_class,chapter_title,topic,resource_type,marks,source_label,source_url,markdown_content,file_url,updated_at")
    .eq("review_status", "approved")
    .in("student_class", [classNumber, "All"])
    .in("resource_type", types)
    .order("subject", { ascending: true })
    .order("chapter_title", { ascending: true });
  if (subject) query = query.eq("subject", subject);
  const { data, error } = await query;
  if (error) throw new Error(learningErrorMessage(error.message));
  return (data || []) as StudyResource[];
}

export async function fetchMockAttempts(): Promise<MockAttemptRow[]> {
  const { data, error } = await (supabase as any)
    .from("study_mock_attempts")
    .select("id,paper_id,subject,status,score,max_score,section_scores,started_at,expires_at,submitted_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(learningErrorMessage(error.message));
  return (data || []) as MockAttemptRow[];
}

export async function fetchSkillContent(userId: string): Promise<SkillContent> {
  const [tracks, lessons, challenges, progress, submissions] = await Promise.all([
    (supabase as any).from("skill_tracks").select("id,slug,title,summary,description,icon,accent,min_class,max_class,sort_order").eq("published", true).order("sort_order"),
    (supabase as any).from("skill_lessons").select("id,track_id,slug,title,summary,content_md,est_minutes,sort_order").eq("published", true).order("sort_order"),
    (supabase as any).from("skill_challenges").select("id,lesson_id,title,prompt_md,starter_code,language,tests,sort_order").eq("published", true).order("sort_order"),
    (supabase as any).from("skill_progress").select("lesson_id,completed_at").eq("user_id", userId),
    (supabase as any).from("skill_submissions").select("challenge_id,passed,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ]);

  const firstError = [tracks.error, lessons.error, challenges.error, progress.error, submissions.error].find(Boolean);
  if (firstError) throw new Error(learningErrorMessage(firstError.message));

  return {
    tracks: (tracks.data || []) as SkillContent["tracks"],
    lessons: (lessons.data || []) as SkillContent["lessons"],
    challenges: (challenges.data || []).map((row: any) => ({ ...row, tests: Array.isArray(row.tests) ? row.tests : [] })) as SkillContent["challenges"],
    progress: (progress.data || []) as SkillContent["progress"],
    submissions: (submissions.data || []) as SkillContent["submissions"],
  };
}

export async function completeSkillLesson(lessonId: string) {
  return rpc<{ completed: boolean; already_completed: boolean; awarded: number; lessons_today?: number }>("skill_complete_lesson", { p_lesson: lessonId });
}

export async function submitSkillChallenge(challengeId: string, code: string, passed: boolean, output: string) {
  return rpc<{ saved: boolean; first_submission: boolean; awarded: number }>("skill_submit_challenge", {
    p_challenge: challengeId,
    p_code: code,
    p_passed: passed,
    p_output: output.slice(0, 4000),
  });
}

export async function fetchCareerResources(): Promise<CareerResource[]> {
  const { data, error } = await (supabase as any)
    .from("career_resources")
    .select("id,slug,title,category,stream,summary,content_md,link_url,min_class,max_class,sort_order")
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(learningErrorMessage(error.message));
  return (data || []) as CareerResource[];
}

export async function fetchCareerBookmarks(userId: string): Promise<string[]> {
  const { data, error } = await (supabase as any).from("career_bookmarks").select("resource_id").eq("user_id", userId);
  if (error) throw new Error(learningErrorMessage(error.message));
  return (data || []).map((row: any) => row.resource_id as string);
}

export async function toggleCareerBookmark(userId: string, resourceId: string, saved: boolean) {
  const result = saved
    ? await (supabase as any).from("career_bookmarks").delete().eq("user_id", userId).eq("resource_id", resourceId)
    : await (supabase as any).from("career_bookmarks").insert({ user_id: userId, resource_id: resourceId });
  if (result.error) throw new Error(learningErrorMessage(result.error.message));
}

export async function fetchReadingPrefs(userId: string) {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("reading_prefs,data_saver")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(learningErrorMessage(error.message));
  return {
    prefs: (data?.reading_prefs || {}) as Record<string, unknown>,
    dataSaver: Boolean(data?.data_saver),
  };
}

export async function saveReadingPrefs(userId: string, prefs: Record<string, unknown>) {
  const { error } = await (supabase as any).from("profiles").update({ reading_prefs: prefs }).eq("id", userId);
  if (error) throw new Error(learningErrorMessage(error.message));
}

export async function saveDataSaver(userId: string, enabled: boolean) {
  const { error } = await (supabase as any).from("profiles").update({ data_saver: enabled }).eq("id", userId);
  if (error) throw new Error(learningErrorMessage(error.message));
}

export type FlashcardCard = Flashcard;
