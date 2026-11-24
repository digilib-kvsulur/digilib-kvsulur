# V2 Finish / Launch Checklist

Status: **in progress** (beta deployed on V2). Use this as the release gate for the V2 finish list.

## 1. Live V2 Supabase / schema
- [ ] Confirm target is V2 tenant/project; take backup/snapshot before applying migrations.
- [ ] Apply pending migrations to live V2 DB, especially:
  - `20261123100000_v2_study_resources_and_doubt_solver.sql`
  - `20261123160000_v2_review_study_materials.sql`
  - `20261124120000_idempotent_study_plan_rewards.sql`
  - `20261124140000_study_chapter_progress.sql`
  - `20261124150000_study_chapter_lessons.sql`
  - `20261124160000_study_chapter_practice.sql`
  - `20261124103000_search_books_include_isbn.sql` (catalog ISBN/cover/grouping support)
- [ ] Deploy/verify Edge Functions: `solve-study-doubt` (and any dependent functions).
- [ ] Verify secrets/env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, optional `GEMINI_VISION_MODEL`.
- [ ] Smoke test: tables/RPCs/policies/storage bucket privacy, `study_doubt_begin_request` rate limit, approved-only student reads, chapter progress upsert, doubt history insert/read/delete.
- [ ] Verify NCERT chapter index populated for Classes 6-12 in `ncert_books`.

## 2. Study content population
- [ ] Build coverage matrix: class x subject x chapter x resource type.
- [ ] Populate official NCERT links only (no hosted textbook copies).
- [ ] Add reviewed notes/formulas/revision/lessons/practice/PYQs with source metadata.
- [ ] Enforce review workflow: pending -> approved/needs revision; teacher review required; second review for formulas/derivations/exam answers.
- [ ] Do not label CBSE SQPs as PYQs; record source/session/year.

## 3. Catalog
- [x] ISBN-based Open Library cover fallback present in UI (`isbnCoverUrl`/`normalizeIsbn`).
- [x] Search RPC updated to include `isbn` (migration added; must be applied live).
- [x] Conservative duplicate/edition grouping added in catalog grid (ISBN-first, fallback normalized title+author+language) with “N editions” badge.
- [ ] Validate ISBN data quality across full catalog; backfill/correct invalid ISBNs.
- [ ] Run full-dataset edition grouping audit on live data (accession/copy/inventory preserved).
- [ ] Author normalization: extend rules from live data audit; avoid destructive renames without export/audit.

## 4. AI Doubt Solver
- [x] Function exists with auth, student role check, image validation, rate limit RPC, Gemini vision call, history save.
- [ ] Configure deployed V2 secrets/model and validate OCR, rate limits, history, subject/class prompts, citations/confidence behavior.
- [ ] Confirm student images/history are not used for training; logs redacted/minimized.

## 5. Auth/role flows
- [ ] Validate student/teacher/admin login, reset, role routing, guards, onboarding/setup behavior on deployed V2.
- [ ] Verify RLS/Edge Function authorization for study materials, doubt history, bookmarks, progress, admin actions.

## 6. Responsive QA
- [ ] Manual pass at 360, 390, 768, 1280, 1920: Study, Catalog, dashboards, nav, chat placement, dialogs/forms.
- [ ] Real Android + Windows checks: safe areas, keyboard, file open/download, assistant overlap.

## 7. Production readiness
- [ ] Error monitoring (Sentry or equivalent) + alerting.
- [ ] Privacy-conscious analytics/events.
- [ ] Backups/PITR/restore drill documented.
- [ ] RLS audit report for new V2 tables/functions/storage.
- [ ] Load/performance sanity checks for catalog/study/doubt flows.
- [ ] Accessibility audit (WCAG 2.2 AA targets).
- [ ] Deployment config/runbook/rollback documented.

## 8. Launch
- [ ] Pilot with students/teachers/admins; collect feedback.
- [ ] Finalize release communications; “DLMS V2” campaign label only, product remains “DLMS”.
- [ ] Go/no-go signoff with evidence links/screenshots/logs.
