# DLMS launch roadmap

## Product identity

The product remains **DLMS** in the app, platform listings, URLs, and documentation. **DLMS V2** is a launch-campaign label for announcements and launch graphics only; it does not appear as a persistent in-product name or badge. The old `main` branch remains the paused, stable version while new work proceeds on `v2`.

## Product goal

Deliver a substantial improvement to DLMS with a clearer, faster, more welcoming experience across phones, tablets, desktop browsers, Android, and Windows, plus new features that address validated student, teacher, and library needs. Keep the DLMS visual identity and protect existing school data and workflows.

## Existing foundation

DLMS already includes student, teacher, and admin dashboards; catalog and circulation; reading history and goals; quizzes and study materials; community and chat; games; events; points, badges, and certificates; vacation campaigns; reports; and PWA, Android, and Windows delivery. V2 should connect and improve these capabilities before adding overlapping modules.

## New feature proposals

### First-release candidates

1. **Unified search:** find books, learning materials, quizzes, events, and help from one entry point, with filters and useful no-result guidance.
2. **Personal reading plan:** set a reading goal, choose books, record progress, and reflect on completion, integrated with current reading history and goals.
3. **Role-based task inbox:** show actionable items such as due dates, request updates, learning tasks, pending reviews, and event deadlines, linking directly to the relevant action.
4. **Loan timeline:** give students a clear view of request, approval, issue, renewal, return, due date, and next steps.
5. **Teacher reading assignments:** assign a book or curated list to a class, set a due date, and review completion with explicit student-visibility rules.
6. **Admin action center:** prioritize pending requests, overdue follow-up, approvals, and operational notices; support bulk actions only with clear permission and audit behavior.
7. **Syllabus learning and PYQ workspace:** give each student a structured, class/board/subject-aligned path through syllabus topics, chapter lessons, formulas, practice, and previous-year questions with worked answers. See the dedicated plan below.

### Later candidates to validate

- Explainable book recommendations with student controls.
- Saved lists and collections, with clear sync status if offline edits are supported.
- A private-by-default reading reflection journal with explicit sharing controls.
- Teacher insight summaries that show source data and avoid opaque risk scoring.
- Library demand and circulation insights with documented metric definitions.
- Family access only after identity linking, consent, age, visibility, and safeguarding rules are agreed.

These are candidates, not a commitment to ship all at once. Each proposal must define user evidence, role, complete UX flow, data/RPC changes, permissions/RLS, accessibility, notifications, success measures, rollout, and rollback. Avoid duplicating current quizzes, materials, community, games, events, or vacation campaigns.

## Syllabus, chapter learning, formulas, and PYQs

### Student outcome

Students should be able to study a subject from DLMS itself: understand the syllabus and what to study next, learn every chapter in a clear sequence, revise key terms and formulas, practice with feedback, and study previous-year questions with accurate, step-by-step answers. DLMS should support learning and exam preparation, not claim to replace the official textbook, teacher, or board material.

### Learning experience

1. **Study home:** show the student's class, board/curriculum, subjects, completion by chapter, upcoming targets, resume-study action, and recent practice. Let the student choose a subject and continue where they left off.
2. **Syllabus map:** organize by academic year → subject → unit/chapter → learning objectives/topics. Clearly identify official syllabus source and version, academic year, and last-reviewed date. Mark chapters as not started, in progress, needs revision, or complete; completion is based on learning activity, not just opening a page.
3. **Chapter learning path:** each chapter has a short overview, prerequisite concepts, learning objectives, bite-sized lessons, examples, key vocabulary, diagrams where useful, a recap, practice, and a mastery check. Keep lessons readable on small screens and save progress.
4. **Formula and concept sheet:** provide searchable, subject/chapter-linked formula cards with notation, units, definitions, assumptions, a worked example, and common mistakes. Support accessible math rendering, copy/share where appropriate, and printable revision sheets. Never show a formula without context or unit guidance when units apply.
5. **PYQ library:** filter previous-year questions by board, class, subject, chapter/topic, year, exam, and marks. Label the source and year. Provide question view, marks/expected points where available, answer reveal, step-by-step explanation, and links to related lessons/formulas. Distinguish official marking-scheme content from DLMS-authored explanations.
6. **Practice and revision:** offer topic practice, mixed revision, timed mock sets, and spaced review of mistakes. Give immediate explanations, not just right/wrong marks. Let students retry and bookmark difficult questions. Any rewards use existing point rules and server-side duplicate protection.
7. **Study assistant (later, guarded):** answer questions only from approved syllabus lessons, textbook extracts, formula sheets, and vetted PYQ solutions; cite the exact source/chapter/section. When evidence is missing or uncertain, say so and route the student to a teacher or source. It must not invent board answers or silently substitute generated content for reviewed learning material.
8. **Teacher support:** teachers can view class-level completion and question difficulty, assign chapters or practice sets, and review student work only within their authorized class scope. Provide an explanation or correction workflow for content feedback.

### Content structure and governance

Use a content model with explicit curriculum/board, academic year, grade/class, subject, unit, chapter, topic, learning objective, lesson, formula/concept, question, answer/solution, source citation, review status, and version. Content changes are versioned so progress remains intelligible when syllabus materials update.

- Establish a syllabus and source register for each supported board/class/year before promising full coverage.
- Respect copyright and licensing for textbooks, exam questions, diagrams, and marking schemes; store provenance and usage rights. Do not scrape or reproduce restricted material without permission.
- Author or adapt explanations with subject-teacher review. Require a second review for exam answers, mathematical derivations, and safety-sensitive content.
- Label content as official excerpt, teacher-authored, DLMS-authored, or AI-assisted; show reviewer and review date where appropriate.
- Provide report/correction controls and an admin/teacher moderation queue; corrections create a new version with an audit trail.
- Start with a limited pilot (one selected class/board and a few subjects/chapters) and expand coverage only as reviewed content is available. Do not market “every chapter” until the coverage matrix demonstrates it.

### Model and AI plan

“Train the model” should mean a staged, evidence-grounded learning assistant, not immediately training a foundation model on student data. Start with vetted curriculum content and retrieval-augmented answers; this is easier to update, cite, audit, and correct than fine-tuning. Fine-tuning is a later option only if measured gaps remain after retrieval and prompt/content improvements.

1. Build a permissioned, versioned corpus from licensed and teacher-reviewed material, segmented by curriculum, class, subject, chapter, and section with source metadata.
2. Retrieve only content applicable to the student's selected class/curriculum and current query. Return citations into the source material, and record the content version used.
3. Use a constrained answer format: explanation in age-appropriate steps, formula/definition when relevant, worked example, cited sources, confidence/coverage boundary, and a prompt to ask a teacher when unsupported.
4. Evaluate before release with teacher-authored question sets covering factual accuracy, math correctness, citation validity, syllabus alignment, reading level, refusal/uncertainty, and harmful or off-topic requests. Track answer quality separately by subject and chapter.
5. Keep student personal data out of training by default. Minimize and redact logs, set retention limits, restrict staff access, and do not use conversations for model training without a clear, approved consent and governance basis.
6. Add teacher feedback (helpful/not helpful, correction, missing source) to a review queue. Feedback informs content corrections and evaluation; it does not automatically become training data.
7. Monitor citation coverage, answer corrections, refusal rate, latency, cost, and subject-specific error reports. Pause the assistant for a subject if quality falls below its agreed threshold.
8. Consider fine-tuning only on licensed, reviewed examples after an evaluation shows a specific benefit that retrieval cannot provide. Version datasets/models, document exclusions, test regressions, and retain a rollback path.

### Learning UX and responsive views

- **Phone:** one-column chapter reader, persistent but unobtrusive progress, formula cards that reflow, answer steps revealed progressively, and a bottom action for continue/practice. Avoid tiny side-by-side math or dense tables.
- **Tablet:** lesson and contents navigation side by side where space allows; optional split view for PYQ and solution.
- **Desktop:** syllabus tree alongside lesson/content, with a focused reading width and optional reference panel for formulas or notes.
- **All devices:** math content must wrap/scroll locally without page overflow; diagrams need text descriptions; saving progress and offline availability must show clear state. Do not promise full offline AI responses; cached approved lessons and saved questions can be available offline, with assistant access requiring connectivity unless a supported local model is separately evaluated.

### Rollout and measures

Start with one pilot curriculum/class, then a small set of subjects and chapters with complete reviewed coverage. Expand in gates: syllabus map → authored chapter lessons and formula sheets → PYQ questions with cited solutions → practice and progress → constrained study assistant → additional grades/subjects. Measure chapter completion, return-to-study rate, practice improvement, PYQ usage, student-reported clarity, teacher corrections, answer citation validity, content coverage/review freshness, and subject-specific error rates. Compare learning checks before and after practice; do not use time-on-page as a learning outcome.

### Dependencies and release gate

Before implementation, decide supported boards/classes and academic year; identify textbook and PYQ rights; appoint subject reviewers; choose approved content sources and model provider/runtime; define age-appropriate AI safeguards and privacy/retention policy; and specify who maintains curriculum updates. No AI study assistant launches until source coverage, citations, evaluation, correction workflow, and pause/rollback controls are in place.

## Full UI/UX reform

### Keep and refine the DLMS theme

Retain the current blue-to-violet primary treatment, calm light surfaces, rounded cards, and familiar library character. Improve consistency, visual hierarchy, readability, and status clarity; do not introduce a disconnected visual identity. Keep “V2” out of product UI. Standardize typography, spacing, content widths, card padding, borders, radii, shadows, icons, forms, tables, dialogs, notifications, and empty/loading/error states. Use motion sparingly and respect reduced-motion preferences. Keep light and dark themes accessible.

### Role-based information architecture

- **Students:** Reading, Learning, Community, Achievements, and a focused home answering “what can I do next?” with current loans, reading progress, learning tasks, and a few relevant recommendations.
- **Teachers:** Classes, Learning Support, Activities, and Communication; prioritize class overview, assignment progress, and pending review.
- **Admins:** Library Operations, People, Learning & Engagement, Events & Programs, Reports & Settings; prioritize circulation queues and frequent work, with rare configuration tools grouped separately.
- Keep search, notifications, profile, and help consistent across authenticated areas. Preserve direct links and provide safe handling for old tab URLs.

### Responsive behavior

| Viewport | Layout and navigation | Experience requirements |
|---|---|---|
| 320–389 px | Single column; compact bottom navigation for primary student tasks; sheets/drawers for secondary areas | No page-level horizontal scroll; touch targets at least 44 px; mobile keyboards and safe areas handled |
| 390–767 px | Single column with selective two-column cards | Keep key actions reachable; dialogs fit viewport and account for keyboard |
| 768–1023 px | Collapsible side navigation; two-column overview; split list/detail where useful | Touch and keyboard support; avoid dense desktop tables |
| 1024 px+ | Persistent role sidebar; centered content with intentional max width; multi-column dashboards | Efficient tables, shortcuts, visible focus, and keyboard navigation |
| Android / Windows | Same responsive foundation with platform-appropriate navigation, links, and file handling | Verify real builds, resizing, safe areas, downloads, and dialogs |

Use content-driven breakpoints. Validate portrait and landscape phones and tablets; do not merely shrink desktop screens.

### Accessibility and interaction quality

Target WCAG 2.2 AA for contrast, keyboard operation, visible focus, labels, and error identification. Use plain language and consistent verbs. Provide semantic headings, screen-reader names, logical focus order, and accessible alternatives for charts and tables. Every core flow needs loading, empty, no-results, offline, permission-denied, recoverable-error, success, and confirmation states as appropriate.

### Catalog and dashboard audit actions

- Keep catalog discovery focused: search, Genre, Class, and Availability are the primary controls; place subject, language, author, and sorting in a clearly named “More filters” sheet/dialog. Show active filters and a clear-all action when the filter state is redesigned.
- Use “Available” and “All issued” status labels, show “NEW” only for titles added in the past 14 days, and make rating, issue-count, and save controls readable and touch accessible.
- Replace repeated grey/title placeholders with deterministic, DLMS-themed cover art keyed by the book record. Show each title once in its card. Add ISBN-based real-cover lookup only after validating ISBN quality, image rights, source reliability, and a safe fallback. Normalize author display after checking catalog data.
- Group editions only when ISBN/edition metadata establishes that they are the same work. Preserve edition-specific inventory, issue history, and availability when a student selects a copy or requests a title.
- Use a horizontal featured row with a clear reason for inclusion. Exclude featured records from the first catalog grid page, and make pagination/loading states clear without loading a large unbounded catalog.
- On student home, prioritize Continue studying, current tasks, Today/next steps, a small set of meaningful stats, then launchpad shortcuts. Define every count and avoid repeating one pending book-request task per title.
- In Study, lead with class and subject selection, show chapter counts and private completion/recency, keep a one-tap resume path, and show missing-resource guidance once at the relevant chapter or empty state rather than repeating it on every subject card.
- Keep a compact mobile header with search and one notification entry point. Put logout and optional notification setup in More/Profile. Use five consistent groups—Home, Study, Library, Rewards, Profile—on desktop and mobile. Keep the assistant button clear of the bottom navigation and hide it while the mobile menu is open.
- Use skeletons while loading, specific retry guidance for errors, and helpful empty states that link to the next action. Recheck contrast, minimum 44 px touch targets, keyboard focus, reduced motion, and safe-area spacing on every device size.

The first audit pass is implemented in V2: the Study hero is shorter on phones, subject cards prioritize progress and recent chapter context, pending requests are grouped, the catalog has fewer primary filters, featured books scroll horizontally, placeholder covers are deterministic, key status labels and touch targets are clearer, and mobile navigation/account actions are simplified. The next pass should validate ISBN/edition grouping against the real catalog, add active-filter chips and meaningful featured reasons, reorder the full student overview hierarchy, and visually review real phone/tablet/desktop layouts before launch.

## Core journeys to redesign first

1. Discover a book, understand availability, and request or borrow it.
2. Review issued books, due dates, renewals, and next steps.
3. Find a quiz or learning resource, complete it, and understand progress.
4. Let a teacher review class progress and follow up with a student.
5. Let an admin process requests and circulation efficiently, including supported scanning.
6. Find a student record, perform an authorized action, and see a clear result.

## Delivery sequence

1. **Audit:** inventory routes, features, roles, support themes, user feedback, and baseline usage.
2. **Architecture and prototypes:** map role journeys, navigation, responsive homes, and shared patterns; test with representative users.
3. **Shared foundation:** implement the navigation shell, theme refinements, reusable components, and standard UI states.
4. **Core journeys:** deliver book discovery/circulation, student learning, teacher follow-up, and admin workflow improvements.
5. **First-release features:** add the validated subset of unified search, reading plan, task inbox, loan timeline, teacher assignments, and admin action center.
6. **Later features:** prioritize using pilot evidence and capacity.
7. **Pilot and launch:** resolve usability, accessibility, data, and reliability issues; release in stages and monitor.

## Validation and success measures

Test the six journeys at 360, 390, 768, 1024, and 1440 px, plus real Android and Windows builds. Confirm no page-level horizontal overflow, touch and keyboard access to primary actions, visible focus and feedback, and understandable offline states. Establish baselines before setting targets for task completion and time, book discovery-to-request conversion, circulation processing time, adoption, mobile performance on school-like connections, errors, accessibility findings, and support requests. Measure completed useful tasks rather than raw page visits.

## Data and platform guardrails

- Roles remain `student`, `teacher`, and `admin`; staff capabilities are explicit.
- Each school remains tenant-local in its own Supabase project. Do not assume `profiles.school_id` or add cross-school joins.
- Vacation campaign tables and progress remain tenant-local and have no `school_id`.
- Keep privileged writes server-enforced through reviewed RPCs/functions and database role checks.
- New points, rewards, approvals, and notifications need atomic behavior and duplicate-award protection.
- Plan backward-compatible migrations, staged rollout, and rollback before schema changes.

## Immediate work

1. Select pilot students, teachers, and admins and gather their highest-friction tasks.
2. Walk through the six core journeys on phone and desktop; record steps and failures.
3. Produce low-fidelity role-home and navigation prototypes using the existing DLMS theme.
4. Rank feature proposals by user value, evidence, effort, support burden, privacy, accessibility, and data dependencies.
5. Convert approved scope into sequenced implementation issues and a pilot/launch checklist.
