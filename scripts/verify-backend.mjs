import { readFileSync } from 'node:fs';

const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

async function runSql(query) {
  const res = await fetch(`${API_BASE_URL}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params: [] }),
  });
  const body = await res.json().catch(async () => ({ raw: await res.text() }));
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

const q = `
SELECT proname,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%interval ''10 seconds''%' THEN '10s'
    WHEN pg_get_functiondef(p.oid) LIKE '%interval ''60 seconds''%' THEN '60s'
    ELSE 'other'
  END AS feed_rate,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%duplicate%' OR pg_get_functiondef(p.oid) LIKE '%複製%' THEN 'duplicate_ok'
    WHEN pg_get_functiondef(p.oid) LIKE '%ALREADY_CLAIMED%' OR pg_get_functiondef(p.oid) LIKE '%ALREADY_BOUND%member%' THEN 'check_body'
    ELSE 'unknown'
  END AS bind_hint
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('bni_post_feed_message','bni_bind_existing_member','bni_self_unbind')
ORDER BY proname;
`;

console.log(JSON.stringify(await runSql(q), null, 2));
