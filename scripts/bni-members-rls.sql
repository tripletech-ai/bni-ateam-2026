-- bni_members / bni_onboarding RLS + 公開／管理員 RPC（禁止 REST 直連表）
-- 執行：node scripts/run-insforge-sql.mjs scripts/bni-members-rls.sql

-- ── RLS：所有讀寫必須走 SECURITY DEFINER RPC ──
ALTER TABLE bni_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bni_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bni_members_no_direct ON bni_members;
CREATE POLICY bni_members_no_direct ON bni_members FOR ALL USING (false);

DROP POLICY IF EXISTS bni_onboarding_no_direct ON bni_onboarding;
CREATE POLICY bni_onboarding_no_direct ON bni_onboarding FOR ALL USING (false);

-- ── 公開名單（不含 google_email / auth_user_id）──
CREATE OR REPLACE FUNCTION bni_get_public_members(p_include_inactive boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(m)::jsonb ORDER BY m.roster_id NULLS LAST, m.name)
    FROM (
      SELECT
        id, roster_id, name, branch, region,
        profession, have, want_meet, want_referral,
        line_id, line_link, bio, card_link,
        tags, industries, status, active,
        (auth_user_id IS NOT NULL) AS claimed
      FROM bni_members
      WHERE (p_include_inactive OR active = true)
      ORDER BY roster_id NULLS LAST, name
      LIMIT 1000
    ) m
  ), '[]'::jsonb);
END; $$;

-- ── 管理員名單（含綁定資訊）──
CREATE OR REPLACE FUNCTION bni_admin_list_members(p_include_inactive boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(m)::jsonb ORDER BY m.roster_id NULLS LAST, m.name)
    FROM (
      SELECT *
      FROM bni_members
      WHERE (p_include_inactive OR active = true)
      ORDER BY roster_id NULLS LAST, name
      LIMIT 2000
    ) m
  ), '[]'::jsonb);
END; $$;

-- ── 管理員更新會員 ──
CREATE OR REPLACE FUNCTION bni_admin_update_member(p_member_id uuid, p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row bni_members%ROWTYPE;
  v_branch text;
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_member_id IS NULL THEN RAISE EXCEPTION 'INVALID_ID'; END IF;

  v_branch := NULLIF(trim(p_patch->>'branch'), '');
  IF v_branch IS NOT NULL THEN
    v_branch := bni_normalize_branch_name(v_branch);
  END IF;

  UPDATE bni_members SET
    name = COALESCE(NULLIF(left(trim(p_patch->>'name'), 80), ''), name),
    branch = COALESCE(v_branch, branch),
    region = CASE
      WHEN v_branch IS NOT NULL THEN bni_region_for_branch(v_branch)
      ELSE region
    END,
    profession = COALESCE(left(p_patch->>'profession', 200), profession),
    have = COALESCE(left(p_patch->>'have', 8000), have),
    want_meet = COALESCE(left(p_patch->>'want_meet', 2000), want_meet),
    want_referral = COALESCE(left(p_patch->>'want_referral', 2000), want_referral),
    bio = COALESCE(left(p_patch->>'bio', 8000), bio),
    card_link = COALESCE(left(p_patch->>'card_link', 500), card_link),
    line_id = COALESCE(left(p_patch->>'line_id', 100), line_id),
    line_link = COALESCE(left(p_patch->>'line_link', 500), line_link),
    active = COALESCE((p_patch->>'active')::boolean, active),
    updated_at = now()
  WHERE id = p_member_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN to_jsonb(v_row);
END; $$;

-- ── 管理員新增會員（種子／手動補登）──
CREATE OR REPLACE FUNCTION bni_admin_create_member(p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_name text := left(trim(p_row->>'name'), 80);
  v_branch text := bni_normalize_branch_name(p_row->>'branch');
  v_region text;
  v_status text := COALESCE(NULLIF(trim(p_row->>'status'), ''), 'self_registered');
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_name = '' OR v_branch = '' THEN RAISE EXCEPTION 'INVALID_INPUT'; END IF;
  v_region := COALESCE(NULLIF(trim(p_row->>'region'), ''), bni_region_for_branch(v_branch));

  INSERT INTO bni_members (
    name, branch, region, profession, have, want_meet, want_referral,
    line_id, line_link, bio, card_link, tags, industries, status, active
  ) VALUES (
    v_name, v_branch, v_region,
    left(COALESCE(p_row->>'profession', ''), 200),
    left(COALESCE(p_row->>'have', ''), 8000),
    left(COALESCE(p_row->>'want_meet', ''), 2000),
    left(COALESCE(p_row->>'want_referral', ''), 2000),
    left(COALESCE(p_row->>'line_id', ''), 100),
    left(COALESCE(p_row->>'line_link', ''), 500),
    left(COALESCE(p_row->>'bio', ''), 8000),
    left(COALESCE(p_row->>'card_link', ''), 500),
    COALESCE(p_row->'tags', '[]'::jsonb),
    '{}'::text[],
    v_status,
    COALESCE((p_row->>'active')::boolean, true)
  ) RETURNING id INTO v_id;

  RETURN (SELECT to_jsonb(m) FROM bni_members m WHERE m.id = v_id);
END; $$;

GRANT EXECUTE ON FUNCTION bni_get_public_members(boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_list_members(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_update_member(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_create_member(jsonb) TO authenticated;
