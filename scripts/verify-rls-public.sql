SELECT count(*) AS public_count FROM jsonb_array_elements(
  bni_get_public_members(false)
) x
WHERE (x->>'name') IN ('李孟一', '孫成育', '王祈')
  AND (x->>'branch') = '長輝分會';

SELECT jsonb_array_length(bni_get_public_members(false)) AS total_public;

-- 公開 RPC 不應含 google_email
SELECT bool_or(x ? 'google_email') AS has_private_email
FROM jsonb_array_elements(bni_get_public_members(false)) x;
