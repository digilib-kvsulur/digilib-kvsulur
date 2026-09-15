// Shared types for the Community module.
// Extracted here to break the circular import between Community.tsx and ReelViewer.tsx.

export interface PollOption {
  id: string;
  label: string;
  sort_order: number;
  votes: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  author?: any;
  likes: number;
  liked: boolean;
  comment_count: number;
  media_url?: string;
  media_type?: string;
  is_pinned?: boolean;
  post_type?: string;
  poll_ends_at?: string | null;
  pollOptions?: PollOption[];
  myVoteOptionId?: string | null;
  doubt_subject?: string;
  doubt_class?: string;
  doubt_status?: "unsolved" | "solved";
  accepted_comment_id?: string | null;
  scheduled_for?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author?: any;
  is_accepted_solution?: boolean;
}
