# PROJ-12: Class Levels & Topics

## Status: Deployed
**Created:** 2026-04-24
**Last Updated:** 2026-04-24

## Summary
Adds class level (Klasse 10/11/12) and optional topic assignments to questions. Students can filter by class level on the subjects page. Admins can manage topics per subject and assign class levels when creating/importing/generating questions.

## What was built

### Database
- New `topics` table (subject_id, name) with RLS
- `class_level` column on `questions` (nullable int: 10, 11, 12)
- `topic_id` column on `questions` (nullable FK → topics, ON DELETE SET NULL)
- `class_level` column on `questions_draft` and `generation_jobs`

### Admin
- `/admin/topics` — new page: create, rename, delete topics grouped by subject
- Question form modal: Klassenstufe selector (Pflichtfeld: Alle/10/11/12) + Thema dropdown (optional, loads per subject)
- Bulk import: optional `klassenstufe` and `thema` fields in JSON rows
- AI Generator upload zone: Klassenstufe selector before upload (applied to all generated drafts)
- Draft edit modal: Klassenstufe field per draft + PUG added as subject
- Admin nav: "Themen" tab added

### Student UI
- Subjects page: class level filter bar (Alle/Kl.10/Kl.11/Kl.12) stored as URL param
- Quiz page: filters questions by class_level (null questions always included)

### AI Generator
- PUG (Politik und Gesellschaft) added to all subject lists and prompts
- EXAM_CONTEXT updated with PUG
- class_level passed to Claude as context hint for difficulty calibration

## Notes
- Questions with class_level = NULL are shown at all filter levels ("Alle Klassen")
- Topics are subject-scoped (BGP topics ≠ STG topics)
- Bulk import auto-creates topics on-the-fly if they don't exist yet
