import { fetchBioFromCardUrl } from './namegain-bio.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(join(__dirname, '../src/data/cardLinks.js'), 'utf8');
const names = ['陳子雯', '張文婷', '劉邵桓', '方榮久', '李鴻毅', '陳沛緹', '鄧子翼', '張巧瑜', '蘇泰勝', '謝東廷'];

for (const n of names) {
  const m = js.match(new RegExp(`'${n}'\\s*:\\s*'([^']+)'`));
  if (!m) { console.log('---', n, 'NO LINK'); continue; }
  const url = `https://namegain.introvista.ai/card/${m[1]}`;
  try {
    const bio = await fetchBioFromCardUrl(url);
    console.log(`\n=== ${n} (${bio.length} 字) ===`);
    console.log(bio.slice(0, 280) + (bio.length > 280 ? '…' : ''));
  } catch (e) {
    console.log(`\n=== ${n} FAIL: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 350));
}
