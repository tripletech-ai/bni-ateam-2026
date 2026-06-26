/**
 * 依 cardLinks.js 將電子名片 URL 寫入 bni_members.card_link（以姓名比對）
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rawSql } from './insforge-admin-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadCardLinks() {
  const js = readFileSync(join(__dirname, '../src/data/cardLinks.js'), 'utf8');
  const m = js.match(/const E = \{([\s\S]*?)\};/);
  if (!m) throw new Error('cardLinks E block not found');
  const links = {};
  const re = /['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = re.exec(m[1])) !== null) {
    links[match[1]] = `https://namegain.introvista.ai/card/${match[2]}`;
  }
  return links;
}

function cjkName(s) {
  return String(s || '').replace(/[^㐀-鿿]/g, '');
}

async function main() {
  if (!process.env.BNI_API_KEY) {
    console.error('Set BNI_API_KEY');
    process.exit(1);
  }
  const links = loadCardLinks();
  const { rows } = await rawSql('SELECT id, name, card_link FROM bni_members WHERE active = true');
  let updated = 0;
  for (const row of rows || []) {
    const name = cjkName(row.name);
    const url = links[name];
    if (!url || row.card_link === url) continue;
    const esc = url.replace(/'/g, "''");
    await rawSql(`UPDATE bni_members SET card_link = '${esc}', updated_at = now() WHERE id = '${row.id}'`);
    updated++;
  }
  console.log(`Updated card_link for ${updated} members (${Object.keys(links).length} links in map).`);
}

main().catch(e => { console.error(e); process.exit(1); });
