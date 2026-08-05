# Walkthrough — Fines, Certificates & Reading Goals

Built from answered open questions in `Prompt/Open Questions.txt`.

## Decisions applied
| Question | Answer | Implementation |
|---|---|---|
| UPI ID | Any free medium | Admin enters any UPI ID in Library Settings |
| Fine rate | ₹1/day default, or custom by admin | `fine_per_day` in `system_settings` |
| Certificate design | Uploaded by admin | Template image upload + issue flow |
| Reading goal | Admin sets school-wide | `monthly_reading_goal` setting; students track only |
| Due date reminders | (unanswered) | Manual **Remind** / **Remind All** (free-tier safe) |

## Migration
Apply: `supabase/migrations/20260805040000_fines_certificates_goals.sql`

- Seeds `fine_per_day`, `upi_id`, `upi_payee_name`, `monthly_reading_goal`, `certificate_template_url`
- Creates `issued_certificates` + `certificates` storage bucket

## Admin
- **Library Settings** — UPI ID, fine/day, school reading goal, certificate template upload
- **Certificates** — issue certificates to students (uses uploaded template)
- **Overdue** — shows fine amount; Remind / Remind All includes fine info

## Student
- **My Books** — overdue cards show fine + **Pay via UPI** deep link
- **Overview** — school-wide monthly reading goal progress (not editable)
- **Certificates** — view / print awarded certificates
