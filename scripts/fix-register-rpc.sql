-- 修復「送出並完成認領」：bni_register_new_member 需支援 p_industries
-- 在 InsForge 後台執行，或：BNI_API_KEY=... node scripts/apply-fix-register-rpc.mjs

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

-- 移除舊簽名，避免 PostgREST 找不到匹配參數
DROP FUNCTION IF EXISTS bni_register_new_member(text,text,text,text,text,text,text,text,text,jsonb);
DROP FUNCTION IF EXISTS bni_register_new_member(text,text,text,text,text,text,text,text,text,jsonb,text[]);

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

GRANT EXECUTE ON FUNCTION bni_normalize_industries(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_register_new_member(text,text,text,text,text,text,text,text,text,jsonb,text[]) TO authenticated;
