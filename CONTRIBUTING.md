# Contributing to KV Sulur DLMS

Thank you for your interest in contributing to the **PM SHRI KV AFS Sulur Digital Library Management System**! Whether you're fixing a bug, adding a feature, improving documentation, or reporting an issue — every contribution matters.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Code Style](#code-style)
- [Database Changes](#database-changes)

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold a welcoming and respectful environment for everyone.

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- A [Supabase](https://supabase.com) account and project
- Git

### Local Setup

```bash
# 1. Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/digilib-kvsulur.git
cd digilib-kvsulur

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env

# 4. Start the dev server
npm run dev
```

---

## How to Contribute

### 1. Fork the repository
Click the **Fork** button at the top of the GitHub page.

### 2. Create a feature branch
```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make your changes
- Write clean, typed TypeScript
- Follow the existing component structure
- Add comments where logic is non-obvious

### 4. Lint your code
```bash
npm run lint
```

### 5. Build to verify no type errors
```bash
npm run build
```

### 6. Commit using conventional commits (see below)
```bash
git commit -m "feat: add reading streak multiplier display"
```

### 7. Push and open a Pull Request
```bash
git push origin feat/your-feature-name
```
Then open a PR against the `main` branch.

---

## Development Workflow

### File & Folder Conventions

| Location | Purpose |
|----------|---------|
| `src/pages/` | Top-level route pages (one per route) |
| `src/components/admin/` | Admin dashboard panels/modules |
| `src/components/student/` | Student-specific widget components |
| `src/components/ui/` | Base shadcn/ui components (do not modify) |
| `src/hooks/` | Custom React hooks (prefix with `use`) |
| `src/lib/` | Utility functions and helpers |
| `src/integrations/supabase/` | Supabase client, types |
| `supabase/functions/` | Edge Functions (Deno/TypeScript) |
| `supabase/migrations/` | SQL migration files |

### Component Guidelines

- **One component per file**; keep files under ~400 lines where possible
- Use **named exports** for components
- Prefer **TanStack Query** (`useQuery`, `useMutation`) for all Supabase data fetching
- Use **React Hook Form + Zod** for all forms and validation
- Use **shadcn/ui** components before writing custom UI
- Use **Lucide React** for icons

### State Management

- Server state → TanStack Query
- Form state → React Hook Form
- Local UI state → `useState` / `useReducer`
- Avoid global state unless strictly necessary

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or enhancement |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code restructure without feature/fix |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build scripts, deps, CI config |
| `revert` | Reverting a previous commit |

### Scope Examples

`feat(quiz): add live multiplayer lobby`
`fix(auth): recover broken session on app start`
`chore(ci): update android build action`
`docs(readme): add Supabase bucket table`

---

## Pull Request Guidelines

- **Target branch:** `main`
- **Title:** Follow the commit convention (e.g., `feat(admin): add inventory audit module`)
- **Description:** Explain *what* changed and *why*; include screenshots for UI changes
- **Keep PRs focused:** One concern per PR. Avoid mixing features with unrelated fixes.
- **Pass lint and build:** PRs that fail `npm run lint` or `npm run build` will not be merged
- **Link related issues:** Use `Closes #123` or `Fixes #456` in the PR body

### PR Checklist

- [ ] Code lints without errors (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No hardcoded credentials or secrets
- [ ] No unnecessary `console.log` statements left
- [ ] New UI components use shadcn/ui primitives
- [ ] New Supabase queries use TanStack Query
- [ ] Any new DB columns/tables have a corresponding migration file
- [ ] Screenshots attached for UI changes

---

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template. Please include:

- **Steps to reproduce** (numbered, specific)
- **Expected behavior**
- **Actual behavior**
- **Environment** (OS, browser, app platform: web/Android/Windows)
- **Screenshots or screen recording** if applicable
- **Browser console errors** if applicable
- **Supabase logs excerpt** if it's a backend issue

---

## Requesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) issue template. Please include:

- **Problem statement** — what gap does this address?
- **Proposed solution** — how should it work?
- **User role affected** — student / teacher / admin / all
- **Alternatives considered**
- **Mockups or examples** if you have them

---

## Code Style

We use **ESLint** with TypeScript rules. Run `npm run lint` before committing.

Key rules:
- Prefer `const` over `let`; avoid `var`
- Use `async/await` over `.then()` chains
- Explicitly type function return values for exported functions
- No `any` unless absolutely unavoidable — prefer `unknown` with a type guard
- Destructure props in component signatures
- Sort imports: React first → third-party → local (enforced by ESLint)

---

## Database Changes

Any change to the Supabase database schema **must** include a migration file:

```bash
# Create a new migration
npx supabase migration new your_migration_description

# Edit the generated file in supabase/migrations/
# Then apply locally
npx supabase db push
```

### Migration Guidelines

- Migrations are **append-only** — never edit an already-applied migration
- Use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency
- Include RLS policies for any new table
- Test the migration applies cleanly on a fresh Supabase project

---

Thank you for helping make KV Sulur DLMS better for students and teachers! 🎉
