-- 僅產業欄位 + 公開統計（不依賴 connection_marks）

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

CREATE OR REPLACE FUNCTION bni_get_public_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_total int; v_branches jsonb; v_industries jsonb; v_tag_total int;
BEGIN
  SELECT count(*)::int INTO v_total FROM bni_members WHERE active = true;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('branch', branch, 'region', region, 'count', cnt) ORDER BY region, branch
  ), '[]'::jsonb) INTO v_branches FROM (
    SELECT branch, region, count(*)::int AS cnt
    FROM bni_members WHERE active = true
    GROUP BY branch, region
  ) t;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', industry_id, 'count', cnt) ORDER BY cnt DESC, industry_id
  ), '[]'::jsonb) INTO v_industries FROM (
    SELECT unnest(industries) AS industry_id, count(*)::int AS cnt
    FROM bni_members
    WHERE active = true AND coalesce(array_length(industries, 1), 0) > 0
    GROUP BY industry_id
  ) i;

  SELECT coalesce(sum(cnt), 0)::int INTO v_tag_total FROM (
    SELECT count(*)::int AS cnt
    FROM bni_members, unnest(industries) AS industry_id
    WHERE active = true AND coalesce(array_length(industries, 1), 0) > 0
    GROUP BY industry_id
  ) x;

  RETURN jsonb_build_object(
    'total_members', v_total,
    'branch_count', COALESCE(jsonb_array_length(v_branches), 0),
    'branches', v_branches,
    'industries', COALESCE(v_industries, '[]'::jsonb),
    'industry_tag_total', COALESCE(v_tag_total, 0)
  );
END; $$;

GRANT EXECUTE ON FUNCTION bni_normalize_industries(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_public_stats() TO authenticated, anon;
