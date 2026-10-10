# Agent notes — KV Sulur DLMS

## Vacation Campaign

Feature module: `src/features/vacation/`
Thin dashboard mounts:
- Admin: `src/pages/AdminDashboard.tsx` tab `vacation` → `VacationAdminPage`
- Teacher (review/analytics only): `src/pages/TeacherDashboard.tsx` tab `vacation` → `VacationAdminPage canConfigure={false}`
- Student: `src/pages/StudentDashboard.tsx` tab `vacation` → `VacationStudentPage`
- Overview banner / promo strip: `VacationOverviewBanner`, `VacationPromoStrip`
- PWA centre nav: `src/components/dashboard/MobileBottomNav.tsx` when a campaign is `active`

Migration: `supabase/migrations/20261010150000_vacation_campaign.sql`

This app is **one Supabase project per school**. There is no `profiles.school_id`. One **active** campaign per tenant (`vacation_one_active_campaign`). Do not add a platform-wide registry.

### Tables
- `vacation_campaigns` — title, dates, timezone (`Asia/Kolkata` default), status (`draft|active|paused|ended`), default/max points, banner fields
- `vacation_streak_milestones` — admin-authored consecutive-day bonuses (no defaults)
- `vacation_activities` — admin-authored; students see a row only when `is_active` and the campaign is `active`
- `vacation_submissions` — one row per student per activity; resubmit reopens a rejected row
- `vacation_point_events` — ledger (`activity` / `streak_bonus`); unique award per submission; unique bonus per milestone
- `vacation_student_progress` — points, counts, streaks

Clients may **SELECT** `vacation_submissions`, `vacation_point_events`, `vacation_student_progress` only. Writes go through RPCs. Admins write campaigns / milestones / activities under RLS.

### RPCs
- `vacation_submit_activity(p_activity, p_content, p_link)` — students; enforces window in campaign timezone
- `vacation_review_submission(p_submission, p_decision, p_points, p_note)` — admin/teacher; approve awards `profiles.points` + streak bonuses in one transaction
- `vacation_seed_poster_drafts(p_campaign)` — admin; inserts 10 inactive poster ideas if the campaign has no activities
- `vacation_student_overview()`
- `vacation_leaderboard(p_campaign, p_limit)` — names and points; always includes the caller
- `vacation_participation_stats(p_campaign)` — staff
- `vacation_export_rows(p_campaign)` — staff

Helpers: `vacation_is_staff()`, `vacation_is_admin()`, `vacation_my_role()`. Notifications: `notify_user` via `vacation_notify`.

Roles: `profiles.role` is `student` | `teacher` | `admin`. Teachers may review and view analytics; they cannot edit campaign, promotion, or activities.

SQL tests: `supabase/tests/vacation_campaign.sql` (run in the SQL editor as postgres after applying the migration). Cross-school access is tenant isolation, not a column check.
