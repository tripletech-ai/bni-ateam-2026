-- 聊天室發言限速：60 秒 → 10 秒（在 InsForge SQL 編輯器執行一次）
CREATE OR REPLACE FUNCTION bni_post_feed_message(p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_content text := left(trim(COALESCE(p_content, '')), 500);
  v_last timestamptz;
  v_feed_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF length(v_content) < 1 THEN RAISE EXCEPTION 'EMPTY_MESSAGE'; END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN RAISE EXCEPTION 'NOT_BOUND'; END IF;

  SELECT last_message_at INTO v_last FROM bni_feed_rate WHERE member_id = v_my_id;
  IF v_last IS NOT NULL AND v_last > now() - interval '10 seconds' THEN
    RAISE EXCEPTION 'RATE_LIMIT';
  END IF;

  INSERT INTO bni_feed_rate (member_id, last_message_at)
    VALUES (v_my_id, now())
    ON CONFLICT (member_id) DO UPDATE SET last_message_at = now();

  INSERT INTO bni_feed (actor_member_id, feed_type, content)
    VALUES (v_my_id, 'message', v_content)
    RETURNING id INTO v_feed_id;

  RETURN jsonb_build_object('ok', true, 'id', v_feed_id);
END; $$;

GRANT EXECUTE ON FUNCTION bni_post_feed_message(text) TO authenticated;
