-- 今晚獨立聊天室（與年會 bni_feed 隔離）
-- Apply: node scripts/run-insforge-sql.mjs scripts/dinner-event-feed.sql

CREATE TABLE IF NOT EXISTS bni_event_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  actor_member_id uuid REFERENCES bni_members(id) ON DELETE SET NULL,
  feed_type text NOT NULL DEFAULT 'message',
  content text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bni_event_feed_event_created_idx
  ON bni_event_feed (event_id, created_at DESC);

ALTER TABLE bni_event_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bni_event_feed_no_direct ON bni_event_feed;
CREATE POLICY bni_event_feed_no_direct ON bni_event_feed FOR ALL USING (false);

CREATE OR REPLACE FUNCTION bni_get_event_feed(
  p_event_id text,
  p_limit integer DEFAULT 50,
  p_before timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text := trim(COALESCE(p_event_id, ''));
BEGIN
  IF v_event = '' THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC)
    FROM (
      SELECT
        f.id, f.feed_type, f.content, f.meta, f.created_at,
        m.name AS actor_name,
        m.branch AS actor_branch,
        m.region AS actor_region
      FROM bni_event_feed f
      LEFT JOIN bni_members m ON m.id = f.actor_member_id
      WHERE f.event_id = v_event
        AND (p_before IS NULL OR f.created_at < p_before)
      ORDER BY f.created_at DESC
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
    ) x
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION bni_post_event_feed_message(
  p_event_id text,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_event text := trim(COALESCE(p_event_id, ''));
  v_content text := left(trim(COALESCE(p_content, '')), 500);
  v_last timestamptz;
  v_feed_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF v_event = '' THEN RAISE EXCEPTION 'INVALID_EVENT'; END IF;
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

  INSERT INTO bni_event_feed (event_id, actor_member_id, feed_type, content)
    VALUES (v_event, v_my_id, 'message', v_content)
    RETURNING id INTO v_feed_id;

  RETURN jsonb_build_object('ok', true, 'id', v_feed_id, 'event_id', v_event);
END;
$$;

GRANT EXECUTE ON FUNCTION bni_get_event_feed(text, integer, timestamptz) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bni_post_event_feed_message(text, text) TO authenticated;
