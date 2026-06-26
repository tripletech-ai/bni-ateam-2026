-- 排行榜模式：連結王 (mutual) / 被標記王 (received_one) + 管理員可設定顯示哪些

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

CREATE OR REPLACE FUNCTION bni_get_leaderboard(p_limit int DEFAULT 30, p_mode text DEFAULT 'mutual')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_mode text := lower(trim(COALESCE(p_mode, 'mutual')));
BEGIN
  IF v_mode NOT IN ('mutual', 'received_one') THEN
    v_mode := 'mutual';
  END IF;

  IF v_mode = 'received_one' THEN
    RETURN COALESCE((
      SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.rank)
      FROM (
        SELECT
          row_number() OVER (ORDER BY sub.marked_count DESC, sub.name) AS rank,
          sub.member_id, sub.name, sub.branch, sub.profession, sub.marked_count AS score
        FROM (
          SELECT
            m.id AS member_id,
            m.name,
            m.branch,
            m.profession,
            (
              SELECT COUNT(DISTINCT cm.from_member_id)::int
              FROM bni_connection_marks cm
              WHERE cm.to_member_id = m.id AND cm.mark_type = 'one'
            ) AS marked_count
          FROM bni_members m
          WHERE m.active = true AND m.auth_user_id IS NOT NULL
        ) sub
        WHERE sub.marked_count > 0
        ORDER BY sub.marked_count DESC, sub.name
        LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 50))
      ) x
    ), '[]'::jsonb);
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.rank)
    FROM (
      SELECT
        row_number() OVER (ORDER BY sub.mutual_count DESC, sub.name) AS rank,
        sub.member_id, sub.name, sub.branch, sub.profession, sub.mutual_count AS score
      FROM (
        SELECT
          m.id AS member_id,
          m.name,
          m.branch,
          m.profession,
          (
            SELECT COUNT(DISTINCT cm.to_member_id)::int
            FROM bni_connection_marks cm
            WHERE cm.from_member_id = m.id
              AND cm.mark_type = 'one'
              AND EXISTS (
                SELECT 1 FROM bni_connection_marks cm2
                WHERE cm2.from_member_id = cm.to_member_id
                  AND cm2.to_member_id = m.id
                  AND cm2.mark_type = 'one'
              )
          ) AS mutual_count
        FROM bni_members m
        WHERE m.active = true AND m.auth_user_id IS NOT NULL
      ) sub
      WHERE sub.mutual_count > 0
      ORDER BY sub.mutual_count DESC, sub.name
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 50))
    ) x
  ), '[]'::jsonb);
END; $$;

GRANT EXECUTE ON FUNCTION bni_get_live_settings() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bni_admin_set_leaderboard_modes(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_leaderboard(int, text) TO authenticated, anon;
