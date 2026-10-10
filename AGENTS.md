# Agent notes

## Vacation Campaign (structural decision)

- **Database/RPC boundary:** Vacation submissions, reviews, point awards, streak bonuses and
  `profiles.points` changes happen ONLY through SECURITY DEFINER RPCs
  (`vacation_submit_activity`, `vacation_review_submission`). Clients have no direct
  INSERT/UPDATE/DELETE on `vacation_submissions`, `vacation_point_events` or
  `vacation_student_progress`. Never write to these tables from the UI.
- **Server-enforced rules:** role checks, school scoping, submission window (campaign timezone),
  one submission per student/day (`unique(activity_id, student_id)`), one award per submission
  (unique ledger index), one bonus per milestone. Rejected submissions may be resubmitted while
  the window is open.
- **Ledger is the source of truth;** `vacation_student_progress` is a cache rebuilt by
  `vacation_refresh_progress`. Streak = consecutive calendar days of approved activity dates.
- **Per-school only:** every table carries integer `school_id` (KV Sulur default **1787**, overridable
  later via `system_settings.vacation_school_id`; superadmin UI deferred) with composite FKs to
  the campaign. No cross-school registry. One active campaign per school. Tenant `profiles`
  have no `school_id` column.
- **Activities are admin-authored.** The poster ideas are seeded only as inactive drafts via
  `vacation_seed_poster_drafts`; students never see an activity until an admin sets a date,
  instructions, and activates it.
- **Shared UI module:** all vacation UI (admin tabs, student page, teacher review, promotion strip,
  overview banner) and RPC helpers live in [`src/features/vacation`](src/features/vacation).
  Dashboard pages are thin entry points.
- New public tables must ship with RLS enabled and explicit Data API grants.
- SQL checks: [`supabase/tests/vacation_campaign.sql`](supabase/tests/vacation_campaign.sql).
