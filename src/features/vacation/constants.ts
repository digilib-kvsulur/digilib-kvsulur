export const VACATION_SCHOOL_ID_DEFAULT = 1787;
export const VACATION_BANNER_DISMISS_KEY = "vacation_banner_dismissed";
export const VACATION_ERROR_MESSAGES: Record<string, string> = {
  outside_submission_window: "Submissions are closed for this activity right now.",
  already_submitted: "You already submitted today's activity.",
  already_awarded: "This submission was already reviewed by another staff member.",
  already_reviewed: "This submission was already reviewed by another staff member.",
  forbidden: "You do not have permission to do that.",
  students_only: "Only students can submit vacation activities.",
  activity_not_available: "This activity is not available.",
  campaign_not_active: "The vacation campaign is not active.",
  empty_submission: "Add a short write-up or a link before submitting.",
  invalid_link: "Links must start with http:// or https://.",
  rejection_reason_required: "A rejection reason is required.",
  invalid_points: "Points must be between 0 and the campaign maximum.",
  invalid_decision: "Choose approve or reject.",
  date_outside_campaign: "Activity dates must fall inside the campaign dates.",
  date_required_to_activate: "Set a date before activating an activity.",
  instructions_required_to_activate: "Add instructions before activating an activity.",
  cannot_move_activity_with_submissions: "This activity already has submissions, so its date cannot change.",
  not_authenticated: "Sign in again to continue.",
  submission_not_found: "That submission could not be found.",
};
