-- 分會名稱正規化 + 管理員合併分會

CREATE OR REPLACE FUNCTION bni_normalize_branch_name(p_branch text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v text;
  base text;
BEGIN
  v := trim(regexp_replace(COALESCE(p_branch, ''), '\s+', '', 'g'));
  IF v = '' THEN RETURN ''; END IF;
  base := regexp_replace(v, '分會+$', '');
  IF base = '' THEN RETURN ''; END IF;
  RETURN base || '分會';
END;
$$;

-- 認領時一律正規化分會名
CREATE OR REPLACE FUNCTION bni_register_new_member(
  p_name text, p_branch text, p_region text DEFAULT NULL,
  p_profession text DEFAULT '', p_have text DEFAULT '', p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '', p_line_id text DEFAULT '', p_line_link text DEFAULT '',
  p_tags jsonb DEFAULT '[]'::jsonb,
  p_industries text[] DEFAULT '{}'::text[]
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
  v_branch := bni_normalize_branch_name(p_branch);
  IF v_branch = '' OR length(v_branch) > 80 THEN RAISE EXCEPTION 'INVALID_BRANCH'; END IF;
  v_region := COALESCE(NULLIF(trim(p_region), ''), bni_region_for_branch(v_branch));

  SELECT bni_current_jwt_email() INTO v_email;
  INSERT INTO bni_members (
    name, branch, region, profession, have, want_meet, want_referral,
    line_id, line_link, tags, industries, auth_user_id, google_email, status, active
  ) VALUES (
    trim(p_name), v_branch, v_region, left(p_profession, 200), left(p_have, 8000),
    left(p_want_meet, 2000), left(p_want_referral, 2000), left(p_line_id, 100),
    left(p_line_link, 500), COALESCE(p_tags, '[]'::jsonb), COALESCE(p_industries, '{}'::text[]),
    v_user_id, v_email, 'self_registered', true
  ) RETURNING id INTO v_id;

  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_id, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'member_id', v_id, 'name', trim(p_name), 'branch', v_branch);
END; $$;

CREATE OR REPLACE FUNCTION bni_admin_list_branches()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'branch', branch,
        'region', region,
        'count', cnt,
        'normalized', bni_normalize_branch_name(branch)
      ) ORDER BY region, branch
    )
    FROM (
      SELECT branch, region, count(*)::int AS cnt
      FROM bni_members WHERE active = true
      GROUP BY branch, region
    ) t
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION bni_admin_merge_branches(p_from text, p_to text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from text := bni_normalize_branch_name(p_from);
  v_to text := bni_normalize_branch_name(p_to);
  v_region text;
  v_count int;
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_from = '' OR v_to = '' THEN RAISE EXCEPTION 'INVALID_BRANCH'; END IF;
  IF v_from = v_to THEN RAISE EXCEPTION 'SAME_BRANCH'; END IF;
  v_region := bni_region_for_branch(v_to);

  UPDATE bni_members
    SET branch = v_to,
        region = v_region,
        updated_at = now()
    WHERE active = true
      AND bni_normalize_branch_name(branch) = v_from;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'from', v_from, 'to', v_to, 'updated', v_count);
END; $$;

GRANT EXECUTE ON FUNCTION bni_register_new_member(text,text,text,text,text,text,text,text,text,jsonb,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_normalize_branch_name(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_list_branches() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_merge_branches(text, text) TO authenticated;
