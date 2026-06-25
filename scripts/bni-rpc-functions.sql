CREATE OR REPLACE FUNCTION bni_bind_existing_member(p_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_email text; v_member bni_members%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id) THEN RAISE EXCEPTION 'ALREADY_BOUND'; END IF;
  SELECT bni_current_jwt_email() INTO v_email;
  SELECT * INTO v_member FROM bni_members WHERE id = p_member_id AND active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  IF v_member.auth_user_id IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_CLAIMED'; END IF;
  UPDATE bni_members SET auth_user_id = v_user_id, google_email = v_email, status = 'claimed', updated_at = now() WHERE id = p_member_id;
  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, p_member_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = p_member_id, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'member_id', p_member_id, 'name', v_member.name);
END; $$;

CREATE OR REPLACE FUNCTION bni_register_new_member(
  p_name text, p_branch text, p_region text DEFAULT 'zhongshan',
  p_profession text DEFAULT '', p_have text DEFAULT '', p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '', p_line_id text DEFAULT '', p_line_link text DEFAULT '',
  p_tags jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_email text; v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id) THEN RAISE EXCEPTION 'ALREADY_BOUND'; END IF;
  IF trim(p_name) = '' OR length(trim(p_name)) > 80 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF trim(p_branch) = '' THEN RAISE EXCEPTION 'INVALID_BRANCH'; END IF;
  SELECT bni_current_jwt_email() INTO v_email;
  INSERT INTO bni_members (name, branch, region, profession, have, want_meet, want_referral, line_id, line_link, tags, auth_user_id, google_email, status, active)
  VALUES (trim(p_name), trim(p_branch), p_region, left(p_profession, 200), left(p_have, 8000), left(p_want_meet, 2000), left(p_want_referral, 2000), left(p_line_id, 100), left(p_line_link, 500), COALESCE(p_tags,'[]'::jsonb), v_user_id, v_email, 'self_registered', true)
  RETURNING id INTO v_id;
  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_id, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'member_id', v_id, 'name', trim(p_name));
END; $$;

CREATE OR REPLACE FUNCTION bni_complete_tutorial()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  INSERT INTO bni_onboarding (auth_user_id, tutorial_done, updated_at) VALUES (v_user_id, true, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET tutorial_done = true, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $$;

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
  p_profession text DEFAULT '', p_have text DEFAULT '', p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '', p_line_id text DEFAULT '', p_line_link text DEFAULT ''
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT id INTO v_id FROM bni_members WHERE auth_user_id = v_user_id LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'NOT_BOUND'; END IF;
  UPDATE bni_members SET
    profession = left(trim(p_profession), 200), have = left(trim(p_have), 8000),
    want_meet = left(trim(p_want_meet), 2000), want_referral = left(trim(p_want_referral), 2000),
    line_id = left(trim(p_line_id), 100), line_link = left(trim(p_line_link), 500),
    updated_at = now() WHERE id = v_id;
  RETURN bni_get_my_status();
END; $$;

CREATE OR REPLACE FUNCTION bni_admin_dashboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stats jsonb; v_recent jsonb; v_onboard jsonb;
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT jsonb_build_object('total', count(*), 'active', count(*) FILTER (WHERE active), 'inactive', count(*) FILTER (WHERE NOT active),
    'bound', count(*) FILTER (WHERE auth_user_id IS NOT NULL), 'unbound', count(*) FILTER (WHERE auth_user_id IS NULL AND active),
    'roster', count(*) FILTER (WHERE status = 'roster'), 'claimed', count(*) FILTER (WHERE status = 'claimed'),
    'self_registered', count(*) FILTER (WHERE status = 'self_registered')) INTO v_stats FROM bni_members;
  SELECT jsonb_build_object('total_users', count(*), 'tutorial_done', count(*) FILTER (WHERE tutorial_done),
    'tutorial_pending', count(*) FILTER (WHERE NOT tutorial_done)) INTO v_onboard FROM bni_onboarding;
  SELECT COALESCE(jsonb_agg(t.row_data), '[]'::jsonb) INTO v_recent FROM (
    SELECT jsonb_build_object('member_id', m.id, 'name', m.name, 'branch', m.branch, 'status', m.status,
      'google_email', m.google_email, 'bound_at', m.updated_at, 'tutorial_done', COALESCE(o.tutorial_done, false)) AS row_data
    FROM bni_members m LEFT JOIN bni_onboarding o ON o.auth_user_id = m.auth_user_id
    WHERE m.auth_user_id IS NOT NULL ORDER BY m.updated_at DESC LIMIT 50) t;
  RETURN jsonb_build_object('members', v_stats, 'onboarding', v_onboard, 'recent_bindings', v_recent);
END; $$;

CREATE OR REPLACE FUNCTION bni_admin_unbind_member(p_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row bni_members%ROWTYPE;
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_row FROM bni_members WHERE id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  UPDATE bni_members SET auth_user_id = NULL, google_email = NULL,
    status = CASE WHEN status = 'self_registered' THEN 'self_registered' ELSE 'roster' END, updated_at = now() WHERE id = p_member_id;
  IF v_row.auth_user_id IS NOT NULL THEN DELETE FROM bni_onboarding WHERE auth_user_id = v_row.auth_user_id; END IF;
  RETURN jsonb_build_object('ok', true, 'name', v_row.name);
END; $$;

GRANT EXECUTE ON FUNCTION bni_bind_existing_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_register_new_member(text,text,text,text,text,text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_update_my_profile(text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_complete_tutorial() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_my_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bni_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_unbind_member(uuid) TO authenticated;
