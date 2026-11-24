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
- Keep all content writes behind teacher/admin permissions and the existing review gate. Do not use student-profile data to create or train content models.
- Release only after empty states explain the gap, the seeded official chapter index is verified, and the initial content batch has teacher review.
