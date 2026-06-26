/** 試抓 NameGain 名片自我介紹 — 開發用 */
const samples = [
  ['陳子雯', 'https://namegain.introvista.ai/card/teresa-chen'],
  ['張文婷', 'https://namegain.introvista.ai/card/11d5c9f4-73a6-4af0-850f-988c57e0d446'],
  ['劉邵桓', 'https://namegain.introvista.ai/card/a146b3b4-e394-4ee7-aa82-423d3fa20f07?ref=829ce6d40e88'],
  ['方榮久', 'https://namegain.introvista.ai/card/fcf8d38e-041f-4509-b428-cbc9246dd39e?ref=bb33eb828306'],
  ['李鴻毅', 'https://namegain.introvista.ai/card/98a8f050-a8a6-4bb2-88de-d25d052a8288?ref=e7933ce071ac'],
  ['陳沛緹', 'https://namegain.introvista.ai/card/6b095d74-f86c-4c27-8299-c4794210b3e6?ref=94f65f68e4db'],
];

function decode(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, '\n');
}

function extractOg(html, prop) {
  const re1 = new RegExp(`property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i');
  return decode(html.match(re1)?.[1] || html.match(re2)?.[1] || '');
}

function extractFromNextData(html) {
  const raw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const str = JSON.stringify(data);
    const fields = ['bio', 'introduction', 'about', 'description', 'selfIntro', 'profile', 'summary'];
    for (const f of fields) {
      const re = new RegExp(`"${f}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'g');
      let m;
      while ((m = re.exec(str))) {
        const val = decode(JSON.parse(`"${m[1]}"`));
        if (val.length >= 15) return { field: f, text: val };
      }
    }
    return { field: 'nextData', text: str.slice(0, 400) };
  } catch {
    return null;
  }
}

for (const [name, url] of samples) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BNI-A-Team/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const ogTitle = extractOg(html, 'og:title');
    const ogDesc = extractOg(html, 'og:description');
    const next = extractFromNextData(html);
    console.log('\n===', name, '|', res.status, '| html', html.length);
    console.log('og:title:', ogTitle.slice(0, 100));
    console.log('og:desc :', ogDesc.slice(0, 300));
    if (next) console.log('next    :', next.field, '→', next.text.slice(0, 300));
  } catch (e) {
    console.log('\n===', name, 'ERR', e.message);
  }
}
