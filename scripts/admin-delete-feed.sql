-- 管理員刪除動態牆訊息（任意 feed_type）

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

GRANT EXECUTE ON FUNCTION bni_admin_delete_feed(uuid) TO authenticated;
