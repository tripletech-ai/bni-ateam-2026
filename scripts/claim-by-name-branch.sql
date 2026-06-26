-- 登入認領：依「分會 + 中文姓名」在後台精準匹配既有名單（優先未認領列，禁止重複 INSERT）
-- 執行一次：node scripts/run-insforge-sql.mjs scripts/claim-by-name-branch.sql

CREATE OR REPLACE FUNCTION bni_normalize_claim_name(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(regexp_replace(COALESCE(p_name, ''), '\s+', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION bni_normalize_claim_branch(p_branch text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v text := trim(regexp_replace(COALESCE(p_branch, ''), '\s+', '', 'g'));
BEGIN
  IF v = '' THEN RETURN ''; END IF;
  IF v LIKE '~%' OR v LIKE '%海外%' OR v LIKE '%籌備%' OR v ILIKE '%overseas%' THEN
    RETURN v;
  END IF;
  v := regexp_replace(v, '分會+$', '');
  IF v = '' THEN RETURN ''; END IF;
  RETURN v || '分會';
END; $$;

CREATE OR REPLACE FUNCTION bni_claim_by_name_branch(
  p_name text,
  p_branch text,
  p_region text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_branch text;
  v_region text;
  v_member bni_members%ROWTYPE;
  v_target_id uuid;
  v_from_roster boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id AND active = true) THEN
    RAISE EXCEPTION 'ALREADY_BOUND';
  END IF;

  v_name := bni_normalize_claim_name(p_name);
  v_branch := bni_normalize_claim_branch(p_branch);
  IF v_name = '' OR length(v_name) < 2 OR length(v_name) > 80 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  IF v_branch = '' OR length(v_branch) > 80 THEN
    RAISE EXCEPTION 'INVALID_BRANCH';
  END IF;
  v_region := COALESCE(NULLIF(trim(p_region), ''), bni_region_for_branch(v_branch));

  SELECT bni_current_jwt_email() INTO v_email;

  -- 1) 優先綁定未認領列（含解除綁定後的 roster）
  SELECT * INTO v_member
  FROM bni_members m
  WHERE m.active = true
    AND bni_normalize_claim_name(m.name) = v_name
    AND bni_normalize_claim_branch(m.branch) = v_branch
    AND m.auth_user_id IS NULL
  ORDER BY
    CASE WHEN m.status = 'roster' THEN 0 ELSE 1 END,
    CASE WHEN bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio) THEN 0 ELSE 1 END,
    m.created_at NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_from_roster := v_member.status = 'roster';
    UPDATE bni_members
      SET auth_user_id = v_user_id,
          google_email = COALESCE(NULLIF(trim(v_email), ''), v_member.google_email),
          status = CASE
            WHEN v_member.status = 'roster' AND bni_is_ateam_roster_branch(v_member.branch) THEN 'claimed'
            ELSE v_member.status
          END,
          updated_at = now()
    WHERE id = v_member.id;
    v_target_id := v_member.id;

    INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
      VALUES (v_user_id, v_target_id, false, now())
      ON CONFLICT (auth_user_id) DO UPDATE
        SET bound_member_id = v_target_id, updated_at = now();

    RETURN jsonb_build_object(
      'ok', true,
      'matched', true,
      'member_id', v_target_id,
      'name', v_member.name,
      'branch', v_member.branch,
      'duplicate', false,
      'from_roster', v_from_roster
    );
  END IF;

  -- 2) 已有他人認領的同名同分會 → 拒絕（不再 INSERT 幽靈列）
  IF EXISTS (
    SELECT 1 FROM bni_members m
    WHERE m.active = true
      AND bni_normalize_claim_name(m.name) = v_name
      AND bni_normalize_claim_branch(m.branch) = v_branch
  ) THEN
    RAISE EXCEPTION 'NAME_BRANCH_TAKEN';
  END IF;

  -- 3) 完全新名單
  INSERT INTO bni_members (
    name, branch, region, profession, have, want_meet, want_referral,
    line_id, line_link, tags, industries, auth_user_id, google_email, status, active
  ) VALUES (
    v_name, v_branch, v_region, '', '', '', '', '', '', '[]'::jsonb, '{}'::text[],
    v_user_id, v_email, 'self_registered', true
  ) RETURNING id INTO v_target_id;

  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_target_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE
      SET bound_member_id = v_target_id, updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'matched', false,
    'member_id', v_target_id,
    'name', v_name,
    'branch', v_branch
  );
END; $$;

GRANT EXECUTE ON FUNCTION bni_normalize_claim_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_normalize_claim_branch(text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_claim_by_name_branch(text, text, text) TO authenticated;
