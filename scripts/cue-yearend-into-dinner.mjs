/**
 * Cue year-end (or any richer same-name) profile fields into tonight's event attendees.
 * Does NOT delete or alter year-end-only members; only fills emptier dinner-linked rows.
 *
 * $env:BNI_API_KEY="ik_..."; node scripts/cue-yearend-into-dinner.mjs
 */
import { rawSql } from './insforge-admin-api.mjs';
import { CHANGHUI_DINNER_EVENT } from '../src/data/changhuiDinner.js';

const EVENT_ID = CHANGHUI_DINNER_EVENT.id;

const { rows } = await rawSql(`
WITH dinner AS (
  SELECT a.member_id, a.role, m.name AS dinner_name
  FROM bni_event_attendees a
  JOIN bni_members m ON m.id = a.member_id
  WHERE a.event_id = $1 AND a.role = 'member'
),
src AS (
  SELECT
    d.member_id AS dinner_id,
    y.id AS src_id,
    y.profession, y.have, y.want_meet, y.want_referral,
    y.bio, y.line_id, y.line_link, y.card_link, y.tags, y.industries
  FROM dinner d
  JOIN LATERAL (
    SELECT m.*
    FROM bni_members m
    WHERE m.active = true
      AND regexp_replace(regexp_replace(m.name, '\\s+', '', 'g'), '[A-Za-z].*$', '')
        = regexp_replace(regexp_replace(d.dinner_name, '\\s+', '', 'g'), '[A-Za-z].*$', '')
    ORDER BY
      CASE WHEN m.id = d.member_id THEN 1 ELSE 0 END ASC,
      (m.auth_user_id IS NOT NULL) DESC,
      length(coalesce(m.bio,'')) + length(coalesce(m.have,'')) + length(coalesce(m.profession,'')) DESC,
      m.updated_at DESC NULLS LAST
    LIMIT 1
  ) y ON true
  WHERE y.id IS DISTINCT FROM d.member_id
     OR length(coalesce(y.bio,'')) > 0
)
UPDATE bni_members t
SET
  profession = CASE
    WHEN length(coalesce(NULLIF(trim(t.profession), ''), '')) < length(coalesce(NULLIF(trim(s.profession), ''), ''))
    THEN s.profession ELSE t.profession END,
  have = CASE
    WHEN length(coalesce(NULLIF(trim(t.have), ''), '')) < length(coalesce(NULLIF(trim(s.have), ''), ''))
    THEN s.have ELSE t.have END,
  want_meet = CASE
    WHEN length(coalesce(NULLIF(trim(t.want_meet), ''), '')) < length(coalesce(NULLIF(trim(s.want_meet), ''), ''))
    THEN s.want_meet ELSE t.want_meet END,
  want_referral = CASE
    WHEN length(coalesce(NULLIF(trim(t.want_referral), ''), '')) < length(coalesce(NULLIF(trim(s.want_referral), ''), ''))
    THEN s.want_referral ELSE t.want_referral END,
  bio = CASE
    WHEN length(coalesce(NULLIF(trim(t.bio), ''), '')) < length(coalesce(NULLIF(trim(s.bio), ''), ''))
    THEN s.bio ELSE t.bio END,
  line_id = CASE WHEN coalesce(NULLIF(trim(t.line_id), ''), '') = '' THEN s.line_id ELSE t.line_id END,
  line_link = CASE WHEN coalesce(NULLIF(trim(t.line_link), ''), '') = '' THEN s.line_link ELSE t.line_link END,
  card_link = CASE WHEN coalesce(NULLIF(trim(t.card_link), ''), '') = '' THEN s.card_link ELSE t.card_link END,
  tags = CASE WHEN coalesce(t.tags, '[]'::jsonb) = '[]'::jsonb AND s.tags IS NOT NULL THEN s.tags ELSE t.tags END,
  industries = CASE WHEN coalesce(cardinality(t.industries), 0) = 0 AND s.industries IS NOT NULL THEN s.industries ELSE t.industries END,
  updated_at = now()
FROM src s
WHERE t.id = s.dinner_id
RETURNING t.id, t.name, s.src_id;
`, [EVENT_ID]);

console.log(JSON.stringify({
  eventId: EVENT_ID,
  cued: rows?.length || 0,
  sample: (rows || []).slice(0, 12),
}, null, 2));
