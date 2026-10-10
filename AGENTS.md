# DLMS agent notes

## Vacation Campaign

Tenant databases have **no `profiles.school_id`**. Each school is its own Supabase project, so vacation tables are tenant-local and do not carry `school_id`. One **active** campaign per tenant (`vacation_one_active_campaign`).

### Module

`src/features/vacation/` — pages, API helpers, types, CSV export, error mapping. Dashboards stay thin:

- Admin: `src/pages/AdminDashboard.tsx` tab `vacation` → `VacationAdminPage`
- Teacher (staff, not admin): `src/pages/TeacherDashboard.tsx` tab `vacation` → `VacationAdminPage canConfigure={false}` (review + analytics only)
- Student: `src/pages/StudentDashboard.tsx` tab `vacation` → `VacationStudentPage`, overview banner, promo strip, centre PWA nav button while a campaign is `active`

### Tables

`vacation_campaigns`, `vacation_streak_milestones`, `vacation_activities`, `vacation_submissions`, `vacation_point_events`, `vacation_student_progress`

Clients may **SELECT** submissions, point events, and progress. Writes to those three tables go through RPCs. Admins write campaigns, milestones, and activities under RLS.

### RPCs

- `vacation_submit_activity(p_activity, p_content, p_link)` — students only; enforces window, one row per student per activity, resubmit after reject
- `vacation_review_submission(p_submission, p_decision, p_points, p_note)` — staff (`admin`/`teacher`); approve awards `profiles.points` + streak bonuses atomically; unique ledger indexes block double awards
- `vacation_seed_poster_drafts(p_campaign)` — admin; seeds the 10 poster ideas as inactive undated drafts when the campaign has no activities
- `vacation_student_overview()`, `vacation_leaderboard(p_campaign, p_limit)`, `vacation_participation_stats(p_campaign)`, `vacation_export_rows(p_campaign)`

Notifications use `public.notify_user` via `vacation_notify`.

Display names are `first_name` + `last_name`. Roles are `profiles.role`: `student` | `teacher` | `admin`.

### SQL tests

Run `supabase/tests/vacation_campaign.sql` as a database owner (rolls back). Tenant isolation replaces a cross-school registry test.
