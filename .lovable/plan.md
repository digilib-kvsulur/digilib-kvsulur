# Vacation Campaign Management

## Goal
Build the shared, per-school vacation campaign workflow. Admins can configure the campaign and promotions, publish daily activities, review submissions, award verified points, and track participation. Students can discover activities, submit work, see their streak and points, and compare rankings. Do not prefill or invent the ten daily activity themes; admins will create them.

## User-facing work
- Add a Vacation Campaign area to the admin navigation with campaign dates/status, site-wide promotional banner copy/link, daily activity editor, submission review queue, point/streak settings, leaderboard, participation analytics, and CSV export.
- Add a student Vacation area and a campaign promotion strip where appropriate. Show active day, instructions/reward, submission form/status, approved points, current vacation streak, and campaign standings.
- Keep submissions pending until a staff member approves them; provide rejection and editable point award during review. Prevent repeat awards and submissions outside configured windows.

## Technical details
- Add campaign, daily activity, submission/progress data and transactional database functions for student submissions and staff review/award. Enforce role checks, submission windows, one submission per student/day, and one award per submission on the server; maintain profile points and streak bonuses atomically.
- Use existing dashboard navigation, design components, authenticated database client, and notifications patterns. Provide tightly scoped Row Level Security and explicit Data API grants for every new public table.
- Record the structural database/RPC and shared UI module decision in `AGENTS.md`. Verify with existing project checks and preview diagnostics.

## Out of scope
- No prewritten day-by-day activity content, external advertising network, or platform-wide cross-school campaign registry. Promotions are controlled within this school's campaign and displayed across its site.
