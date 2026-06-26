-- 管理員後台所需 RPC 一次部署（不含 register 覆寫）
-- node scripts/run-insforge-sql.mjs scripts/deploy-admin-rpcs.sql

-- 依賴：bni_is_admin() 須已存在（admin-email-fix.sql）

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

CREATE OR REPLACE FUNCTION bni_admin_delete_feed(p_feed_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted int;
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF p_feed_id IS NULL THEN RAISE EXCEPTION 'INVALID_ID'; END IF;

  DELETE FROM bni_feed WHERE id = p_feed_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted < 1 THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  RETURN jsonb_build_object('ok', true, 'id', p_feed_id);
END; $$;

CREATE TABLE IF NOT EXISTS bni_app_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO bni_app_settings (setting_key, setting_value)
VALUES ('live_leaderboard_modes', '["mutual","received_one"]'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE bni_app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bni_app_settings_no_direct ON bni_app_settings;
CREATE POLICY bni_app_settings_no_direct ON bni_app_settings FOR ALL USING (false);

CREATE OR REPLACE FUNCTION bni_get_live_settings()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_modes jsonb;
BEGIN
  SELECT setting_value INTO v_modes
  FROM bni_app_settings WHERE setting_key = 'live_leaderboard_modes';
  IF v_modes IS NULL OR jsonb_typeof(v_modes) <> 'array' OR jsonb_array_length(v_modes) < 1 THEN
    v_modes := '["mutual","received_one"]'::jsonb;
  END IF;
  RETURN jsonb_build_object('leaderboard_modes', v_modes);
END; $$;

CREATE OR REPLACE FUNCTION bni_admin_set_leaderboard_modes(p_modes jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_clean jsonb := '[]'::jsonb;
  v_item text;
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF p_modes IS NULL OR jsonb_typeof(p_modes) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_MODES';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements_text(p_modes)
  LOOP
    IF v_item IN ('mutual', 'received_one') THEN
      v_clean := v_clean || to_jsonb(v_item);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_clean) < 1 THEN
    RAISE EXCEPTION 'AT_LEAST_ONE_MODE';
  END IF;

  INSERT INTO bni_app_settings (setting_key, setting_value, updated_at)
    VALUES ('live_leaderboard_modes', v_clean, now())
    ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = EXCLUDED.setting_value, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'leaderboard_modes', v_clean);
END; $$;

GRANT EXECUTE ON FUNCTION bni_normalize_branch_name(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_list_branches() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_merge_branches(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_delete_feed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_live_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_set_leaderboard_modes(jsonb) TO authenticated;
