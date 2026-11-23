# V2 learning content source register

Last checked: 2026-11-23. Recheck official source pages at the start of each academic session and record the source version on every resource.

## Priority official sources

| Source | Use in DLMS | Current reference |
|---|---|---|
| CBSE Curriculum 2026-27 | Class IX-XII curriculum, subjects, syllabus and assessment guidance | https://cbseacademic.nic.in/curriculum_2027.html |
| CBSE Class X SQP and marking schemes 2026-27 | Official sample-paper format and marking schemes; tag as sample paper, not previous-year board paper | https://cbseacademic.nic.in/sqp_classx_2026-27.html |
| CBSE Class XII SQP and marking schemes 2026-27 | Official sample-paper format and marking schemes; tag as sample paper, not previous-year board paper | https://cbseacademic.nic.in/SQP_CLASSXii_2026-27.html |
| NCERT textbook portal | Current class, subject and chapter list, with official chapter PDF links | https://ncert.nic.in/textbook.php |
| ePathshala | NCERT e-textbooks and linked digital learning resources | https://epathshala.nic.in/ |
| NCERT Grade 9 2026-27 draft syllabus announcement | Planning reference only; clearly label draft until final syllabus/textbooks are issued | https://ncert.nic.in/pdf/announcement/Syllabus_Secondary_Stage_Phase_I_Grade_9_Part_2.pdf |

CBSE has announced a 2026-27 curriculum release for IX-XII and a revised Class IX scheme aligned with NCF-SE 2023. Grade IX materials surfaced by NCERT are marked as draft; do not treat them as final syllabus. CBSE's 2026-27 SQP pages exist for Classes X and XII. Classes VI-VIII and XI should use their official current NCERT/CBSE textbook/curriculum source pages and school-approved scope, not an assumed board SQP mapping.

## Content ingestion rules

- Import bibliographic metadata and official URLs, not hosted copies of NCERT textbooks. NCERT explicitly allows downloading for textbook/reference use but prohibits republication/redistribution and says digital packages should not host copies; link to the official chapter instead.
- Store resource title, class, subject, chapter, resource type, academic session, source label, source URL, review status and last-checked date.
- Mark CBSE SQP, official board PYQ, JEE/NEET PYQ, teacher-authored notes and DLMS-authored revision sheets as distinct resource types/provenance. Never label an SQP as a PYQ.
- Use student/teacher-created short notes and formula explanations only after subject-teacher review. For equations/formulas, validate notation, symbols, units and worked examples.
- Extract no copyrighted full chapter text into the AI corpus without an explicit license. Prefer licensed sources, teacher-authored explanations, public official metadata and links.
- Keep a review/version history. When an official source page changes, flag affected chapters for review instead of silently replacing material.

## Model grounding and evaluation

The study assistant should retrieve only material tagged to the student's confirmed class and subject. It must cite the actual resource record/source, distinguish a general explanation from source-backed guidance, and never invent PYQ year, marks, syllabus mapping or source citations. Use teacher-authored evaluation questions, record versioned results, and suspend an affected subject when review finds a quality issue. Student question images are processed for a response but should not enter training data; saved history stores extracted text and answer only.
