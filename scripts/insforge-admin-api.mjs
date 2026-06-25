/** BNI standalone InsForge — NOT shared with UIC / other projects. */
export const BNI_API_BASE = process.env.BNI_API_BASE || 'https://a-team9204.zeabur.app';
export const BNI_API_KEY = process.env.BNI_API_KEY || '';

export async function adminApi(path, options = {}) {
  const res = await fetch(`${BNI_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BNI_API_KEY}`,
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export async function rawSql(query, params = []) {
  return adminApi('/api/database/advance/rawsql', {
    method: 'POST',
    body: JSON.stringify({ query, params }),
  });
}
