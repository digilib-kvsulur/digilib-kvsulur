# DLMS Class 11 content (batch 1)

Subjects: Physics (14 ch), Chemistry (9), Mathematics (14), Biology (19). 
Per chapter: notes, formulas (KaTeX LaTeX, no $ delimiters), 10 PYQ-style questions (5 CBSE-pattern + 5 JEE/NEET-style), 10 quick-revision flashcards.

Schema: { class, subject, books, status, generated_by, chapters:[{number,title,ncert_part,notes[{heading,body_md}],formulas[{name,latex,variables,note}],pyqs[{type,format,marks,question,options?,answer,solution_md,difficulty,status}],quick_revision[{front,back}]}] }

IMPORTANT
- Everything is AI-generated and marked "needs_review". Import as DRAFT; staff must review before students see it.
- pyqs are ORIGINAL practice questions in board/JEE/NEET style, NOT real past-paper questions. Show them as "Practice questions" (do not label them with a year).
- Items to check against the current NCERT: Chemistry part labels, Biology ATP/glucose figure (ch12), trachea/vertebra level, C3/C4 CO2 saturation figures, skull bone count.

## Import

Validate the batch first:

```powershell
node scripts/validate-class11-content.mjs supabase/content/class11-science
```

Generate the pending-review SQL (replace the UUID with an admin profile id):

```powershell
node scripts/import-class11-content.mjs supabase/content/class11-science tmp/class11-import <admin-profile-uuid>
```

Then apply each subject file to the linked project:

```powershell
supabase db query --linked -f tmp/class11-import/physics.sql
supabase db query --linked -f tmp/class11-import/chemistry.sql
supabase db query --linked -f tmp/class11-import/mathematics.sql
supabase db query --linked -f tmp/class11-import/biology.sql
```

The SQL writes `file_name = 'class11-batch1'`, `review_status = 'pending'`, and refuses to run once any batch row has been approved.
