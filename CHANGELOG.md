# Changelog

All notable changes to **KV Sulur DLMS** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) formatting and [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-08-23

### 🎉 Initial Public Release

#### Added — Core Platform
- Public landing page with library highlights, events, gallery, and catalog preview
- Student registration with admin approval workflow
- Role-based authentication: `student`, `teacher`, `admin`
- Password reset via email with configurable redirect URL
- Auth session recovery on app start (Electron / Capacitor)
- Splash screen for native apps

#### Added — Book Catalog & Circulation
- Full searchable and filterable book catalog with cover images
- Detailed book pages: synopsis, availability, reviews, ratings
- Book request → Issue → Return → Renewal end-to-end workflow
- Overdue tracking with fine calculation
- Reservation queue for unavailable books
- Multi-accession number support per book title
- Barcode generation for books and student library cards
- Book condemnation module with audit trail
- Periodicals management (newspapers, magazines)
- Lost book reporting and duplicate book detection
- Bulk book import from CSV

#### Added — Student Dashboard
- Currently Reading tracker
- Reading Heatmap (GitHub-style contribution graph)
- Reading Velocity trend chart (pages/day)
- Personalized book recommendations
- Wishlist management and personal reading notes
- Book shelf locator (physical library map)
- Study plan and personal reading goals
- Digital Library Card generator
- Public shareable Student Portfolio page (`/portfolio/:username`)
- Points History page

#### Added — Teacher Dashboard
- Class reading progress overview and analytics
- Per-student reading insights and history
- Study materials management and upload
- NCERT/CBSE curriculum resource browser
- Reading challenge creation and book club management
- Class competition rankings

#### Added — Admin Dashboard (53+ modules)
- Book Manager (add/edit/delete, bulk import)
- User Approval (approve/reject student registrations)
- Circulation Dashboard (real-time overview)
- Fine Manager (configure, track, waive fines)
- Study Materials Manager
- Events Manager (events, registrations, submissions)
- Quiz Manager with AI question generation
- Points / Badge / Level Manager
- Certificate Manager (design + PDF export)
- Games Manager (enable/configure mini-games)
- Notification Sender (push to roles/individuals)
- Export Reports (PDF/CSV)
- Book Condemnation module
- Inventory Audit Manager
- Support Tickets Manager
- Gallery Manager
- Community moderation (posts, pins, polls)
- Data Management and settings

#### Added — Gamification
- Points system (borrow, return, streak, quiz, games)
- XP-based level progression with custom level names
- Auto-awarded and manual badges
- Daily login streak tracking with multiplier bonuses
- Class-level and school-wide leaderboards
- Time-bound reading challenges with rewards

#### Added — Library Mini-Games (18 games)
Reading Wordle, Word Scramble, Word Search, Word Chain, Spell Bee, Book Hangman, Book Match, Library Bingo, Mini Crossword, Riddle Rounds, Literary Places, Sliding Puzzle, Speed Typing, Quick Draw, Reaction Test, Spot the Difference, Book Cards

#### Added — Quiz System
- Admin-created quizzes linked to books or topics
- AI-generated quiz questions (Supabase Edge Function)
- Live Quiz multiplayer mode with real-time lobby
- Bulk quiz import from CSV

#### Added — Community & Social
- Community feed with posts, images, videos, and links
- Pinned posts, admin announcements, and polls
- Comments and reactions on posts
- Community media storage (Supabase Storage)

#### Added — AI Library Bot
- Chat-based library assistant powered by Supabase Edge Function

#### Added — Certificates
- Printable/downloadable reading achievement certificates
- Client-side generation via `html2canvas` + `jsPDF`

#### Added — Push Notifications
- Web Push (VAPID) via Supabase Edge Function
- Role-targeted or individual notifications
- Auto-triggers: overdue, approvals, quiz alerts, events

#### Added — Cross-Platform Support
- **PWA** — installable, offline-capable (Workbox service worker)
- **Android APK** — Capacitor 8 with Filesystem, Network, FileOpener plugins
- **Windows Desktop EXE** — Electron 43 with NSIS installer
- **GitHub Actions CI** — Auto-builds APK + EXE on every push to `main`, published as GitHub Release

#### Added — Supabase Backend
- 100+ database migrations (PostgreSQL)
- Full Row Level Security (RLS) across all tables
- 10 Edge Functions (Deno): `generate-quiz`, `library-bot`, `push-notification`, `admin-create-user`, `admin-bulk-create-users`, `admin-delete-user`, `admin-reset-password`, `send-ticket-email`, `student-first-login-setup`, `create-admin`
- Storage buckets: `book-covers`, `gallery-images`, `community-media`, `study-materials`, `avatars`

---

*For earlier development history, see the commit log.*
