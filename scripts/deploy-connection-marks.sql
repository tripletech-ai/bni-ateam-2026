-- 1-1 標記表 + RPC（不覆寫 profile / get_my_status）
-- node scripts/run-insforge-sql.mjs scripts/deploy-connection-marks.sql

CREATE TABLE IF NOT EXISTS bni_connection_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id uuid NOT NULL REFERENCES bni_members(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES bni_members(id) ON DELETE CASCADE,
  mark_type text NOT NULL CHECK (mark_type IN ('one', 'biz')),
  seen_by_target boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_member_id, to_member_id, mark_type)
);

CREATE INDEX IF NOT EXISTS bni_connection_marks_to_idx
  ON bni_connection_marks (to_member_id, mark_type, seen_by_target);

ALTER TABLE bni_connection_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bni_connection_marks_no_direct ON bni_connection_marks;
CREATE POLICY bni_connection_marks_no_direct ON bni_connection_marks FOR ALL USING (false);

CREATE OR REPLACE FUNCTION bni_record_connection_mark(p_to_member_id uuid, p_mark_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from_id uuid;
  v_type text := lower(trim(COALESCE(p_mark_type, '')));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF v_type NOT IN ('one', 'biz') THEN RAISE EXCEPTION 'INVALID_MARK_TYPE'; END IF;
  SELECT id INTO v_from_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_from_id IS NULL THEN RAISE EXCEPTION 'NOT_BOUND'; END IF;
  IF p_to_member_id IS NULL OR p_to_member_id = v_from_id THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bni_members WHERE id = p_to_member_id AND active = true) THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;
  INSERT INTO bni_connection_marks (from_member_id, to_member_id, mark_type, seen_by_target)
    VALUES (v_from_id, p_to_member_id, v_type, false)
    ON CONFLICT (from_member_id, to_member_id, mark_type)
    DO UPDATE SET seen_by_target = false, created_at = now();
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION bni_remove_connection_mark(p_to_member_id uuid, p_mark_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from_id uuid;
  v_type text := lower(trim(COALESCE(p_mark_type, '')));
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  SELECT id INTO v_from_id FROM bni_members WHERE auth_user_id = v_user_id LIMIT 1;
  IF v_from_id IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  DELETE FROM bni_connection_marks
    WHERE from_member_id = v_from_id AND to_member_id = p_to_member_id AND mark_type = v_type;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION bni_get_incoming_marks(p_unseen_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_user_id uuid := auth.uid(); v_my_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC)
    FROM (
      SELECT cm.id, cm.mark_type, cm.created_at, cm.seen_by_target,
             m.id AS from_id, m.name, m.branch, m.profession
      FROM bni_connection_marks cm
      JOIN bni_members m ON m.id = cm.from_member_id
      WHERE cm.to_member_id = v_my_id
        AND cm.mark_type = 'one'
        AND (NOT p_unseen_only OR NOT cm.seen_by_target)
      ORDER BY cm.created_at DESC
      LIMIT 30
    ) x
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION bni_ack_incoming_marks(p_mark_ids uuid[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid(); v_my_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id LIMIT 1;
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  IF p_mark_ids IS NULL OR array_length(p_mark_ids, 1) IS NULL THEN
    UPDATE bni_connection_marks SET seen_by_target = true
      WHERE to_member_id = v_my_id AND mark_type = 'one' AND NOT seen_by_target;
  ELSE
    UPDATE bni_connection_marks SET seen_by_target = true
      WHERE to_member_id = v_my_id AND id = ANY(p_mark_ids);
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION bni_record_connection_mark(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_remove_connection_mark(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_incoming_marks(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_ack_incoming_marks(uuid[]) TO authenticated;
