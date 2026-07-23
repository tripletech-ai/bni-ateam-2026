-- 長輝晚會獨立排行榜（與年會 bni_connection_marks / bni_get_leaderboard 完全分離）
-- 年會歷史資料不動；今晚分數寫入本表。
-- Apply: node scripts/run-insforge-sql.mjs scripts/dinner-event-leaderboard.sql

CREATE TABLE IF NOT EXISTS bni_event_connection_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  from_member_id uuid NOT NULL REFERENCES bni_members(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES bni_members(id) ON DELETE CASCADE,
  mark_type text NOT NULL CHECK (mark_type IN ('one', 'biz')),
  seen_by_target boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, from_member_id, to_member_id, mark_type)
);

CREATE INDEX IF NOT EXISTS bni_event_connection_marks_event_to_idx
  ON bni_event_connection_marks (event_id, to_member_id, mark_type, seen_by_target);

CREATE INDEX IF NOT EXISTS bni_event_connection_marks_event_from_idx
  ON bni_event_connection_marks (event_id, from_member_id, mark_type);

ALTER TABLE bni_event_connection_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bni_event_connection_marks_no_direct ON bni_event_connection_marks;
CREATE POLICY bni_event_connection_marks_no_direct
  ON bni_event_connection_marks FOR ALL USING (false);

CREATE OR REPLACE FUNCTION bni_record_event_connection_mark(
  p_event_id text,
  p_to_member_id uuid,
  p_mark_type text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from_id uuid;
  v_type text := lower(trim(COALESCE(p_mark_type, '')));
  v_event text := trim(COALESCE(p_event_id, ''));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF v_event = '' OR length(v_event) > 80 THEN RAISE EXCEPTION 'INVALID_EVENT'; END IF;
  IF v_type NOT IN ('one', 'biz') THEN RAISE EXCEPTION 'INVALID_MARK_TYPE'; END IF;
  SELECT id INTO v_from_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_from_id IS NULL THEN RAISE EXCEPTION 'NOT_BOUND'; END IF;
  IF p_to_member_id IS NULL OR p_to_member_id = v_from_id THEN RAISE EXCEPTION 'INVALID_TARGET'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bni_members WHERE id = p_to_member_id AND active = true) THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;
  INSERT INTO bni_event_connection_marks (event_id, from_member_id, to_member_id, mark_type, seen_by_target)
    VALUES (v_event, v_from_id, p_to_member_id, v_type, false)
    ON CONFLICT (event_id, from_member_id, to_member_id, mark_type)
    DO UPDATE SET seen_by_target = false, created_at = now();
  RETURN jsonb_build_object('ok', true, 'event_id', v_event);
END; $$;

CREATE OR REPLACE FUNCTION bni_remove_event_connection_mark(
  p_event_id text,
  p_to_member_id uuid,
  p_mark_type text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_from_id uuid;
  v_type text := lower(trim(COALESCE(p_mark_type, '')));
  v_event text := trim(COALESCE(p_event_id, ''));
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  SELECT id INTO v_from_id FROM bni_members WHERE auth_user_id = v_user_id LIMIT 1;
  IF v_from_id IS NULL OR v_event = '' THEN RETURN jsonb_build_object('ok', true); END IF;
  DELETE FROM bni_event_connection_marks
    WHERE event_id = v_event
      AND from_member_id = v_from_id
      AND to_member_id = p_to_member_id
      AND mark_type = v_type;
  RETURN jsonb_build_object('ok', true, 'event_id', v_event);
END; $$;

CREATE OR REPLACE FUNCTION bni_get_event_leaderboard(
  p_event_id text,
  p_limit int DEFAULT 30,
  p_mode text DEFAULT 'mutual'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_mode text := lower(trim(COALESCE(p_mode, 'mutual')));
  v_event text := trim(COALESCE(p_event_id, ''));
BEGIN
  IF v_event = '' THEN RETURN '[]'::jsonb; END IF;
  IF v_mode NOT IN ('mutual', 'received_one') THEN
    v_mode := 'mutual';
  END IF;

  IF v_mode = 'received_one' THEN
    RETURN COALESCE((
      SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.rank)
      FROM (
        SELECT
          row_number() OVER (ORDER BY sub.marked_count DESC, sub.name) AS rank,
          sub.member_id, sub.name, sub.branch, sub.profession, sub.marked_count AS score
        FROM (
          SELECT
            m.id AS member_id,
            m.name,
            m.branch,
            m.profession,
            (
              SELECT COUNT(DISTINCT cm.from_member_id)::int
              FROM bni_event_connection_marks cm
              WHERE cm.event_id = v_event
                AND cm.to_member_id = m.id
                AND cm.mark_type = 'one'
            ) AS marked_count
          FROM bni_members m
          WHERE m.active = true AND m.auth_user_id IS NOT NULL
        ) sub
        WHERE sub.marked_count > 0
        ORDER BY sub.marked_count DESC, sub.name
        LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 50))
      ) x
    ), '[]'::jsonb);
  END IF;

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
            FROM bni_event_connection_marks cm
            WHERE cm.event_id = v_event
              AND cm.from_member_id = m.id
              AND cm.mark_type = 'one'
              AND EXISTS (
                SELECT 1 FROM bni_event_connection_marks cm2
                WHERE cm2.event_id = v_event
                  AND cm2.from_member_id = cm.to_member_id
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

CREATE OR REPLACE FUNCTION bni_get_event_incoming_marks(
  p_event_id text,
  p_unseen_only boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_event text := trim(COALESCE(p_event_id, ''));
BEGIN
  IF v_user_id IS NULL OR v_event = '' THEN RETURN '[]'::jsonb; END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC)
    FROM (
      SELECT cm.id, cm.mark_type, cm.created_at, cm.seen_by_target,
             m.id AS from_id, m.name, m.branch, m.profession
      FROM bni_event_connection_marks cm
      JOIN bni_members m ON m.id = cm.from_member_id
      WHERE cm.event_id = v_event
        AND cm.to_member_id = v_my_id
        AND cm.mark_type = 'one'
        AND (NOT p_unseen_only OR NOT cm.seen_by_target)
      ORDER BY cm.created_at DESC
      LIMIT 30
    ) x
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION bni_ack_event_incoming_marks(
  p_event_id text,
  p_mark_ids uuid[] DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_event text := trim(COALESCE(p_event_id, ''));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF v_event = '' THEN RETURN jsonb_build_object('ok', true); END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id LIMIT 1;
  IF v_my_id IS NULL THEN RETURN jsonb_build_object('ok', true); END IF;
  IF p_mark_ids IS NULL OR array_length(p_mark_ids, 1) IS NULL THEN
    UPDATE bni_event_connection_marks SET seen_by_target = true
      WHERE event_id = v_event
        AND to_member_id = v_my_id
        AND mark_type = 'one'
        AND NOT seen_by_target;
  ELSE
    UPDATE bni_event_connection_marks SET seen_by_target = true
      WHERE event_id = v_event
        AND to_member_id = v_my_id
        AND id = ANY(p_mark_ids);
  END IF;
  RETURN jsonb_build_object('ok', true, 'event_id', v_event);
END; $$;

CREATE OR REPLACE FUNCTION bni_get_my_event_outgoing_marks(p_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_event text := trim(COALESCE(p_event_id, ''));
BEGIN
  IF v_user_id IS NULL OR v_event = '' THEN RETURN '[]'::jsonb; END IF;
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
      FROM bni_event_connection_marks cm
      JOIN bni_members m ON m.id = cm.to_member_id
      WHERE cm.event_id = v_event
        AND cm.from_member_id = v_my_id
      ORDER BY cm.created_at DESC
    ) x
  ), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION bni_get_my_event_mutual_stats(p_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_my_id uuid;
  v_event text := trim(COALESCE(p_event_id, ''));
  v_mutual int;
  v_pending int;
BEGIN
  IF v_user_id IS NULL OR v_event = '' THEN
    RETURN jsonb_build_object('mutual_count', 0, 'pending_count', 0, 'mutual_partners', '[]'::jsonb);
  END IF;
  SELECT id INTO v_my_id FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF v_my_id IS NULL THEN
    RETURN jsonb_build_object('mutual_count', 0, 'pending_count', 0, 'mutual_partners', '[]'::jsonb);
  END IF;

  SELECT COUNT(DISTINCT cm.to_member_id)::int INTO v_mutual
  FROM bni_event_connection_marks cm
  WHERE cm.event_id = v_event
    AND cm.from_member_id = v_my_id AND cm.mark_type = 'one'
    AND EXISTS (
      SELECT 1 FROM bni_event_connection_marks cm2
      WHERE cm2.event_id = v_event
        AND cm2.from_member_id = cm.to_member_id
        AND cm2.to_member_id = v_my_id
        AND cm2.mark_type = 'one'
    );

  SELECT COUNT(DISTINCT cm.to_member_id)::int INTO v_pending
  FROM bni_event_connection_marks cm
  WHERE cm.event_id = v_event
    AND cm.from_member_id = v_my_id AND cm.mark_type = 'one'
    AND NOT EXISTS (
      SELECT 1 FROM bni_event_connection_marks cm2
      WHERE cm2.event_id = v_event
        AND cm2.from_member_id = cm.to_member_id
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
      FROM bni_event_connection_marks cm
      JOIN bni_members m ON m.id = cm.to_member_id
      WHERE cm.event_id = v_event
        AND cm.from_member_id = v_my_id
        AND cm.mark_type = 'one'
        AND EXISTS (
          SELECT 1 FROM bni_event_connection_marks cm2
          WHERE cm2.event_id = v_event
            AND cm2.from_member_id = cm.to_member_id
            AND cm2.to_member_id = v_my_id
            AND cm2.mark_type = 'one'
        )
    ), '[]'::jsonb)
  );
END; $$;

GRANT EXECUTE ON FUNCTION bni_record_event_connection_mark(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_remove_event_connection_mark(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_event_leaderboard(text, int, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION bni_get_event_incoming_marks(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_ack_event_incoming_marks(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_my_event_outgoing_marks(text) TO authenticated;
GRANT EXECUTE ON FUNCTION bni_get_my_event_mutual_stats(text) TO authenticated;
