-- PROJ-25: Onboarding Tourismus — Touristiklern-Grundgerüst
--
-- Reine Datenmigration (kein Schema-Wechsel): legt den zweiten Fachbereich
-- "Tourismuskaufleute" (TOUR) und seine 3 schriftlichen Prüfungsteile an,
-- analog zum SPED-Bootstrap aus 20260929_proj22_departments.sql.
--
-- Bewusst NICHT angelegt (laut Spec, Entscheidung der künftigen Lehrkraft):
-- Fächer, Shop-Artikel, Pseudonym-Wortliste (nutzt den neutralen Rückfall),
-- Rollenvergabe. Spedition bleibt davon komplett unberührt — additiv, kein
-- bestehendes Verhalten ändert sich.
--
-- Prüfungsstruktur recherchiert (ReiseKfmAusbV 2011, IHK Bayern) für
-- Tourismuskaufmann/-frau (Kaufmann/Kauffrau für Privat- und Geschäftsreisen).
-- Teil 4 "Fallbezogenes Fachgespräch" ist mündlich und wird — wie bei
-- Spedition auch nur die schriftlichen Teile abgebildet sind — nicht in der
-- App geführt.
--
-- Rückweg: siehe 20261001_proj25_tourismus_bootstrap_down.sql

BEGIN;

INSERT INTO departments (
  code, slug, domain, name, app_name, tagline, meta_title, meta_description,
  icon_name, currency_name, hof_name, hof_short_name, prompt_role,
  target_group, class_levels, sort_order
) VALUES (
  'TOUR', 'tourismus', 'touristiklern.vercel.app',
  'Tourismuskaufleute', 'TouristikLern',
  'Täglich lernen. Besser werden. Prüfung bestehen.',
  'TouristikLern – Prüfungsvorbereitung Tourismuskaufleute',
  'Täglich lernen. Besser werden. IHK-Prüfung bestehen.',
  'Plane', 'Reisetaler', 'Reisebüro', 'Büro',
  'Experte für Prüfungsfragen im Bereich Tourismus — Privat- und Geschäftsreisen (IHK Bayern)',
  'angehende Tourismuskaufleute (Privat- und Geschäftsreisen)',
  '{10,11,12}',
  2
);

INSERT INTO exam_parts (
  department_id, code, name, part_number, title, subtitle, short_label,
  icon_name, color, question_count, duration_minutes
)
SELECT d.id, v.code, v.title, v.part_number, v.title, v.subtitle, v.short_label,
       v.icon_name, v.color, v.question_count, v.duration_minutes
FROM departments d
JOIN (VALUES
  ('GPT',  1, 'Geschäftsprozesse im Tourismus',        'Privat- und Geschäftsreisen',     'Geschäftsprozesse', 'Plane',      '#3B82F6', 30, 150),
  ('KSD',  2, 'Kaufm. Steuerung & Dienstleistungen',    'Touristische Wertschöpfungskette', 'Kfm. Steuerung',    'Calculator', '#F97316', 15, 90),
  ('WISO', 3, 'Wirtschafts- & Sozialkunde',             '',                                  'WiSo',               'BookOpen',   '#A855F7', 15, 60)
) AS v(code, part_number, title, subtitle, short_label, icon_name, color, question_count, duration_minutes)
  ON true
WHERE d.code = 'TOUR';

COMMIT;
