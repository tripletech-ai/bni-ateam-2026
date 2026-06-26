-- 連結王排行榜、現場動態牆、群組廣播

ALTER TABLE bni_members ADD COLUMN IF NOT EXISTS last_presence_at timestamptz;

CREATE TABLE IF NOT EXISTS bni_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_member_id uuid REFERENCES bni_members(id) ON DELETE SET NULL,
  feed_type text NOT NULL CHECK (feed_type IN ('message', 'mutual', 'login', 'system')),
  content text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bni_feed_created_idx ON bni_feed (created_at DESC);

CREATE TABLE IF NOT EXISTS bni_feed_rate (
  member_id uuid PRIMARY KEY REFERENCES bni_members(id) ON DELETE CASCADE,
  last_message_at timestamptz
);

ALTER TABLE bni_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE bni_feed_rate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bni_feed_no_direct ON bni_feed;
CREATE POLICY bni_feed_no_direct ON bni_feed FOR ALL USING (false);

DROP POLICY IF EXISTS bni_feed_rate_no_direct ON bni_feed_rate;
CREATE POLICY bni_feed_rate_no_direct ON bni_feed_rate FOR ALL USING (false);

CREATE OR REPLACE FUNCTION bni_insert_feed(
  p_actor_id uuid,
  p_type text,
  p_content text,
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO bni_feed (actor_member_id, feed_type, content, meta)
    VALUES (p_actor_id, p_type, left(trim(COALESCE(p_content, '')), 500), COALESCE(p_meta, '{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION bni_get_leaderboard(p_limit int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.rank)
    FROM (
      SELECT
        row_number() OVER (ORDER BY sub.mutual_count DESC, sub.name) AS rank,
        sub.member_id, sub.name, sub.branch, sub.profession, sub.mutual_count AS score
      FROM (
        SELECT
          m.id AS member_id,
          m.name,
          m.branch,
          m.profession,
          (
            SELECT COUNT(DISTINCT cm.to_member_id)::int
            FROM bni_connection_marks cm
            WHERE cm.from_member_id = m.id
              AND cm.mark_type = 'one'
              AND EXISTS (
                SELECT 1 FROM bni_connection_marks cm2
                WHERE cm2.from_member_id = cm.to_member_id
                  AND cm2.to_member_id = m.id
                  AND cm2.mark_type = 'one'
              )
          ) AS mutual_count
        FROM bni_members m
        WHERE m.active = true AND m.auth_user_id IS NOT NULL
      ) sub
      WHERE sub.mutual_count > 0
      ORDER BY sub.mutual_count DESC, sub.name
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 50))
    ) x
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION bni_get_my_mutual_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_mutual int;
  v_pending int;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('mutual_count', 0, 'pending_count', 0); END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('mutual_count', 0, 'pending_count', 0); END IF;

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

  RETURN jsonb_build_object('mutual_count', COALESCE(v_mutual, 0), 'pending_count', COALESCE(v_pending, 0));
END; $$;

CREATE OR REPLACE FUNCTION bni_get_feed(p_limit int DEFAULT 50, p_before timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC)
    FROM (
      SELECT
        f.id, f.feed_type, f.content, f.meta, f.created_at,
        m.name AS actor_name, m.branch AS actor_branch, m.region AS actor_region
      FROM bni_feed f
      LEFT JOIN bni_members m ON m.id = f.actor_member_id
      WHERE p_before IS NULL OR f.created_at < p_before
      ORDER BY f.created_at DESC
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
    ) x
  ), '[]'::jsonb);
END; $$;

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

CREATE OR REPLACE FUNCTION bni_record_presence()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_name text;
  v_branch text;
  v_last timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT id, name, branch, last_presence_at
    INTO v_my_id, v_name, v_branch, v_last
  FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;

  UPDATE bni_members SET last_presence_at = now() WHERE id = v_my_id;

  IF v_last IS NULL OR v_last < now() - interval '30 minutes' THEN
    PERFORM bni_insert_feed(v_my_id, 'login', v_name || ' 剛加入現場連結', jsonb_build_object('branch', v_branch));
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION bni_record_connection_mark(p_to_member_id uuid, p_mark_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from_id uuid;
  v_type text := lower(trim(COALESCE(p_mark_type, '')));
  v_from_name text;
  v_to_name text;
  v_to_branch text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF v_type NOT IN ('one', 'biz') THEN RAISE EXCEPTION 'INVALID_MARK_TYPE'; END IF;
  SELECT id, name INTO v_from_id, v_from_name
    FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_from_id IS NULL THEN RAISE EXCEPTION 'NOT_BOUND'; END IF;
  IF p_to_member_id IS NULL OR p_to_member_id = v_from_id THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bni_members WHERE id = p_to_member_id AND active = true) THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;

  SELECT name, branch INTO v_to_name, v_to_branch FROM bni_members WHERE id = p_to_member_id;

  INSERT INTO bni_connection_marks (from_member_id, to_member_id, mark_type, seen_by_target)
    VALUES (v_from_id, p_to_member_id, v_type, false)
    ON CONFLICT (from_member_id, to_member_id, mark_type)
    DO UPDATE SET seen_by_target = false, created_at = now();

  IF v_type = 'one' AND EXISTS (
    SELECT 1 FROM bni_connection_marks
    WHERE from_member_id = p_to_member_id AND to_member_id = v_from_id AND mark_type = 'one'
  ) THEN
    PERFORM bni_insert_feed(
      v_from_id, 'mutual',
      v_from_name || ' 與 ' || v_to_name || ' 互相連結了！',
      jsonb_build_object('partner_id', p_to_member_id, 'partner_name', v_to_name, 'partner_branch', v_to_branch)
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

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

GRANT EXECUTE ON FUNCTION bni_get_leaderboard(int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bni_get_my_mutual_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_feed(int, timestamptz) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bni_post_feed_message(text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_record_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_delete_feed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_admin_set_member_active(uuid, boolean) TO authenticated;
