-- Probe zu 20261126_proj127_verwaltung_fuer_alle.sql – NACH der Migration im SQL-Editor ausführen.
-- Endet ABSICHTLICH mit einem Fehler „PROBE-ERGEBNIS“, dadurch wird alles
-- zurückgerollt. Nur der Text hinter „PROBE-ERGEBNIS“ zählt.
DO $$
DECLARE
  lehrer uuid;
  azubi uuid;
  bereich uuid;
  item uuid;
  hat_spalte boolean;
  lehrer_item_aendern int;
  azubi_item_aendern int;
  lehrer_protokoll_eigen boolean := false;
  lehrer_protokoll_fremd_gesperrt boolean := false;
  lehrer_liest_protokoll boolean;
  azubi_liest_protokoll boolean;
  verwaist_gesperrt boolean;
  lehrer_rueckname_ok boolean := false;
  azubi_rueckname_gesperrt boolean := false;
  lehrer_profile_fremd int;
BEGIN
  SELECT id INTO lehrer FROM profiles WHERE role = 'teacher' AND department_id IS NOT NULL LIMIT 1;
  SELECT id INTO azubi FROM profiles WHERE role = 'student' LIMIT 1;
  SELECT department_id INTO bereich FROM profiles WHERE id = lehrer;
  SELECT id INTO item FROM shop_items WHERE department_id = bereich LIMIT 1;
  IF lehrer IS NULL OR azubi IS NULL OR item IS NULL THEN
    RAISE EXCEPTION 'PROBE-ERGEBNIS: keine Lehrkraft mit Bereich, kein Azubi oder kein Item – Probe nicht möglich';
  END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'admin_audit_log' AND column_name = 'admin_name')
    INTO hat_spalte;

  -- Als Lehrkraft
  PERFORM set_config('request.jwt.claims', json_build_object('sub', lehrer, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE shop_items SET description = description WHERE id = item;
  GET DIAGNOSTICS lehrer_item_aendern = ROW_COUNT;
  BEGIN
    INSERT INTO admin_audit_log (admin_id, action_type, object_type, department_id)
    VALUES (lehrer, 'probe', 'probe', bereich);
    lehrer_protokoll_eigen := true;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN lehrer_protokoll_eigen := false; END;
  BEGIN
    INSERT INTO admin_audit_log (admin_id, action_type, object_type, department_id)
    VALUES (azubi, 'probe', 'probe', bereich);
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN lehrer_protokoll_fremd_gesperrt := true; END;
  SELECT EXISTS (SELECT 1 FROM admin_audit_log WHERE department_id = bereich) INTO lehrer_liest_protokoll;
  SELECT NOT can_manage_department(NULL) INTO verwaist_gesperrt;
  BEGIN
    PERFORM * FROM content_changes_per_person(now() - interval '1 day', now(), NULL);
    lehrer_rueckname_ok := true;
  EXCEPTION WHEN insufficient_privilege THEN lehrer_rueckname_ok := false; END;
  -- Profile bleiben zu: Lehrkraft liest über die Datenbank keine fremden Profile
  SELECT count(*) INTO lehrer_profile_fremd FROM profiles WHERE id <> lehrer AND role <> 'student';
  RESET ROLE;

  -- Als Azubi
  PERFORM set_config('request.jwt.claims', json_build_object('sub', azubi, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE shop_items SET description = description WHERE id = item;
  GET DIAGNOSTICS azubi_item_aendern = ROW_COUNT;
  SELECT EXISTS (SELECT 1 FROM admin_audit_log) INTO azubi_liest_protokoll;
  BEGIN
    PERFORM * FROM content_changes_per_person(now() - interval '1 day', now(), NULL);
  EXCEPTION WHEN insufficient_privilege THEN azubi_rueckname_gesperrt := true; END;
  RESET ROLE;

  RAISE EXCEPTION 'PROBE-ERGEBNIS: spalte_admin_name=% (soll true), lehrkraft_aendert_item_direkt=% (soll 0, Schreiben nur über die App), azubi_aendert_item=% (soll 0), lehrkraft_protokolliert_selbst=% (soll true), lehrkraft_fremder_eintrag_gesperrt=% (soll true), lehrkraft_liest_protokoll=% (soll true), azubi_liest_protokoll=% (soll false), verwaist_nur_super_admin=% (soll true), lehrkraft_auswertung_je_person=% (soll true), azubi_auswertung_gesperrt=% (soll true), lehrkraft_sieht_fremde_lehrer_profile=% (soll 0)',
    hat_spalte, lehrer_item_aendern, azubi_item_aendern, lehrer_protokoll_eigen, lehrer_protokoll_fremd_gesperrt,
    lehrer_liest_protokoll, azubi_liest_protokoll, verwaist_gesperrt, lehrer_rueckname_ok, azubi_rueckname_gesperrt,
    lehrer_profile_fremd;
END $$;
