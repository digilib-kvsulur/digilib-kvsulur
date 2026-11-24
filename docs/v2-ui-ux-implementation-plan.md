# DLMS V2 UI/UX implementation plan

## Product experience goal

Make DLMS easier to understand and complete on phones, tablets, and desktops while keeping its blue/violet library identity. Students should quickly know where to go next; teachers should see their class work and reviews; admins should be able to finish circulation and people-management tasks without searching across unrelated screens. “V2” remains a launch label and does not appear in the product UI.

## Immediate change: one learning entry point

Student learning currently appears as separate navigation entries for Study, Study Materials, NCERT Books, and Chapter Study. This creates parallel starting points. The primary Learning menu should instead lead with:

1. **Study** — choose class → subject → chapter → see the official NCERT link and all approved chapter resources.
2. **Ask a doubt** — solve a question with class and subject context, then link back to the matching Study chapter.
3. **Study Tracker** — manage time and daily study tasks.
4. **My Notes** — personal notes.

Older `?tab=materials`, `?tab=ncert`, and `?tab=study-guide` links remain valid during transition, but those screens should not compete with Study in primary navigation. The Study page should clearly distinguish official textbook links from DLMS-authored material and state when teacher-reviewed resources have not been added.

### Canonical Study flow

The student flow is deliberately linear: **Study → class (preselected to the student's class) → subject → chapter → chapter pack**. Subject is the first learning choice. Do not put separate NCERT, notes, formula-sheet, PYQ, or chapter-study destinations beside Study in student navigation. The selected chapter page combines:

- the official NCERT chapter link, clearly marked as NCERT;
- all approved DLMS resources for that class, subject, chapter, and academic session;
- interactive chapter practice with per-question answer checks and explanations, kept separate from scored quizzes and points;
- visible resource-type counts on chapter cards, so students can tell what exists before opening it;
- a useful empty state that keeps the textbook link available and explains that DLMS notes appear only after a teacher or admin adds and approves them.

Keep Ask a doubt as a secondary action from Study, with a return path to the resource page. Keep Study Tracker and My Notes as personal tools, not alternate content catalogs. Old tabs can continue resolving to their existing screens for bookmarked links, but should route students toward the canonical flow when those screens are next revised.

### Full reform backlog and acceptance order

1. **Learning navigation and content discovery:** make Study the single catalog entry; show class, subject, chapter, textbook, resource availability, and a clear back path; verify no parallel links remain in home shortcuts, mobile navigation, or desktop navigation.
2. **Learning chapter experience:** group materials by type, keep the NCERT link at the top, support bookmarks and search, render math, provide interactive practice with answer explanations, preserve chapter context when returning from the doubt solver, and show an explicit progress state.
3. **Student home and mobile shell:** prioritize the next useful action, active loans, resume-study, and current tasks; use a five-item mobile bar with consistent labels, safe areas, and no horizontal overflow.
4. **Teacher workbench:** prioritize assigned classes, assignments, pending reviews, and chapter coverage; let staff add/edit resources with source, academic session, review status, and class/subject/chapter tags visible together.
5. **Admin workbench:** prioritize approvals, overdue circulation, requests, study-content review, and operational alerts; move infrequent setup into settings and make bulk-action scope explicit.
6. **Shared interaction and accessibility pass:** standardize page headers, filters, cards, badges, forms, loading/error/empty/success states, dialogs, and notifications; verify keyboard and screen-reader use, contrast, 44 px touch targets, browser zoom, reduced motion, and long text/math.
7. **Journey validation:** walk the same student, teacher, and admin tasks at 360, 390, 768, 1024, and 1440 px, then verify on real Android and Windows targets. Record failed steps and fix those before decorative polish.

Each stage is accepted by task completion rather than appearance alone: a student can reach and open the correct chapter pack; a teacher can find and review missing coverage; an admin can process a real queue item and understand the result. Retain the DLMS blue/violet visual identity throughout.

## Role navigation and home screens

### Student

- Home answers “What should I do next?” with due loans, active reading assignment, resume-study, upcoming event, and recent progress.
- Primary navigation groups: Home, Learning, Library, Explore, Help & Account.
- Learning opens the single Study path above. Search and notifications remain consistently available.
- Community and friends chat stay hidden while their feature flag is off, including mobile navigation and direct entry points.

### Teacher

- Home prioritizes assigned classes, reading assignments, items to review, and upcoming deadlines.
- Primary navigation groups: Classes, Learning Support, Activities, Communication, Help & Account.
- Study content upload and review show clear class scope, status, source, version, and next action.

### Admin

- Home is an operational action center: pending access approvals, requests/renewals, overdue loans, study reviews, and support tickets.
- Primary navigation groups: Library Operations, People, Learning & Engagement, Events & Programs, Reports & Settings.
- Rare configuration stays out of the primary action area. Destructive or bulk actions state scope and result before commit.

## Shared visual and interaction system

- Preserve the current DLMS blue-to-violet identity, calm surfaces, and rounded cards; standardize tokens for type scale, spacing, content width, border, radius, shadows, icons, and focus rings.
- Define reusable page headers, section headings, filters, resource cards, status badges, empty states, error states, confirmation dialogs, and success feedback.
- Use 44 px minimum touch targets, visible keyboard focus, semantic heading order, accessible labels, and WCAG 2.2 AA contrast.
- Keep phone layouts single-column, use drawers/sheets for secondary navigation, and prevent page-level horizontal scrolling. Use denser tables and persistent side navigation only when there is room.
- Respect reduced-motion settings and keep transitions brief. Reflow formula and table content locally rather than forcing the whole page to scroll sideways.
- Every core journey has loading, empty, no-result, offline, permission, recoverable-error, and success feedback where relevant.

## Screen-level work order

### Phase 1 — navigation and learning clarity

- Consolidate student Study entry points and preserve old deep links.
- Make class, subject, chapter, textbook, and resource hierarchy visible as a breadcrumb/progress path.
- Show resource availability counts and distinguish official NCERT material from DLMS-reviewed content.
- Replace vague empty copy with the next useful action and an official source link.
- Link doubt-solver answers and similar PYQs back to the selected Study chapter.

### Phase 2 — role home and mobile navigation

- Rework student, teacher, and admin homes around next actions and current status.
- Trim secondary navigation; ensure the most frequent tasks are reachable in one or two taps.
- Add consistent page titles and back behavior for nested flows.
- Review Android and Windows layouts, safe areas, keyboard behavior, dialogs, and file opening.

### Phase 3 — core journeys

- Book discovery → availability → request/borrow.
- Issued books → due date → renew/return next step.
- Study → chapter → official text/material → practice → progress.
- Teacher assignment/review → student follow-up.
- Admin request/circulation processing → visible outcome and audit trail.

### Phase 4 — polish and release readiness

- Standardize form validation, empty/error/success states, responsive tables, loading skeletons, and notification language.
- Check keyboard-only use, screen reader labels, contrast, browser zoom, long content, and reduced motion.
- Walk the six roadmap journeys at 360, 390, 768, 1024, and 1440 px, then verify on real Android and Windows targets.
- Use short student, teacher, and librarian sessions to record failed steps and revise before launch.

## Learning materials and AI drafting workflow

DLMS should not present a large generated corpus as complete or authoritative. Use AI tools such as Claude as **drafting assistants** for teacher-authored explanations, formula examples, revision notes, and original practice questions. For each draft:

1. Attach the board, academic session, class, subject, chapter, learning objective, and source references.
2. Instruct the model not to reproduce textbook passages, figures, or restricted question/marking-scheme content; create original explanations and examples.
3. Have a subject teacher compare facts, formulas, worked steps, language level, and syllabus alignment to current official material.
4. Require a second reviewer for exam solutions and derivations; label official text, teacher-authored, DLMS-authored, and AI-assisted content accurately.
5. Publish only after approval. Show source and review date; version corrections and retain a review trail.
6. Track class/subject/chapter coverage and mark missing resources honestly. Generate content in small, reviewable batches instead of promising all grades at once.

Link to official NCERT chapter files rather than uploading or republishing their books. Use CBSE's current curriculum and sample-paper/marking-scheme pages for the applicable class and session; verify each year's status before labeling content current. Keep student data and doubt history out of model training by default.

## Measures

- Students can locate the right chapter and official text without help.
- Completion and error rate for book, study, teacher review, and admin journeys.
- Time to find a chapter or process a common library task.
- Mobile page overflow, inaccessible controls, failed file opens, and help requests.
- Learning-content coverage by class/subject/chapter, review freshness, and correction rate.
- Student-reported clarity and teacher-reported accuracy; do not substitute page visits for learning outcomes.

## Current constraints and release gates

- The repository has an NCERT chapter-index migration, but the tenant must have applied it for rows to appear.
- The `study_materials` table has no general chapter pack seeded. Approved materials appear only after teachers/admins add and approve them.
- Before claiming broad coverage, verify the live tenant's class/subject/chapter matrix and whether the content migrations are applied.
- If Study shows no subjects or NCERT chapters, first apply the v2 migrations to the v2 tenant and verify the `ncert_books` rows for the student's class. If chapters appear but DLMS notes/formulas/PYQs do not, that is expected until a staff-reviewed content batch is imported and approved; generating drafts alone does not publish them.
- Keep all content writes behind teacher/admin permissions and the existing review gate. Do not use student-profile data to create or train content models.
- Use Claude or another model only to draft original, source-cited resources from a fixed coverage template. Start with one class and one subject, teacher-check the output, second-check formulas and exam answers, import as pending review, then approve. Do not ask a model to make a full unverified corpus or reproduce NCERT books, diagrams, sample papers, PYQs, or marking schemes. The current drafting guide is `docs/ai-study-content-drafting-prompt.md`.
- Release only after empty states explain the gap, the seeded official chapter index is verified, and the initial content batch has teacher review.
