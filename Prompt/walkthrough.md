# Feature Implementation Walkthrough — DigiLib KV Sulur

All **7 phases** implemented in code. Apply migrations with `supabase db push`, then verify with `npm run build`.

## Open Questions (applied)
| Question | Decision |
|---|---|
| UPI ID | Admin-configurable (any free UPI medium) |
| Fine rate | ₹1/day default, custom via Fine Manager / Library Settings |
| Certificate design | Admin-uploaded template + PDF download (jsPDF) |
| Reading goal | **Admin school-wide** target (not student-set) |
| Due reminders | **Manual** admin trigger (free-tier safe) + RPC `send_due_soon_reminders` |

## Phase status

| Phase | Status | Key artifacts |
|---|---|---|
| 1 Reading anti-abuse | Done | `20260805100000_reading_history_limits.sql` — max 2/day, 7-day title cooldown, 2nd flagged `suspicious` |
| 2 Fines + GPay | Done | `20260805101000_fines.sql`, `FineManager`, `MyFines`, auto-fine on return |
| 3 Reservations | Done | `20260805102000_reservations.sql`, max 3, notify on return, `ReservationManager`, `BookReservations` |
| 4 Suggestions + lost | Done | `20260805103000_suggestions_and_lost.sql` + student/admin UIs |
| 5 Periodicals + goals + clubs | Done | `20260805104000_periodicals_goals_clubs.sql` + managers/widgets (goal = admin school-wide) |
| 6 PDF certs + heatmap + dupes | Done | jsPDF/html2canvas, ClassAnalytics heatmap, `DuplicateDetector` |
| 7 Auto notifications | Done | `20260805107000_notification_triggers.sql` — return confirm, wishlist alert, due-soon RPC, Due soon badge |

## Earlier migrations (also apply)
- `20260805040000_fines_certificates_goals.sql` — certificates bucket + issued_certificates + settings seeds

## Deploy checklist
1. `supabase db push --include-all` (or run the new SQL files in order)
2. `npm run build`
3. Admin → Library Settings / Fine Manager: set UPI ID
4. Manual checks per plan verification section
