-- 修復認領：bio/card_link 欄位、register RPC、auto_bind、譚愷悌名片
-- BNI_API_KEY=... node scripts/apply-fix-onboard-db.mjs

ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS card_link text DEFAULT '';
ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS industries text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION bni_is_ateam_roster_branch(p_branch text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT trim(COALESCE(p_branch, '')) IN (
    '長悅分會','長佑分會','長翔分會','長城分會','長輝分會','長翼分會','長利分會','長和分會',
    '金鑫分會','金虎分會','金暘分會','金利分會','金澎湃分會','金鈺分會','金安分會',
    '金佑分會','金盟分會','金美分會','金英分會','金合分會'
  );
$$;

CREATE OR REPLACE FUNCTION bni_region_for_branch(p_branch text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN bni_is_ateam_roster_branch(p_branch) AND trim(p_branch) IN (
      '長悅分會','長佑分會','長翔分會','長城分會','長輝分會','長翼分會','長利分會','長和分會'
    ) THEN 'zhongshan'
    WHEN bni_is_ateam_roster_branch(p_branch) THEN 'sanlu'
    ELSE 'guest'
  END;
$$;

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
  IF NOT v_branch LIKE '%分會' AND v_branch NOT LIKE '~%' THEN v_branch := v_branch || '分會'; END IF;
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

CREATE OR REPLACE FUNCTION bni_member_profile_filled(
  p_profession text, p_have text, p_want_meet text, p_want_referral text, p_bio text
)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(COALESCE(p_profession, '')) <> ''
    AND (
      trim(COALESCE(p_have, '')) <> ''
      OR trim(COALESCE(p_want_meet, '')) <> ''
      OR trim(COALESCE(p_want_referral, '')) <> ''
      OR trim(COALESCE(p_bio, '')) <> ''
    );
$$;

CREATE OR REPLACE FUNCTION bni_auto_bind_on_login(p_display_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_member bni_members%ROWTYPE;
  v_name text;
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'bound', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_member FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF FOUND THEN
    INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
      VALUES (v_user_id, v_member.id, false, now())
      ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = EXCLUDED.bound_member_id, updated_at = now();
    RETURN jsonb_build_object(
      'ok', true, 'bound', true, 'auto', false,
      'member_id', v_member.id, 'name', v_member.name, 'branch', v_member.branch
    );
  END IF;

  SELECT bni_current_jwt_email() INTO v_email;
  v_name := trim(COALESCE(p_display_name, ''));

  IF v_email <> '' THEN
    SELECT * INTO v_member FROM bni_members m
    WHERE m.active = true AND m.auth_user_id IS NULL
      AND lower(trim(COALESCE(m.google_email, ''))) = v_email
      AND bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio)
    ORDER BY CASE WHEN m.status = 'roster' THEN 0 ELSE 1 END LIMIT 1;

    IF FOUND THEN
      UPDATE bni_members SET auth_user_id = v_user_id, google_email = v_email,
        status = CASE WHEN status = 'roster' THEN 'claimed' ELSE status END, updated_at = now()
      WHERE id = v_member.id;
      INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
        VALUES (v_user_id, v_member.id, false, now())
        ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_member.id, updated_at = now();
      RETURN jsonb_build_object('ok', true, 'bound', true, 'auto', true, 'method', 'email',
        'member_id', v_member.id, 'name', v_member.name, 'branch', v_member.branch);
    END IF;
  END IF;

  IF v_name <> '' THEN
    SELECT count(*)::int INTO v_count FROM bni_members m
    WHERE m.active = true AND m.auth_user_id IS NULL AND m.status = 'roster'
      AND bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio)
      AND trim(m.name) = v_name;

    IF v_count = 1 THEN
      SELECT * INTO v_member FROM bni_members m
      WHERE m.active = true AND m.auth_user_id IS NULL AND m.status = 'roster'
        AND bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio)
        AND trim(m.name) = v_name LIMIT 1;

      UPDATE bni_members SET auth_user_id = v_user_id,
        google_email = COALESCE(NULLIF(trim(google_email), ''), v_email),
        status = 'claimed', updated_at = now() WHERE id = v_member.id;
      INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
        VALUES (v_user_id, v_member.id, false, now())
        ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_member.id, updated_at = now();
      RETURN jsonb_build_object('ok', true, 'bound', true, 'auto', true, 'method', 'name',
        'member_id', v_member.id, 'name', v_member.name, 'branch', v_member.branch);
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'bound', false);
END; $$;

GRANT EXECUTE ON FUNCTION bni_auto_bind_on_login(text) TO authenticated;

-- 譚愷悌：名片 + 若名單無此人則建立（特邀顧問，可被搜尋）
INSERT INTO bni_members (name, branch, region, profession, have, bio, card_link, status, active, industries)
SELECT
  '譚愷悌',
  '特邀顧問',
  'guest',
  '企業內訓／財富流沙盤',
  'BNI 系統槓桿、企業內訓、沉浸式遊戲化培訓',
  '富而喜悅財富流沙盤企業內訓以沉浸式遊戲化方式，讓個人及企業有效理解及運用BNI系統槓桿，創造並激發學員目標感，深化片實戰模擬，帶入現實工作現學現用，轉化知識為有效行動，助力企業更好的落地領導與戰略。',
  'https://namegain.introvista.ai/card/cathytan',
  'roster',
  true,
  ARRAY['education_consult']::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM bni_members
  WHERE active = true
    AND regexp_replace(name, '[^\u4e00-\u9fff]', '', 'g') = '譚愷悌'
);

UPDATE bni_members
SET
  card_link = 'https://namegain.introvista.ai/card/cathytan',
  bio = CASE
    WHEN COALESCE(trim(bio), '') = '' THEN '富而喜悅財富流沙盤企業內訓以沉浸式遊戲化方式，讓個人及企業有效理解及運用BNI系統槓桿，創造並激發學員目標感，深化片實戰模擬，帶入現實工作現學現用，轉化知識為有效行動，助力企業更好的落地領導與戰略。'
    ELSE bio
  END,
  updated_at = now()
WHERE active = true
  AND regexp_replace(name, '[^\u4e00-\u9fff]', '', 'g') = '譚愷悌';
