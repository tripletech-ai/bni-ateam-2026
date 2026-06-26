-- 使用者自行解除綁定，以便重新認領（一個 Google 帳號同時只能綁一筆）

CREATE OR REPLACE FUNCTION bni_self_unbind()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row bni_members%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_row FROM bni_members WHERE auth_user_id = v_user_id AND active = true FOR UPDATE;

  IF FOUND THEN
    UPDATE bni_members
      SET auth_user_id = NULL,
          google_email = NULL,
          status = CASE
            WHEN status = 'claimed' AND bni_is_ateam_roster_branch(branch) THEN 'roster'
            ELSE status
          END,
          updated_at = now()
    WHERE id = v_row.id;
  END IF;

  DELETE FROM bni_onboarding WHERE auth_user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'had_member', FOUND,
    'name', CASE WHEN FOUND THEN v_row.name ELSE NULL END
  );
END; $$;

GRANT EXECUTE ON FUNCTION bni_self_unbind() TO authenticated;
