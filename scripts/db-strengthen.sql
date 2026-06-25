-- BNI DB 強化：索引、updated_at、公開統計與安全搜尋 RPC

CREATE INDEX IF NOT EXISTS bni_members_active_branch_idx ON bni_members (region, branch) WHERE active = true;
CREATE INDEX IF NOT EXISTS bni_members_active_name_idx ON bni_members (name) WHERE active = true;
CREATE INDEX IF NOT EXISTS bni_members_unbound_idx ON bni_members (name) WHERE active = true AND auth_user_id IS NULL;

CREATE OR REPLACE FUNCTION bni_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS bni_members_updated_at ON bni_members;
CREATE TRIGGER bni_members_updated_at
  BEFORE UPDATE ON bni_members
  FOR EACH ROW EXECUTE FUNCTION bni_set_updated_at();

DROP TRIGGER IF EXISTS bni_onboarding_updated_at ON bni_onboarding;
CREATE TRIGGER bni_onboarding_updated_at
  BEFORE UPDATE ON bni_onboarding
  FOR EACH ROW EXECUTE FUNCTION bni_set_updated_at();

CREATE OR REPLACE FUNCTION bni_get_public_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_total int; v_branches jsonb;
BEGIN
  SELECT count(*)::int INTO v_total FROM bni_members WHERE active = true;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('branch', branch, 'region', region, 'count', cnt) ORDER BY region, branch
  ), '[]'::jsonb) INTO v_branches FROM (
    SELECT branch, region, count(*)::int AS cnt
    FROM bni_members WHERE active = true
    GROUP BY branch, region
  ) t;
  RETURN jsonb_build_object(
    'total_members', v_total,
    'branch_count', COALESCE(jsonb_array_length(v_branches), 0),
    'branches', v_branches
  );
END; $$;

CREATE OR REPLACE FUNCTION bni_search_members(p_query text, p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_q text := left(trim(COALESCE(p_query, '')), 80);
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF length(v_q) < 1 THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(m)::jsonb ORDER BY m.name)
    FROM (
      SELECT id, roster_id, name, branch, region, profession, have, want_meet, want_referral,
             line_id, line_link, tags, status
      FROM bni_members
      WHERE active = true
        AND (
          name ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
          OR branch ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
          OR profession ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
          OR have ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
          OR want_meet ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
        )
      ORDER BY name
      LIMIT v_limit
    ) m
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION bni_search_unbound_members(p_query text, p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_q text := left(trim(COALESCE(p_query, '')), 80);
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF length(v_q) < 1 THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(m)::jsonb ORDER BY m.name)
    FROM (
      SELECT id, roster_id, name, branch, region, profession, have, want_meet, want_referral,
             line_id, line_link, tags, status
      FROM bni_members
      WHERE active = true AND auth_user_id IS NULL
        AND (
          name ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
          OR branch ILIKE '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
        )
      ORDER BY name
      LIMIT v_limit
    ) m
  ), '[]'::jsonb);
END; $$;

GRANT EXECUTE ON FUNCTION bni_get_public_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bni_search_members(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bni_search_unbound_members(text, int) TO anon, authenticated;
