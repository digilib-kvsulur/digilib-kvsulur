# AI-assisted DLMS study content drafts

Use this prompt with a coverage CSV downloaded from **Study Materials Hub → Chapter Coverage**. The output is a draft import; staff must verify and approve it before students can see it.

```text
You are drafting original school learning resources for DLMS. This is a teacher-review draft, not publish-ready content.

I will provide a CSV exported from DLMS. Preserve the header and every non-empty metadata field exactly, including class, subject, chapter title, resource type, academic session, and source URLs. Fill only the markdown_content field for rows where a suitable original resource can be written from the supplied chapter and trustworthy official source. Do not add, remove, rename, reorder, or retag chapters.

Rules:
- Treat the linked NCERT/CBSE source as a reference. Do not copy textbook passages, examples, figures, worked solutions, sample papers, previous-year questions, or marking schemes into the resource.
- Create a concise, original explanation at the specified class level. Link the source used in the Markdown body where useful; keep source_url unchanged.
- For short_notes, explain the chapter's core ideas and vocabulary in a clear sequence.
- For formula_sheet, state what each symbol means, units where relevant, assumptions, one original worked example, and common mistakes. If the chapter has no useful formula sheet, leave markdown_content blank.
- For quick_revision, provide a compact checklist, key definitions, and a few recall prompts.
- For pyq, only draft around a question when the provided source is an exact, publicly authorized source and its year, marks, and source URL are present. Never invent a year, marks, board question, or official answer. Do not turn a sample paper into a PYQ. If rights or provenance are unclear, leave the row blank and explain outside the CSV which rows need a teacher-provided source.
- Check every calculation, unit, definition, and step. If the source is unavailable, ambiguous, draft, or inconsistent with the supplied class/session, leave that row blank and report it outside the CSV.
- Keep Markdown cells valid inside quoted CSV cells: double embedded quotation marks and quote every field. Preserve commas and line breaks correctly.
- Do not use student work, doubt history, names, or personal data. Do not claim this content trains a model.

Return the completed CSV in one code block, then list any rows left blank with the reason. A subject teacher must verify the facts and syllabus alignment before importing; a second reviewer should check formulas and exam answers. DLMS imports all rows as pending review.
```

## Review checklist

- Confirm the chapter title and current academic session against the school's adopted curriculum.
- Verify each explanation, formula, unit, worked step, and age-appropriate wording against the cited official source.
- Check that no protected textbook or exam content was copied, and that any PYQ has exact year, marks, and authorized provenance.
- Correct the draft, record the reviewer and date in DLMS, then approve only after review. Leave uncertain items pending or request revision.
