-- 登入認領：優先未認領列；若已被認領 → 取代原綁定者（同一列，不 INSERT 幽靈列）
-- node scripts/run-insforge-sql.mjs scripts/claim-by-name-branch.sql

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
  v_replaced boolean := false;
  v_prev_user uuid;
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

  -- 1) 優先綁定未認領列
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

  -- 2) 皆已認領 → 選 canonical 列並取代原綁定者
  IF NOT FOUND THEN
    SELECT * INTO v_member
    FROM bni_members m
    WHERE m.active = true
      AND bni_normalize_claim_name(m.name) = v_name
      AND bni_normalize_claim_branch(m.branch) = v_branch
    ORDER BY
      CASE WHEN m.status = 'roster' THEN 0 WHEN m.status = 'claimed' THEN 1 ELSE 2 END,
      CASE WHEN m.roster_id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio) THEN 0 ELSE 1 END,
      m.created_at NULLS FIRST
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      v_prev_user := v_member.auth_user_id;
      v_replaced := v_prev_user IS NOT NULL AND v_prev_user <> v_user_id;
      IF v_replaced THEN
        DELETE FROM bni_onboarding WHERE auth_user_id = v_prev_user;
      END IF;
    END IF;
  END IF;

  IF FOUND THEN
    v_from_roster := v_member.status IN ('roster', 'claimed');
    UPDATE bni_members
      SET auth_user_id = v_user_id,
          google_email = COALESCE(NULLIF(trim(v_email), ''), v_member.google_email),
          status = CASE
            WHEN v_member.status = 'roster' AND bni_is_ateam_roster_branch(v_member.branch) THEN 'claimed'
            WHEN v_member.status = 'roster' THEN 'claimed'
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
      'duplicate', v_replaced,
      'replaced', v_replaced,
      'from_roster', v_from_roster AND NOT v_replaced
    );
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
    'branch', v_branch,
    'duplicate', false,
    'replaced', false
  );
END; $$;

CREATE OR REPLACE FUNCTION bni_bind_existing_member(p_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_member bni_members%ROWTYPE;
  v_target_id uuid;
  v_replaced boolean := false;
  v_prev_user uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF EXISTS (SELECT 1 FROM bni_members WHERE auth_user_id = v_user_id AND active = true) THEN
    RAISE EXCEPTION 'ALREADY_BOUND';
  END IF;
  SELECT bni_current_jwt_email() INTO v_email;
  SELECT * INTO v_member FROM bni_members WHERE id = p_member_id AND active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;
  IF NOT bni_is_ateam_roster_branch(v_member.branch) THEN RAISE EXCEPTION 'NOT_ATEAM_BRANCH'; END IF;

  v_prev_user := v_member.auth_user_id;
  v_replaced := v_prev_user IS NOT NULL AND v_prev_user <> v_user_id;
  IF v_replaced THEN
    DELETE FROM bni_onboarding WHERE auth_user_id = v_prev_user;
  END IF;

  UPDATE bni_members
    SET auth_user_id = v_user_id,
        google_email = v_email,
        status = CASE
          WHEN v_member.status = 'roster' THEN 'claimed'
          ELSE v_member.status
        END,
        updated_at = now()
    WHERE id = p_member_id;
  v_target_id := p_member_id;

  INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
    VALUES (v_user_id, v_target_id, false, now())
    ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_target_id, updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'member_id', v_target_id,
    'name', v_member.name,
    'duplicate', v_replaced,
    'replaced', v_replaced
  );
END; $$;

GRANT EXECUTE ON FUNCTION bni_normalize_claim_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_normalize_claim_branch(text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_claim_by_name_branch(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_bind_existing_member(uuid) TO authenticated;
