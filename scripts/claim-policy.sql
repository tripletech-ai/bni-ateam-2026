-- A Team 認領規則：僅 20 分會名單可「綁定舊會員」；其他分會來賓走「認領新會員」

CREATE OR REPLACE FUNCTION bni_is_ateam_roster_branch(p_branch text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT trim(COALESCE(p_branch, '')) IN (
    '長悅分會','長佑分會','長翔分會','長城分會','長輝分會','長翼分會','長利分會','長和分會',
    '金鑫分會','金虎分會','金暘分會','金利分會','金澎湃分會','金鈺分會','金安分會',
    '金佑分會','金盟分會','金美分會','金英分會','金合分會'
  );
$$;

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
  IF v_member.status IS DISTINCT FROM 'roster' THEN RAISE EXCEPTION 'NOT_ROSTER_MEMBER'; END IF;
  IF NOT bni_is_ateam_roster_branch(v_member.branch) THEN RAISE EXCEPTION 'NOT_ATEAM_BRANCH'; END IF;
  UPDATE bni_members SET auth_user_id = v_user_id, google_email = v_email, status = 'claimed', updated_at = now() WHERE id = p_member_id;
  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, p_member_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = p_member_id, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'member_id', p_member_id, 'name', v_member.name);
END; $$;

CREATE OR REPLACE FUNCTION bni_register_new_member(
  p_name text, p_branch text, p_region text DEFAULT 'guest',
  p_profession text DEFAULT '', p_have text DEFAULT '', p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '', p_line_id text DEFAULT '', p_line_link text DEFAULT '',
  p_tags jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_email text; v_id uuid; v_branch text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id) THEN RAISE EXCEPTION 'ALREADY_BOUND'; END IF;
  IF trim(p_name) = '' OR length(trim(p_name)) > 80 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  v_branch := trim(p_branch);
  IF v_branch = '' OR length(v_branch) > 80 THEN RAISE EXCEPTION 'INVALID_BRANCH'; END IF;
  IF bni_is_ateam_roster_branch(v_branch) THEN RAISE EXCEPTION 'USE_BIND_EXISTING'; END IF;
  SELECT bni_current_jwt_email() INTO v_email;
  INSERT INTO bni_members (name, branch, region, profession, have, want_meet, want_referral, line_id, line_link, tags, auth_user_id, google_email, status, active)
  VALUES (trim(p_name), v_branch, COALESCE(NULLIF(trim(p_region), ''), 'guest'), left(p_profession, 200), left(p_have, 8000), left(p_want_meet, 2000), left(p_want_referral, 2000), left(p_line_id, 100), left(p_line_link, 500), COALESCE(p_tags,'[]'::jsonb), v_user_id, v_email, 'self_registered', true)
  RETURNING id INTO v_id;
  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_id, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'member_id', v_id, 'name', trim(p_name));
END; $$;

CREATE OR REPLACE FUNCTION bni_search_unbound_members(p_query text, p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_q text := left(trim(COALESCE(p_query, '')), 80);
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF length(v_q) < 1 THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(m)::jsonb ORDER BY m.name)
    FROM (
      SELECT id, roster_id, name, branch, region, profession, have, want_meet, want_referral,
             line_id, line_link, tags, status
      FROM bni_members
      WHERE active = true AND auth_user_id IS NULL AND status = 'roster'
        AND bni_is_ateam_roster_branch(branch)
        AND (
          name ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
          OR branch ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
        )
      ORDER BY name
      LIMIT v_limit
    ) m
  ), '[]'::jsonb);
END; $$;
