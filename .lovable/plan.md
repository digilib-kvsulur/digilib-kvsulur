## Scope

Build a comprehensive pre-launch upgrade across admin user management, book management, and audit fixes.

### 1. Bulk Student Import (CSV)
- New `BulkImportStudents.tsx` dialog in admin User Management.
- Download CSV template button (headers: first_name, last_name, email, student_class, roll_number, admission_number, phone).
- Upload CSV → parse with PapaParse → preview table with row-level validation (missing fields, duplicates, invalid email).
- "Import valid rows" calls a new edge function `admin-bulk-create-users` which:
  - Creates auth users with a generated temp password (default: `Welcome@<admission_number>`).
  - Auto-approves them.
  - Returns per-row success/error report.
- Downloadable result CSV with credentials for distribution.

### 2. User Management Enhancements
Rewrite `UserApproval.tsx` → `UserManagement.tsx`:
- Search box (name/email/admission) + filters (role, class, approval status).
- Pagination (20/page).
- Row checkboxes + bulk actions: Approve, Reject, Delete, Export selected to CSV.
- "Edit" dialog: update first/last name, class, roll, phone.
- "Reset password" button → edge function `admin-reset-password` sends a new temp password.
- "Activity" drawer per user: login streak, books currently issued, total points, recent reading history.

### 3. Book Management Enhancements
Upgrade `BookManager.tsx`:
- Search (title/author/ISBN) + filters (category, availability) + sort (title, copies, recent) + pagination.
- Cover image upload to new `book-covers` storage bucket (replaces URL-only input; URL still allowed as fallback).
- "Bulk import books" CSV (title, author, isbn, category, description, total_copies) with preview + validation.
- Low-stock indicator (badge when available_copies ≤ 2). New `LowStockAlerts.tsx` widget on admin Overview.
- Reservation queue: new `book_reservations` table; student "Reserve" button when book unavailable; admin queue view to fulfil/cancel; auto-notify student via existing notifications when copy returns.

### 4. Audit & Fixes
- Run security scan; fix any RLS/grant issues found.
- Verify NotificationBell renders on both dashboards (regression check).
- Verify all new tables have GRANTs + RLS + policies.
- Tighten input validation (zod) in new edge functions.
- Fix any TypeScript/console errors surfaced during build.

### 5. Database Migrations
- `book_reservations` (id, book_id, user_id, status: pending/fulfilled/cancelled, created_at, fulfilled_at) + RLS + grants.
- `book-covers` storage bucket (public read, admin write).
- Helper function `is_admin(uuid)` if not present (reuse `has_role`).

### 6. Edge Functions
- `admin-bulk-create-users` — validates admin caller, loops creating users with service role.
- `admin-reset-password` — validates admin caller, generates new temp password via admin API.

## Technical Details

- PapaParse for CSV parse/generate (`bun add papaparse @types/papaparse`).
- Zod validation in functions and import preview.
- Reuse existing `notifications` table for reservation fulfilment alerts.
- All admin-only buttons gated via `has_role(uid, 'admin')` server-side; UI hides them client-side too.
- Keep existing visual identity (glassmorphism, gradient-primary).

## Out of Scope
- Email delivery of temp passwords (passwords shown in downloadable result CSV instead — no SMTP configured).
- Two-factor auth, advanced audit logging.

## Deliverable Order
1. Migrations (reservations table, book-covers bucket).
2. Edge functions (bulk create, reset password).
3. New admin components (BulkImport, UserManagement rewrite, BookManager upgrade, ReservationQueue, LowStockAlerts).
4. Student "Reserve" button on catalog/dashboard.
5. Security scan + fixes.
6. Final smoke test.
