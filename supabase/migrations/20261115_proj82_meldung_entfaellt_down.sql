-- Rückweg zu 20261115_proj82_meldung_entfaellt.sql: nur noch „korrigiert“ und „nicht_uebernommen“ erlaubt.
-- Bereits mit „entfaellt“ geschlossene Meldungen bleiben unverändert.

CREATE OR REPLACE FUNCTION close_question_reports(
  p_question_id uuid,
  p_result text,
  p_response text DEFAULT NULL,
  p_silent boolean DEFAULT false,
  p_report_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_resp text := nullif(btrim(coalesce(p_response, '')), '');
  v_version uuid;
  v_reward integer;
  v_closed integer := 0;
  v_rewarded integer := 0;
  r question_reports%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT has_teacher_role() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_result IS NULL OR p_result NOT IN ('korrigiert', 'nicht_uebernommen') THEN
    RAISE EXCEPTION 'INVALID_RESULT' USING ERRCODE = '22023';
  END IF;
  IF v_resp IS NOT NULL AND char_length(v_resp) > 200 THEN
    RAISE EXCEPTION 'RESPONSE_TOO_LONG' USING ERRCODE = '22023';
  END IF;

  IF p_result = 'korrigiert' THEN
    SELECT id INTO v_version FROM content_versions
     WHERE content_type = 'question' AND content_id = p_question_id
     ORDER BY version_number DESC LIMIT 1;
  END IF;

  FOR r IN
    SELECT * FROM question_reports
     WHERE question_id = p_question_id
       AND status IN ('offen', 'in_pruefung')
       AND (p_report_ids IS NULL OR id = ANY (p_report_ids))
     ORDER BY created_at
     FOR UPDATE
  LOOP
    v_reward := 0;
    IF p_result = 'korrigiert'
       AND NOT p_silent
       AND r.reporter_id IS NOT NULL
       AND r.reporter_id <> v_uid
       AND r.rewarded_at IS NULL
       AND (SELECT count(*) FROM question_reports x
             WHERE x.reporter_id = r.reporter_id AND x.rewarded_at > now() - interval '7 days') < 5
    THEN
      UPDATE profiles SET coin_balance = coin_balance + 15 WHERE id = r.reporter_id;
      IF FOUND THEN v_reward := 15; END IF;
    END IF;

    UPDATE question_reports
       SET status = p_result,
           closed_at = now(),
           handled_by = v_uid,
           response_text = v_resp,
           silent = p_silent,
           resolved_version_id = v_version,
           reward_coins = v_reward,
           rewarded_at = CASE WHEN v_reward > 0 THEN now() ELSE NULL END,
           feedback_read_at = CASE WHEN p_silent THEN now() ELSE NULL END
     WHERE id = r.id;

    v_closed := v_closed + 1;
    IF v_reward > 0 THEN v_rewarded := v_rewarded + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('closed', v_closed, 'rewarded', v_rewarded);
END
$$;
