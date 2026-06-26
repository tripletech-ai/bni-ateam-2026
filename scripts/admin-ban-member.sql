-- 管理員停用／啟用會員帳號（ban / unban）

CREATE OR REPLACE FUNCTION bni_admin_set_member_active(p_member_id uuid, p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row bni_members%ROWTYPE;
BEGIN
  IF NOT bni_is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF p_member_id IS NULL THEN RAISE EXCEPTION 'INVALID_ID'; END IF;

  UPDATE bni_members
    SET active = COALESCE(p_active, false), updated_at = now()
    WHERE id = p_member_id
    RETURNING * INTO v_row;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'name', v_row.name,
    'active', v_row.active
  );
END; $$;

GRANT EXECUTE ON FUNCTION bni_admin_set_member_active(uuid, boolean) TO authenticated;
