-- 還原「我標記的夥伴」：換裝置／重整理後從 DB 拉回 localStorage，連結榜累積不消失
-- node scripts/run-insforge-sql.mjs scripts/patch-my-outgoing-marks.sql

CREATE OR REPLACE FUNCTION bni_get_my_outgoing_marks()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_user_id uuid := auth.uid(); v_my_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC)
    FROM (
      SELECT
        cm.mark_type,
        cm.created_at,
        m.id AS to_id,
        m.name,
        m.branch,
        m.profession,
        m.line_id,
        m.line_link,
        m.have,
        m.want_meet
      FROM bni_connection_marks cm
      JOIN bni_members m ON m.id = cm.to_member_id
      WHERE cm.from_member_id = v_my_id
      ORDER BY cm.created_at DESC
    ) x
  ), '[]'::jsonb);
END; $$;

GRANT EXECUTE ON FUNCTION bni_get_my_outgoing_marks() TO authenticated;
