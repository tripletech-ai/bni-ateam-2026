-- 修復「我的資料」更新：統一 bni_update_my_profile 為含 bio/card_link/industries 的完整版
-- BNI_API_KEY=... node scripts/apply-fix-profile-permissions.mjs

ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS card_link text DEFAULT '';
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
      'bio', COALESCE(v_member.bio, ''), 'card_link', COALESCE(v_member.card_link, ''),
      'industries', to_jsonb(COALESCE(v_member.industries, '{}'::text[])),
      'status', v_member.status) ELSE NULL END);
END; $$;

-- 移除舊版 overload，避免 PostgREST 簽名衝突
DROP FUNCTION IF EXISTS bni_update_my_profile(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS bni_update_my_profile(text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS bni_update_my_profile(text, text, text, text, text, text, text, text, text[]);

CREATE OR REPLACE FUNCTION bni_update_my_profile(
  p_profession text DEFAULT '', p_have text DEFAULT '', p_want_meet text DEFAULT '',
  p_want_referral text DEFAULT '', p_line_id text DEFAULT '', p_line_link text DEFAULT '',
  p_bio text DEFAULT '', p_card_link text DEFAULT '', p_industries text[] DEFAULT '{}'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT id INTO v_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'NOT_BOUND'; END IF;
  UPDATE bni_members SET
    profession = left(trim(COALESCE(p_profession, '')), 200),
    have = left(trim(COALESCE(p_have, '')), 8000),
    want_meet = left(trim(COALESCE(p_want_meet, '')), 2000),
    want_referral = left(trim(COALESCE(p_want_referral, '')), 2000),
    line_id = left(trim(COALESCE(p_line_id, '')), 100),
    line_link = left(trim(COALESCE(p_line_link, '')), 500),
    bio = left(trim(COALESCE(p_bio, '')), 4000),
    card_link = left(trim(COALESCE(p_card_link, '')), 500),
    industries = bni_normalize_industries(p_industries),
    updated_at = now()
  WHERE id = v_id;
  RETURN bni_get_my_status();
END; $$;

GRANT EXECUTE ON FUNCTION bni_normalize_industries(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_my_status() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_update_my_profile(text, text, text, text, text, text, text, text, text[]) TO authenticated;
