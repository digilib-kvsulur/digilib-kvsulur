<!-- Banner -->
<p align="center">
  <img src="https://raw.githubusercontent.com/digilib-kvsulur/digilib-kvsulur/main/public/logos/kv-banner.jpg" alt="KV Sulur DLMS Banner" width="100%"/>
</p>

<h1 align="center">KV Sulur DLMS</h1>
<h3 align="center">Digital Library Management System — PM SHRI Kendriya Vidyalaya AFS Sulur</h3>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version"/></a>
  <a href="#"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React"/></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase" alt="Supabase"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite" alt="Vite"/></a>
  <a href="#"><img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=flat-square&logo=pwa" alt="PWA"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Android-APK-3DDC84?style=flat-square&logo=android" alt="Android"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Electron-Desktop-47848F?style=flat-square&logo=electron" alt="Electron"/></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License"/></a>
</p>

<p align="center">
  <strong>Discover books. Track reading. Earn rewards. Grow together.</strong><br/>
  A full-featured, gamified digital library platform for students, teachers, and administrators — available on Web, Android, and Windows.
</p>

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Supabase Setup](#-supabase-setup)
- [Platform Builds](#-platform-builds)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**KV Sulur DLMS** is a comprehensive, full-stack Digital Library Management System purpose-built for **PM SHRI Kendriya Vidyalaya AFS Sulur**. It replaces paper-based library workflows with a modern, role-aware web platform that works seamlessly on any device.

The system serves three distinct user roles — **Students**, **Teachers**, and **Admins** — each with a tailored dashboard. Beyond standard library operations, it features a rich gamification layer (points, badges, streaks, leaderboards), AI-assisted quizzes, a community social feed, and a built-in library bot — making reading genuinely engaging for students.

> **Deployment targets:** Progressive Web App (PWA) · Android APK (Capacitor) · Windows Desktop EXE (Electron) · Vercel Web Hosting

---

## 🔗 Live Demo

| Platform | Link |
|----------|------|
| 🌐 Web App | [kvsulur-dlms.vercel.app](https://kvsulur-dlms.vercel.app) |
| 🤖 Android APK | [Latest Release →](../../releases/latest) |
| 🪟 Windows Installer | [Latest Release →](../../releases/latest) |

---

## ✨ Features

### 🏠 Public Landing Page
- School library highlights, upcoming events, and gallery
- Public book catalog with search and availability status
- Download page for native apps (Android APK, Windows EXE)
- Feedback form for visitors and support portal with ticket system

### 🔐 Authentication & User Management
- Email/password login with Supabase Auth
- Student self-registration with **admin approval workflow**
- Role-based access control: `student`, `teacher`, `admin`
- Password reset via email with configurable redirect URLs
- Bulk student import (CSV) with auto-account creation
- Auth session recovery on app start (Electron / mobile)

### 📖 Book Catalog & Circulation
- Full searchable, filterable book catalog with cover images
- Detailed book pages with synopsis, availability, reviews, and ratings
- **Book request → Issue → Return → Renewal** workflow
- Overdue tracking with fine calculation and fine management
- Reservation queue for unavailable books
- Multi-accession number support per book title
- Book condemnation module with audit trail
- Barcode generation for books and student library cards
- Periodicals management (newspapers, magazines)
- Lost book reporting and duplicate book detection

### 🎓 Student Dashboard
- **Currently Reading** tracker with progress
- **Reading Heatmap** (GitHub-style contribution graph for reading activity)
- **Reading Velocity** — pages/day trend chart
- Personalized book recommendations, wishlist management, and notes
- Book shelf locator (physical library map)
- Study plan and personal reading goals
- Digital **Library Card** generator
- **Student Portfolio** — public shareable reading profile page

### 👩‍🏫 Teacher Dashboard
- Class reading progress overview and analytics
- Per-student reading insights and history
- Study materials management and upload
- NCERT/CBSE curriculum resource browser
- Reading challenge creation for classes and book club management

### 🛠️ Admin Dashboard (53+ modules)
- **Book Manager** — Add, edit, delete, bulk import books (CSV)
- **User Approval** — Approve/reject student registrations
- **Circulation Dashboard** — Real-time issue/return/overdue overview
- **Fine Manager** — Configure fines, mark payments, waive fines
- **Study Materials Manager** — Upload/manage study resources
- **Events Manager** — Create events, manage registrations, submissions
- **Quiz Manager** — Create/edit quizzes, set schedules, manage results
- **Points/Badge/Level Manager** — Full gamification configuration
- **Certificate Manager** — Design and issue reading certificates (PDF)
- **Games Manager** — Enable/configure library mini-games
- **Notification Sender** — Push notifications to roles/individuals
- **Export Reports** — Generate PDF/CSV library reports
- ...and 40+ more management modules

### 🎮 Gamification & Engagement
- **Points System** — Earn points for borrowing, returning, streaks, quizzes, and games
- **Levels** — XP-based progression with custom level names and thresholds
- **Badges** — Auto-awarded and manual badges with custom artwork
- **Login Streaks** — Daily streak tracking with multiplier bonuses
- **Leaderboards** — Class-level and school-wide rankings
- **Reading Challenges** — Time-bound reading goals with rewards

### 🧩 Library Mini-Games (18 games)
`Reading Wordle` · `Word Scramble` · `Word Search` · `Word Chain` · `Spell Bee` · `Book Hangman` · `Book Match` · `Library Bingo` · `Mini Crossword` · `Riddle Rounds` · `Literary Places` · `Sliding Puzzle` · `Speed Typing` · `Quick Draw` · `Reaction Test` · `Spot the Difference` · `Book Cards` · and more.

### 📝 Quiz System
- Admin-created quizzes linked to books or topics
- AI-generated quiz questions (via Supabase Edge Function)
- **Live Quiz mode** with real-time multiplayer lobby
- Bulk quiz import from CSV/spreadsheet

### 💬 Community & Social
- Community feed with posts, images, videos, and links
- Pinned posts, admin announcements, and polls
- Comments and reactions on posts
- Community media storage (Supabase Storage)

### 🤖 Library Bot
- AI-powered chat assistant for library queries
- Powered by Supabase Edge Function (`library-bot`)

### 📜 Certificates
- Printable/downloadable reading achievement certificates
- Generated client-side using `html2canvas` + `jsPDF`

### 🔔 Push Notifications
- Web Push Notifications (VAPID) via Supabase Edge Function
- Role-targeted or individual notifications
- Auto-triggers on events: overdue, approvals, quiz alerts, etc.

### 📱 Cross-Platform
- **PWA** — Installable on any device, offline-capable (Workbox)
- **Android APK** — Built with Capacitor, auto-built via GitHub Actions
- **Windows Desktop EXE** — Built with Electron + NSIS installer, auto-built via GitHub Actions
- Splash screen for native apps, in-app Android update checker

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend Framework** | React 18 + TypeScript 5 |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS 3 + shadcn/ui (Radix UI primitives) |
| **State / Data Fetching** | TanStack Query (React Query) v5 |
| **Forms** | React Hook Form + Zod validation |
| **Routing** | React Router DOM v6 |
| **Backend / Auth / DB** | Supabase (PostgreSQL, Auth, Storage, RLS, RPC) |
| **Edge Functions** | Supabase Edge Functions (Deno) |
| **Charts** | Recharts |
| **PDF Generation** | jsPDF + jspdf-autotable + html2canvas |
| **CSV Parsing** | PapaParse |
| **Push Notifications** | Web Push API + VAPID (Workbox) |
| **PWA** | vite-plugin-pwa + Workbox |
| **Android** | Capacitor 8 (Filesystem, Network, FileOpener plugins) |
| **Desktop** | Electron 43 (with electron-builder NSIS) |
| **Icons** | Lucide React |
| **Deployment** | Vercel (web) + GitHub Actions (APK + EXE releases) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Applications                         │
│   Web (PWA/Vercel)  |  Android (Capacitor)  |  Windows (Electron)│
└──────────────────────────────┬──────────────────────────────────┘
                               │
                   React 18 + TypeScript
                   Vite · React Router · TanStack Query
                               │
               ┌───────────────┴──────────────────┐
               │          Supabase BaaS            │
               │  ┌────────────────────────────┐  │
               │  │  PostgreSQL Database        │  │
               │  │  (100+ tables + RLS)        │  │
               │  ├────────────────────────────┤  │
               │  │  Supabase Auth (JWT/Email)  │  │
               │  ├────────────────────────────┤  │
               │  │  Supabase Storage           │  │
               │  │  (covers, gallery, docs)    │  │
               │  ├────────────────────────────┤  │
               │  │  Edge Functions (Deno)      │  │
               │  │  - generate-quiz (AI)       │  │
               │  │  - library-bot (AI)         │  │
               │  │  - push-notification        │  │
               │  │  - admin-create-user        │  │
               │  │  - send-ticket-email        │  │
               │  │  - student-first-login      │  │
               │  └────────────────────────────┘  │
               └──────────────────────────────────┘
```

### Role-Based Access

| Role | Dashboard | Key Permissions |
|------|-----------|----------------|
| `student` | `/student-dashboard` | Browse catalog, request books, earn rewards, play games, join quizzes |
| `teacher` | `/teacher-dashboard` | Class insights, study materials, reading lists, challenge creation |
| `admin` | `/admin-dashboard` | Full system management — all 53+ admin modules |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A **Supabase** project ([supabase.com](https://supabase.com))
- (Optional) **Supabase CLI** for running migrations locally

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/digilib-kvsulur/digilib-kvsulur.git
cd digilib-kvsulur

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your Supabase credentials (see below)

# 4. Apply Supabase migrations
npx supabase db push

# 5. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Supabase Project
VITE_SUPABASE_PROJECT_ID="your-supabase-project-id"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"

# Web Push Notifications (VAPID)
# Generate with: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY="your-vapid-public-key"
```

> ⚠️ **Security:** Only use the Supabase **anon/publishable key** in `VITE_*` variables. Never expose the `service_role` key in frontend code — keep it in Supabase Edge Function secrets.

---

## 🗄️ Supabase Setup

### 1. Apply Database Migrations

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or paste each `.sql` file from `supabase/migrations/` into the Supabase SQL Editor in timestamp order.

### 2. Configure Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `book-covers` | Book cover images | Public |
| `gallery-images` | School gallery photos | Public |
| `community-media` | Community post attachments | Authenticated |
| `study-materials` | Uploaded study documents | Authenticated |
| `avatars` | User profile photos | Authenticated |

### 3. Deploy Edge Functions

```bash
npx supabase functions deploy generate-quiz
npx supabase functions deploy library-bot
npx supabase functions deploy push-notification
npx supabase functions deploy admin-create-user
npx supabase functions deploy admin-bulk-create-users
npx supabase functions deploy admin-delete-user
npx supabase functions deploy admin-reset-password
npx supabase functions deploy send-ticket-email
npx supabase functions deploy student-first-login-setup
npx supabase functions deploy create-admin
```

Set Edge Function secrets in the Supabase dashboard:
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (for AI quiz generation and library bot)
- `VAPID_PRIVATE_KEY` (for push notifications)
- SMTP variables (for ticket email notifications)

### 4. Configure Auth

- Add your production domain to **Redirect URLs** in Supabase Auth settings
- Enable **Email** provider
- Optionally configure custom SMTP for branded emails

---

## 📦 Platform Builds

### Web (Vercel)

```bash
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
```

### Android APK (Capacitor)

```bash
npm run build
npx cap sync android
# Then open android/ in Android Studio and build
```

### Windows Desktop EXE (Electron)

```bash
npm run electron:dev      # Development mode
npm run electron:build    # Production NSIS installer → dist-electron/
```

### Automated CI/CD (GitHub Actions)

Every push to `main` automatically:
1. Builds the **Android APK** (Ubuntu + Capacitor + Gradle)
2. Builds the **Windows EXE** installer (Windows + Electron Builder)
3. Publishes both to a **GitHub Release** tagged `latest`

See [`.github/workflows/build-apps.yml`](.github/workflows/build-apps.yml).

**Required GitHub Secrets:**
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_VAPID_PUBLIC_KEY
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Import the repository in [vercel.com](https://vercel.com)
2. Set **Framework Preset** to `Vite`
3. Add all `VITE_*` environment variables
4. Deploy — `vercel.json` SPA routing is already configured

### Deployment Checklist

- [ ] Supabase migrations applied
- [ ] Storage buckets and RLS policies configured
- [ ] Edge Function secrets set in Supabase dashboard
- [ ] Auth redirect URLs include production domain
- [ ] `VITE_*` env vars set in Vercel project settings
- [ ] Test all three role logins (student, teacher, admin)
- [ ] Test password reset with production redirect URL
- [ ] Verify push notifications (VAPID keys configured)
- [ ] Test bulk import with a small CSV sample
- [ ] Confirm mobile layout on a real device
- [ ] Check Supabase logs for RLS / permission errors

---

## 📁 Project Structure

```
digilib-kvsulur/
├── .github/
│   └── workflows/
│       └── build-apps.yml        # CI: Android APK + Windows EXE release
├── android/                      # Capacitor Android project
├── public/                       # Static assets (logos, icons)
├── scripts/                      # Build helper scripts
├── src/
│   ├── App.tsx                   # Root router + providers
│   ├── components/
│   │   ├── admin/                # 53+ admin management modules
│   │   ├── auth/                 # ProtectedRoute, login forms
│   │   ├── catalog/              # Book catalog components
│   │   ├── certificates/         # Certificate canvas/PDF generator
│   │   ├── chat/                 # Library bot chat UI
│   │   ├── community/            # Social feed, posts, polls
│   │   ├── games/                # 18 library mini-games
│   │   ├── quiz/                 # Quiz runner, manager, live quiz
│   │   ├── rewards/              # Badges, leaderboard, challenges
│   │   ├── student/              # Student-specific widgets
│   │   └── ui/                   # shadcn/ui base components
│   ├── hooks/                    # Custom React hooks
│   ├── integrations/supabase/    # Supabase client + generated types
│   ├── lib/                      # Utilities (auth cleanup, updater)
│   ├── pages/                    # 16 top-level route pages
│   └── types/                    # Global TypeScript types
├── supabase/
│   ├── functions/                # 10 Edge Functions (Deno)
│   └── migrations/               # 100+ versioned SQL migrations
├── .env.example                  # Environment variable template
├── capacitor.config.ts           # Capacitor (Android) configuration
├── electron.cjs                  # Electron main process
├── tailwind.config.ts            # Tailwind CSS configuration
├── vite.config.ts                # Vite build configuration
└── vercel.json                   # Vercel SPA routing config
```

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m 'feat: add some feature'`
4. **Push** to the branch: `git push origin feature/your-feature-name`
5. **Open a Pull Request** against `main`

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `refactor` | Code restructure |
| `chore` | Build, deps, config |

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

© 2024–2026 PM SHRI Kendriya Vidyalaya AFS Sulur. All rights reserved.

---

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) — open-source BaaS platform
- [shadcn/ui](https://ui.shadcn.com) — beautiful, accessible component library
- [Radix UI](https://radix-ui.com) — headless, accessible primitives
- [TanStack Query](https://tanstack.com/query) — powerful server state management
- All the students and teachers of **PM SHRI KV AFS Sulur** who inspired this project

---

<p align="center">Made with ❤️ for <strong>PM SHRI Kendriya Vidyalaya AFS Sulur</strong></p>
