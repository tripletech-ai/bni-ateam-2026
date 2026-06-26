import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(join(__dirname, '../src/data/cardLinks.js'), 'utf8');
const name = process.argv[2] || '陳子雯';
const m = js.match(new RegExp(`'${name}'\\s*:\\s*'([^']+)'`));
if (!m) { console.log('no link'); process.exit(1); }
const h = await fetch(`https://namegain.introvista.ai/card/${m[1]}`).then(r => r.text());
console.log('html len', h.length);
for (const k of ['__NEXT_DATA__', 'selfIntro', 'introduction', 'personalIntro', 'cardDescription']) {
  console.log(k, h.indexOf(k));
}
// try API endpoints
const id = m[1];
for (const path of [`/api/card/${id}`, `/api/cards/${id}`, `/api/public/card/${id}`, `/api/v1/cards/${id}`]) {
  const u = `https://namegain.introvista.ai${path}`;
  try {
    const r = await fetch(u);
    const t = await r.text();
    console.log('API', path, r.status, t.slice(0, 180));
  } catch (e) { console.log('API fail', path, e.message); }
}

// RSC / flight payloads
const rscIdx = h.indexOf('$Sreact');
console.log('RSC marker', rscIdx);
if (rscIdx >= 0) {
  const chunk = h.slice(rscIdx, rscIdx + 4000);
  const bioIdx = chunk.indexOf('銀行融資');
  console.log('RSC bio idx', bioIdx);
  if (bioIdx >= 0) console.log(chunk.slice(bioIdx - 50, bioIdx + 600));
}
