# PM SHRI KV AFS Sulur Digital Library Management System

Digital Library Management System for PM SHRI Kendriya Vidyalaya AFS Sulur. The app supports students, teachers, and admins with catalog browsing, book issue workflows, study materials, events, quizzes, rewards, community features, and reports.

## Tech stack

- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase Auth, Database, Storage, RPC, and Edge Functions
- Vercel deployment

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Fill in the Supabase values in `.env`.

4. Start the app:

   ```bash
   npm run dev
   ```

## Required environment variables

```bash
VITE_SUPABASE_PROJECT_ID=""
VITE_SUPABASE_URL=""
VITE_SUPABASE_PUBLISHABLE_KEY=""
```

Only browser-safe Supabase publishable/anon keys should be used in Vite variables. Service-role keys must stay server-side in Supabase Edge Function secrets.

## Production build

```bash
npm run build
```

The production output is generated in `dist/`.

## Deployment notes

- Configure the same Vite environment variables in Vercel.
- Ensure Supabase migrations are applied before deploying the latest frontend.
- Confirm Supabase Storage buckets and policies exist for gallery/community/media features.
- Confirm Supabase Auth redirect URLs include the production domain.
- Verify Edge Function secrets are configured in Supabase, not in frontend env files.

## Launch checklist

- Student registration works.
- Student login works.
- Teacher login works.
- Admin login works.
- Password reset works with the production redirect URL.
- Direct dashboard URLs reject unauthorized users.
- Book catalog, detail page, issue request, and return/renewal flows work.
- Bulk imports are tested with a small CSV first.
- Gallery/community uploads work.
- Quiz attempt and result flows work.
- Mobile layout is checked on a real phone.
- Vercel routing works after refreshing nested pages.
- Supabase logs show no repeated permission/RLS errors.

## Useful commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Pre-launch status

The app currently builds successfully for production. The remaining recommended cleanup is mostly lint/type-hardening, bundle-size reduction, and manual QA of user workflows.
