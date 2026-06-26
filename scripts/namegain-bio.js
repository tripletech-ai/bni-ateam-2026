/**
 * 從 NameGain 名片頁 HTML 解析自我介紹全文（og:description 內含 HTML）
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

export function extractMetaContent(html, prop) {
  const re1 = new RegExp(`property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i');
  const re3 = new RegExp(`name=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const re4 = new RegExp(`content=["']([^"']+)["'][^>]*name=["']${prop}["']`, 'i');
  return decodeEntities(html.match(re1)?.[1] || html.match(re2)?.[1] || html.match(re3)?.[1] || html.match(re4)?.[1] || '');
}

/** @deprecated use extractMetaContent */
export function extractOgContent(html, prop) {
  return extractMetaContent(html, prop);
}

/** HTML 片段 → 可讀純文字（保留段落換行） */
export function htmlToPlainText(html) {
  if (!html) return '';
  let s = html;
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  s = s.replace(/<\/li>\s*/gi, '\n');
  s = s.replace(/<li[^>]*>/gi, '• ');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/<\/?[^>\s]*>?/g, '');
  s = decodeEntities(s);
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

export function parseBioFromCardHtml(html) {
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

export async function fetchBioFromCardUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BNI-A-Team/1.0)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const bio = parseBioFromCardHtml(html);
  if (!bio) throw new Error('No bio found on card');
  return bio;
}
