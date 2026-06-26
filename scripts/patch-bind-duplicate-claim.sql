-- 僅更新 bni_bind_existing_member：同名已認領時複製建立新檔（不動 register RPC 簽名）
CREATE OR REPLACE FUNCTION bni_bind_existing_member(p_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_member bni_members%ROWTYPE;
  v_target_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id) THEN RAISE EXCEPTION 'ALREADY_BOUND'; END IF;
  SELECT bni_current_jwt_email() INTO v_email;
  SELECT * INTO v_member FROM bni_members WHERE id = p_member_id AND active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  IF NOT bni_is_ateam_roster_branch(v_member.branch) THEN RAISE EXCEPTION 'NOT_ATEAM_BRANCH'; END IF;

  IF v_member.auth_user_id IS NOT NULL OR v_member.status IS DISTINCT FROM 'roster' THEN
    INSERT INTO bni_members (
      name, branch, region, profession, have, want_meet, want_referral,
      line_id, line_link, tags, auth_user_id, google_email, status, active
    ) VALUES (
      v_member.name, v_member.branch, v_member.region, v_member.profession, v_member.have,
      v_member.want_meet, v_member.want_referral, v_member.line_id, v_member.line_link,
      v_member.tags, v_user_id, v_email, 'self_registered', true
    ) RETURNING id INTO v_target_id;
  ELSE
    UPDATE bni_members
      SET auth_user_id = v_user_id, google_email = v_email, status = 'claimed', updated_at = now()
      WHERE id = p_member_id;
    v_target_id := p_member_id;
  END IF;

  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_target_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_target_id, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'member_id', v_target_id, 'name', v_member.name, 'duplicate', v_member.auth_user_id IS NOT NULL);
END; $$;

GRANT EXECUTE ON FUNCTION bni_bind_existing_member(uuid) TO authenticated;
