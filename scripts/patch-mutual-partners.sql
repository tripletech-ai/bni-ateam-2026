-- 互相連結清單：供前端即時顯示「Connected ✓」
-- node scripts/run-insforge-sql.mjs scripts/patch-mutual-partners.sql

CREATE OR REPLACE FUNCTION bni_get_my_mutual_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_mutual int;
  v_pending int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('mutual_count', 0, 'pending_count', 0, 'mutual_partners', '[]'::jsonb);
  END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN
    RETURN jsonb_build_object('mutual_count', 0, 'pending_count', 0, 'mutual_partners', '[]'::jsonb);
  END IF;

  SELECT COUNT(DISTINCT cm.to_member_id)::int INTO v_mutual
  FROM bni_connection_marks cm
  WHERE cm.from_member_id = v_my_id AND cm.mark_type = 'one'
    AND EXISTS (
      SELECT 1 FROM bni_connection_marks cm2
      WHERE cm2.from_member_id = cm.to_member_id
        AND cm2.to_member_id = v_my_id
        AND cm2.mark_type = 'one'
    );

  SELECT COUNT(DISTINCT cm.to_member_id)::int INTO v_pending
  FROM bni_connection_marks cm
  WHERE cm.from_member_id = v_my_id AND cm.mark_type = 'one'
    AND NOT EXISTS (
      SELECT 1 FROM bni_connection_marks cm2
      WHERE cm2.from_member_id = cm.to_member_id
        AND cm2.to_member_id = v_my_id
        AND cm2.mark_type = 'one'
    );

  RETURN jsonb_build_object(
    'mutual_count', COALESCE(v_mutual, 0),
    'pending_count', COALESCE(v_pending, 0),
    'mutual_partners', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'branch', m.branch,
        'profession', m.profession
      ) ORDER BY m.name)
      FROM bni_connection_marks cm
      JOIN bni_members m ON m.id = cm.to_member_id
      WHERE cm.from_member_id = v_my_id
        AND cm.mark_type = 'one'
        AND EXISTS (
          SELECT 1 FROM bni_connection_marks cm2
          WHERE cm2.from_member_id = cm.to_member_id
            AND cm2.to_member_id = v_my_id
            AND cm2.mark_type = 'one'
        )
    ), '[]'::jsonb)
  );
END; $$;

GRANT EXECUTE ON FUNCTION bni_get_my_mutual_stats() TO authenticated;
