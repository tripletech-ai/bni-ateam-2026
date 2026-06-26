-- 動態牆：回傳發言者區域（供聊天室顯示 區域 · 分會 · 姓名）

CREATE OR REPLACE FUNCTION bni_get_feed(p_limit int DEFAULT 50, p_before timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC)
    FROM (
      SELECT
        f.id, f.feed_type, f.content, f.meta, f.created_at,
        m.name AS actor_name,
        m.branch AS actor_branch,
        m.region AS actor_region
      FROM bni_feed f
      LEFT JOIN bni_members m ON m.id = f.actor_member_id
      WHERE p_before IS NULL OR f.created_at < p_before
      ORDER BY f.created_at DESC
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
    ) x
  ), '[]'::jsonb);
END; $$;
