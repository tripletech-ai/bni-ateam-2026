const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

async function sql(query) {
  const res = await fetch(`${API_BASE_URL}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params: [] }),
  });
  return res.json();
}

const rpc = await sql(`SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND proname='bni_claim_by_name_branch'`);
console.log('rpc:', rpc.rows?.[0]?.proname || 'missing');

const match = await sql(`SELECT name, branch, status, auth_user_id IS NOT NULL AS claimed FROM bni_members WHERE active=true AND bni_normalize_claim_name(name)=bni_normalize_claim_name('陳沛緹') AND bni_normalize_claim_branch(branch)=bni_normalize_claim_branch('長悅') LIMIT 3`);
console.log('match 陳沛緹+長悅:', match.rows);

const match2 = await sql(`SELECT count(*)::int AS n FROM bni_members WHERE active=true AND status='roster'`);
console.log('roster count:', match2.rows?.[0]?.n);
