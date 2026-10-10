export type VacationCampaignStatus = "draft" | "active" | "paused" | "ended";
export type VacationSubmissionStatus = "pending" | "approved" | "rejected";

export interface VacationCampaign {
  id: string;
  school_id: number;
  title: string;
  status: VacationCampaignStatus;
  start_date: string;
  end_date: string;
  timezone: string;
  default_points: number;
  max_award_points: number;
  banner_enabled: boolean;
  banner_text: string | null;
  banner_link: string | null;
  created_at: string;
}

export interface VacationStreakMilestone {
  id: string;
  campaign_id: string;
  school_id: number;
  days: number;
  bonus_points: number;
}

export interface VacationActivity {
  id: string;
  campaign_id: string;
  school_id: number;
  title: string;
  instructions: string | null;
  reward_points: number | null;
  activity_date: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface VacationSubmission {
  id: string;
  campaign_id: string;
  activity_id: string;
  school_id: number;
  student_id: string;
  content: string | null;
  link: string | null;
  status: VacationSubmissionStatus;
  attempts: number;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  points_awarded: number | null;
  student_name?: string;
}

export interface VacationStudentOverview {
  campaign: {
    id: string;
    title: string;
    status: VacationCampaignStatus;
    start_date: string;
    end_date: string;
    banner_enabled: boolean;
    banner_text: string | null;
    banner_link: string | null;
  } | null;
  today?: string;
  activity?: {
    id: string;
    title: string;
    instructions: string | null;
    reward_points: number;
    opens_at?: string;
    closes_at?: string;
    window_open?: boolean;
  } | null;
  submission?: VacationSubmission | null;
  progress?: {
    total_points: number;
    approved_count: number;
    current_streak: number;
    longest_streak: number;
  };
  history?: {
    activity_id: string;
    title: string;
    date: string | null;
    status: VacationSubmissionStatus;
    points_awarded: number | null;
    review_note: string | null;
  }[];
}

export interface VacationLeaderboardRow {
  rank: number;
  student_id: string;
  display_name: string;
  total_points: number;
  approved_count: number;
  longest_streak: number;
  is_me: boolean;
}

export interface VacationParticipationStats {
  participating_students: number;
  total_submissions: number;
  points_awarded: number;
  by_activity: {
    activity_id: string;
    title: string;
    date: string | null;
    submitted: number;
    pending: number;
    approved: number;
    rejected: number;
  }[];
}

export interface VacationExportRow {
  activity_date: string | null;
  activity_title: string;
  student_name: string;
  status: string;
  points_awarded: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}
