# Prompt for Antigravity — Add Book Condemnation / Write-Off Module to DLMS

Paste everything below into Antigravity as the task prompt.

---

## Task

Add a **Book Condemnation / Write-Off module** to our existing DLMS (Digital Library
Management System). This module manages the process of identifying, listing, and
formally writing off unserviceable library books, following the standard KVS-style
condemnation workflow (Form CS-49 → Condemnation Board → Principal sanction →
Stock Register update).

**Before writing any code:**
1. Explore the existing codebase structure (models/schema, API routes, frontend
   pages, auth/roles system, existing "Book" or "Catalog" entity).
2. Match existing naming conventions, folder structure, ORM/DB patterns, and UI
   component library already used in this project. Do not introduce a new stack
   or pattern for this feature alone.
3. Find the existing Book/Accession model and REUSE it — condemnation records
   should reference existing books by accession number/ID, not duplicate book data.
4. If a "fund" or "budget head" concept doesn't already exist in the system, ask
   before creating one from scratch — confirm whether we track fund sources
   (e.g. School Fund vs VVN Fund) elsewhere already.

## Data model

Add a `CondemnationEntry` (or matching existing naming convention) linked to the
existing Book/Accession record, with these fields:

| Field | Type | Notes |
|---|---|---|
| `serial_no` | int | auto-incremented per condemnation list/batch, not global |
| `accession_no` | FK → Book | must exist in catalog; pull title/cost/year automatically |
| `book_title` | string | denormalized snapshot at time of condemnation (books may later be deleted) |
| `cost` | decimal | snapshot of original cost from catalog |
| `discount_pct` | decimal, default 0 | manual entry |
| `discount_amount` | decimal, computed | `= cost * discount_pct / 100` |
| `rate` | decimal, computed | `= cost - discount_amount` |
| `depreciation_amount` | decimal, computed | `= rate * 0.95` (95% standard depreciation on condemned books; make this ratio a configurable constant, not hardcoded, since policy may change) |
| `net_value` | decimal, computed | `= rate - depreciation_amount` (residual/salvage value) |
| `year_of_purchase` | int | from catalog, editable |
| `date_became_unserviceable` | date | manual |
| `years_in_use` | int, computed | `= year(date_became_unserviceable) - year_of_purchase` |
| `reason` | enum | `TORN_DAMAGED`, `MUTILATED`, `OBSOLETE_EDITION`, `SYLLABUS_CHANGE`, `LOST`, `THEFT`, `NO_SHELF_SPACE`, `OTHER` (+ free-text note when OTHER) |
| `fund_source` | enum | `SCHOOL_FUND`, `VVN_FUND` (or whatever fund types your institution actually uses — confirm) |
| `status` | enum | `DRAFT` → `PENDING_BOARD_REVIEW` → `BOARD_APPROVED` → `PRINCIPAL_SANCTIONED` → `WRITTEN_OFF` → (optional) `AUCTIONED`. Add `REJECTED` as a terminal state from any pre-sanction step. |
| `sanction_no` | string, nullable | recorded once Principal sanctions; required before status can move to `WRITTEN_OFF` |
| `batch_id` | FK | groups entries prepared together into one condemnation list/session |
| `created_by`, `reviewed_by`, `sanctioned_by` | FK → User | audit trail |
| `created_at`, `updated_at` | timestamp | |

Computed fields must be derived server-side (or via DB generated columns / view),
never trusted from client input — recalculate on save.

## Workflow / permissions

- **Librarian**: creates a condemnation batch, adds books to it (search by accession
  no. or title, pulling cost/year automatically from the catalog), sets discount/reason/
  unserviceable date. Batch stays in `DRAFT`.
- **Librarian submits** → `PENDING_BOARD_REVIEW`.
- **Condemnation Board member(s)**: review, can approve (`BOARD_APPROVED`) or send
  back to `DRAFT` with a comment.
- **Principal**: sanctions the approved batch, must enter a `sanction_no` →
  `PRINCIPAL_SANCTIONED`.
- On sanction, the system must:
  - Mark each linked Book/Accession record's status as `CONDEMNED` / `WRITTEN_OFF`
    in the main catalog (so it disappears from active circulation/search but stays
    in history — do not hard-delete).
  - Move status to `WRITTEN_OFF` and lock the entry from further edits (only
    admins can reopen, with an audit log entry).
- Optional: an `AUCTIONED` step recording sale amount and deposit reference, if
  your institution's process includes auctioning condemned books.

Confirm with me which roles exist in the current user/auth system before wiring
permissions — do not invent a new role model if one already exists.

## UI requirements

1. **Condemnation batch list page** — list of batches with fund, status, date,
   number of books, total net value.
2. **Batch detail / edit page** — table matching the original register layout
   (Sl.No, Acc No., Book Name, Cost, Disc %, Disc Rs, Rate, Dep., Net, Years,
   Year of Purchase, Date Unserviceable, Reason) with inline add/remove of books
   via accession-number search/autocomplete against the existing catalog.
3. **Approval actions** contextual to the logged-in user's role (Submit / Approve /
   Send back / Sanction), each requiring confirmation and an optional remark.
4. **Printable/exportable report** per batch, formatted like the original register
   (this is the document physically signed by the Condemnation Board, Principal,
   and — for VVN fund entries — the Chairman VEC), plus a running Stock Register
   extract of all `WRITTEN_OFF` entries to date, filterable by fund/date range/reason.
5. **Dashboard/stat widgets** (optional, if the DLMS already has a dashboard):
   count of books pending write-off, total value written off this year, by reason.

## Validation rules

- A book already in an active (non-rejected) condemnation batch cannot be added
  to a second batch simultaneously.
- `date_became_unserviceable` cannot be before `year_of_purchase`.
- `sanction_no` is required and unique before a batch can move to `WRITTEN_OFF`.
- Discount % between 0–100.
- Prevent editing any entry once its batch has passed `BOARD_APPROVED`, except
  by an admin role (log the override).

## Migration / seed note

Do not import the attached spreadsheet data automatically — treat it only as the
reference format for column layout and formulas. If historical condemnation
records need to be backfilled from old spreadsheets, build a separate one-time
import script (CSV/XLSX upload → map to `CondemnationEntry`) rather than baking
this specific file's data into a migration.

## Deliverable checklist for the agent

- [ ] Schema/migration for `CondemnationEntry` (+ `CondemnationBatch` if separated)
- [ ] Backend API: create batch, add/remove entries, submit, approve, sanction, reject, list, export
- [ ] Frontend: batch list, batch detail/edit, approval actions, printable export
- [ ] Role-gated actions matching existing auth system
- [ ] Server-side recalculation of all computed fields on every save
- [ ] Catalog integration: linked book marked `CONDEMNED` on write-off, not deleted
- [ ] Tests for the computed-field formulas and status transitions
- [ ] Confirm fund types and reason codes with the actual institution's practice
      before finalizing enums (this file only shows "Torn and Damaged" but the
      standard process supports more reasons — see above)
