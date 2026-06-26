-- 大產業分類（複選最多 2）、公開統計、強化 connection_marks RLS

ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS industries text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION bni_normalize_industries(p_industries text[])
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'finance','legal_tax','built_space','marketing_media','tech_digital',
    'food_beverage','health_beauty','education_consult','trade_retail','lifestyle_service'
  ];
  v_result text[] := '{}';
  v_item text;
BEGIN
  IF p_industries IS NULL THEN RETURN v_result; END IF;
  FOREACH v_item IN ARRAY p_industries LOOP
    v_item := lower(trim(v_item));
    IF v_item = ANY(v_allowed) AND NOT (v_item = ANY(v_result)) THEN
      v_result := array_append(v_result, v_item);
      EXIT WHEN coalesce(array_length(v_result, 1), 0) >= 2;
    END IF;
  END LOOP;
  RETURN v_result;
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
      'bio', v_member.bio, 'card_link', v_member.card_link,
      'industries', to_jsonb(COALESCE(v_member.industries, '{}'::text[])),
      'status', v_member.status) ELSE NULL END);
END; $$;

CREATE OR REPLACE FUNCTION bni_update_my_profile(
  p_profession text DEFAULT '', p_have text DEFAULT '', p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '', p_line_id text DEFAULT '', p_line_link text DEFAULT '',
  p_bio text DEFAULT '', p_card_link text DEFAULT '', p_industries text[] DEFAULT '{}'
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
    bio = left(trim(p_bio), 4000),
    card_link = left(trim(p_card_link), 500),
    industries = bni_normalize_industries(p_industries),
    updated_at = now()
  WHERE id = v_id;
  RETURN bni_get_my_status();
END; $$;

CREATE OR REPLACE FUNCTION bni_register_new_member(
  p_name text, p_branch text, p_region text DEFAULT NULL,
  p_profession text DEFAULT '', p_have text DEFAULT '', p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '', p_line_id text DEFAULT '', p_line_link text DEFAULT '',
  p_tags jsonb DEFAULT '[]'::jsonb, p_industries text[] DEFAULT '{}'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_id uuid;
  v_branch text;
  v_region text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id) THEN RAISE EXCEPTION 'ALREADY_BOUND'; END IF;
  IF trim(p_name) = '' OR length(trim(p_name)) > 80 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  v_branch := trim(p_branch);
  IF v_branch = '' OR length(v_branch) > 80 THEN RAISE EXCEPTION 'INVALID_BRANCH'; END IF;
  IF NOT v_branch LIKE '%分會' THEN v_branch := v_branch || '分會'; END IF;
  v_region := COALESCE(NULLIF(trim(p_region), ''), bni_region_for_branch(v_branch));
  SELECT bni_current_jwt_email() INTO v_email;
  INSERT INTO bni_members (
    name, branch, region, profession, have, want_meet, want_referral,
    line_id, line_link, tags, industries, auth_user_id, google_email, status, active
  ) VALUES (
    trim(p_name), v_branch, v_region, left(p_profession, 200), left(p_have, 8000),
    left(p_want_meet, 2000), left(p_want_referral, 2000), left(p_line_id, 100),
    left(p_line_link, 500), COALESCE(p_tags, '[]'::jsonb), bni_normalize_industries(p_industries),
    v_user_id, v_email, 'self_registered', true
  ) RETURNING id INTO v_id;
  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_id, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'member_id', v_id, 'name', trim(p_name), 'branch', v_branch);
END; $$;

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
  IF v_member.status IS DISTINCT FROM 'roster' THEN RAISE EXCEPTION 'NOT_ROSTER_MEMBER'; END IF;
  IF NOT bni_is_ateam_roster_branch(v_member.branch) THEN RAISE EXCEPTION 'NOT_ATEAM_BRANCH'; END IF;

  IF v_member.auth_user_id IS NOT NULL THEN
    INSERT INTO bni_members (
      name, branch, region, profession, have, want_meet, want_referral,
      line_id, line_link, tags, bio, card_link, industries,
      auth_user_id, google_email, status, active
    ) VALUES (
      v_member.name, v_member.branch, v_member.region, v_member.profession, v_member.have,
      v_member.want_meet, v_member.want_referral, v_member.line_id, v_member.line_link,
      v_member.tags, v_member.bio, v_member.card_link, v_member.industries,
      v_user_id, v_email, 'self_registered', true
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

CREATE OR REPLACE FUNCTION bni_get_public_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_total int; v_branches jsonb; v_industries jsonb;
BEGIN
  SELECT count(*)::int INTO v_total FROM bni_members WHERE active = true;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('branch', branch, 'region', region, 'count', cnt) ORDER BY region, branch
  ), '[]'::jsonb) INTO v_branches FROM (
    SELECT branch, region, count(*)::int AS cnt
    FROM bni_members WHERE active = true
    GROUP BY branch, region
  ) t;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', industry_id, 'count', cnt) ORDER BY cnt DESC, industry_id
  ), '[]'::jsonb) INTO v_industries FROM (
    SELECT unnest(industries) AS industry_id, count(*)::int AS cnt
    FROM bni_members
    WHERE active = true AND coalesce(array_length(industries, 1), 0) > 0
    GROUP BY industry_id
  ) i;
  RETURN jsonb_build_object(
    'total_members', v_total,
    'branch_count', COALESCE(jsonb_array_length(v_branches), 0),
    'branches', v_branches,
    'industries', v_industries
  );
END; $$;

-- connection_marks：禁止直接 REST 讀寫，僅 RPC 存取
ALTER TABLE bni_connection_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bni_connection_marks_no_direct ON bni_connection_marks;
CREATE POLICY bni_connection_marks_no_direct ON bni_connection_marks
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

GRANT EXECUTE ON FUNCTION bni_normalize_industries(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_update_my_profile(text,text,text,text,text,text,text,text,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_register_new_member(text,text,text,text,text,text,text,text,text,jsonb,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_bind_existing_member(uuid) TO authenticated;
