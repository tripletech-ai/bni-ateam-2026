-- 會員自行更新媒合欄位 + 擴充 bni_get_my_status 回傳完整 profile

CREATE OR REPLACE FUNCTION bni_get_my_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_member bni_members%ROWTYPE; v_onboard bni_onboarding%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('authenticated', false); END IF;
  SELECT * INTO v_member FROM bni_members WHERE auth_user_id = v_user_id LIMIT 1;
  SELECT * INTO v_onboard FROM bni_onboarding WHERE auth_user_id = v_user_id LIMIT 1;
  RETURN jsonb_build_object('authenticated', true, 'bound', v_member.id IS NOT NULL,
    'tutorial_done', COALESCE(v_onboard.tutorial_done, false),
    'member', CASE WHEN v_member.id IS NOT NULL THEN jsonb_build_object(
      'id', v_member.id, 'name', v_member.name, 'branch', v_member.branch,
      'profession', v_member.profession, 'have', v_member.have,
      'want_meet', v_member.want_meet, 'want_referral', v_member.want_referral,
      'line_id', v_member.line_id, 'line_link', v_member.line_link,
      'status', v_member.status) ELSE NULL END);
END; $$;

CREATE OR REPLACE FUNCTION bni_update_my_profile(
  p_profession text DEFAULT '',
  p_have text DEFAULT '',
  p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '',
  p_line_id text DEFAULT '',
  p_line_link text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT id INTO v_id FROM bni_members WHERE auth_user_id = v_user_id LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'NOT_BOUND'; END IF;
  UPDATE bni_members SET
    profession = left(trim(p_profession), 200),
    have = left(trim(p_have), 8000),
    want_meet = left(trim(p_want_meet), 2000),
    want_referral = left(trim(p_want_referral), 2000),
    line_id = left(trim(p_line_id), 100),
    line_link = left(trim(p_line_link), 500),
    updated_at = now()
  WHERE id = v_id;
  RETURN bni_get_my_status();
END; $$;

GRANT EXECUTE ON FUNCTION bni_update_my_profile(text,text,text,text,text,text) TO authenticated;
