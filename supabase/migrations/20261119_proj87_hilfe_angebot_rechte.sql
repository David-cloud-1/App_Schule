-- PROJ-87: Nachbesserung für die schon eingespielte Tabelle.
-- Die erste Fassung entzog nur `anon` die Rechte; `authenticated` behielt von
-- Supabase aus das Löschrecht (RLS verhinderte das Löschen trotzdem). Jetzt
-- bekommt `authenticated` genau Lesen, Anlegen, Ändern. Mehrfaches Ausführen ist unbedenklich.
REVOKE ALL ON public.werkzeug_hilfe_angebot FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.werkzeug_hilfe_angebot TO authenticated;
