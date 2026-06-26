-- 同步 bni_bind_existing_member：禁止重複 INSERT（與 claim-by-name-branch 一致）
-- node scripts/run-insforge-sql.mjs scripts/patch-bind-no-duplicate.sql

CREATE OR REPLACE FUNCTION bni_bind_existing_member(p_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_member bni_members%ROWTYPE;
  v_target_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id AND active = true) THEN
    RAISE EXCEPTION 'ALREADY_BOUND';
  END IF;
  SELECT bni_current_jwt_email() INTO v_email;
  SELECT * INTO v_member FROM bni_members WHERE id = p_member_id AND active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  IF NOT bni_is_ateam_roster_branch(v_member.branch) THEN RAISE EXCEPTION 'NOT_ATEAM_BRANCH'; END IF;

  IF v_member.auth_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'NAME_BRANCH_TAKEN';
  END IF;

  UPDATE bni_members
    SET auth_user_id = v_user_id,
        google_email = v_email,
        status = CASE WHEN v_member.status = 'roster' THEN 'claimed' ELSE v_member.status END,
        updated_at = now()
    WHERE id = p_member_id;
  v_target_id := p_member_id;

  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_target_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_target_id, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'member_id', v_target_id, 'name', v_member.name, 'duplicate', false);
END; $$;

GRANT EXECUTE ON FUNCTION bni_bind_existing_member(uuid) TO authenticated;
