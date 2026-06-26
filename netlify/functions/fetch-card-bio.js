/**
 * 從 NameGain 電子名片頁抓取自我介紹全文（og:description 內含 HTML）
 */

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractMetaContent(html, prop) {
  const re1 = new RegExp(`property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i');
  const re3 = new RegExp(`name=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const re4 = new RegExp(`content=["']([^"']+)["'][^>]*name=["']${prop}["']`, 'i');
  return decodeEntities(html.match(re1)?.[1] || html.match(re2)?.[1] || html.match(re3)?.[1] || html.match(re4)?.[1] || '');
}

function htmlToPlainText(html) {
  if (!html) return '';
  let s = html;
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  s = s.replace(/<\/li>\s*/gi, '\n');
  s = s.replace(/<li[^>]*>/gi, '• ');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/<\/?[^>\s]*>?/g, '');
  s = decodeEntities(s);
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function parseBioFromCardHtml(html) {
  const candidates = [
    extractMetaContent(html, 'og:description'),
    extractMetaContent(html, 'description'),
    extractMetaContent(html, 'twitter:description'),
  ].map(htmlToPlainText).filter(Boolean);

  const ogTitle = extractMetaContent(html, 'og:title');
  let bio = candidates.sort((a, b) => b.length - a.length)[0] || '';
  if (!bio || bio.length < 8) return '';
  if (ogTitle && bio.startsWith(ogTitle)) {
    bio = bio.slice(ogTitle.length).replace(/^\s*\n+/, '').trim();
  }
  return bio.substring(0, 4000);
}

export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  let url;
  try {
    url = (await req.json())?.url;
  } catch {
    return Response.json({ ok: false, message: 'Invalid JSON' }, { status: 400, headers: cors });
  }
  if (!url || typeof url !== 'string' || !url.startsWith('https://namegain.introvista.ai/')) {
    return Response.json({ ok: false, message: 'Invalid card URL' }, { status: 400, headers: cors });
  }

  try {
    const res = await fetch(url.trim().substring(0, 500), {
      headers: { 'User-Agent': 'BNI-A-Team-Bot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bio = parseBioFromCardHtml(await res.text());
    if (!bio) return Response.json({ ok: false, message: 'No bio found on card' }, { headers: cors });
    return Response.json({ ok: true, bio }, { headers: cors });
  } catch (err) {
    return Response.json({ ok: false, message: err.message || 'Fetch failed' }, { status: 502, headers: cors });
  }
};

export const config = { path: '/api/fetch-card-bio' };
