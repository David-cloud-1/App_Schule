-- Add optional custom duration to exam sets
alter table exam_question_sets
  add column if not exists duration_minutes integer check (duration_minutes > 0 and duration_minutes <= 600);
