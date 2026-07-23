-- 晚宴可媒合名單（與年會公開名單隔離）
-- 年會 bni_get_public_members 不動；今晚只走 bni_get_event_public_members
-- Apply: node scripts/run-insforge-sql.mjs scripts/dinner-event-roster.sql

CREATE TABLE IF NOT EXISTS bni_event_attendees (
  event_id text NOT NULL,
  member_id uuid NOT NULL REFERENCES bni_members(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'guest', 'officer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS bni_event_attendees_member_idx
  ON bni_event_attendees (member_id);

ALTER TABLE bni_event_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bni_event_attendees_no_direct ON bni_event_attendees;
CREATE POLICY bni_event_attendees_no_direct
  ON bni_event_attendees FOR ALL USING (false);

CREATE OR REPLACE FUNCTION bni_get_event_public_members(p_event_id text)
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
    SELECT jsonb_agg(row_to_json(m)::jsonb ORDER BY m.role_rank, m.name)
    FROM (
      SELECT
        bm.id,
        bm.roster_id,
        bm.name,
        bm.branch,
        bm.region,
        bm.profession,
        bm.have,
        bm.want_meet,
        bm.want_referral,
        bm.line_id,
        bm.line_link,
        bm.bio,
        bm.card_link,
        bm.tags,
        bm.industries,
        bm.status,
        bm.active,
        (bm.auth_user_id IS NOT NULL) AS claimed,
        a.role AS event_role,
        CASE a.role
          WHEN 'officer' THEN 0
          WHEN 'member' THEN 1
          ELSE 2
        END AS role_rank
      FROM bni_event_attendees a
      JOIN bni_members bm ON bm.id = a.member_id
      WHERE a.event_id = v_event
        AND bm.active = true
    ) m
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION bni_get_event_public_members(text) TO authenticated, anon;
