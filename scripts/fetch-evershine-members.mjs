/**
 * Fetch Changhui (evershine.tw) members from public Supabase API.
 * Writes scripts/_evershine-members.json and scripts/_evershine-clean.json
 *
 * Run: node scripts/fetch-evershine-members.mjs
 */
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://bapwzqmlvwwmnucjimsn.supabase.co/rest/v1/members';
const ANON = process.env.EVERSHINE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhcHd6cW1sdnd3bW51Y2ppbXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTY3NzgsImV4cCI6MjA4MTQ3Mjc3OH0.lGgudUHGUb14wt-N_fyLSgaML9-DPG4qeHJ5npsRUDQ';

const res = await fetch(
  `${BASE}?select=*&or=(status.is.null,status.eq.active)&order=id.asc`,
  {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
  },
);
if (!res.ok) throw new Error(`evershine fetch ${res.status}: ${await res.text()}`);
const rows = await res.json();
if (!Array.isArray(rows)) throw new Error('unexpected evershine payload');

const clean = rows.map(m => ({
  id: m.id,
  name: m.name || '',
  company: m.company || m.Company || '',
  Company: m.Company || m.company || '',
  position: m.position || '',
  industry: m.industry || '',
  category: m.category || '',
  shortIntro: m.shortIntro || '',
  fullIntro: m.fullIntro || '',
  photo: m.photo || '',
  photoPosition: m.photoPosition || '',
  services: Array.isArray(m.services) ? m.services : [],
  hashtags: m.hashtags || [],
  links: m.links || null,
  phone: m.phone || '',
  email: m.email || '',
  status: m.status || 'active',
  membership_type: m.membership_type || '',
  has_gold_medal: !!m.has_gold_medal,
  updatedAt: m.updatedAt || m.updated_at || null,
}));

fs.writeFileSync(join(__dirname, '_evershine-members.json'), JSON.stringify(rows, null, 2), 'utf8');
fs.writeFileSync(join(__dirname, '_evershine-clean.json'), JSON.stringify(clean, null, 2), 'utf8');
console.log(`fetched ${rows.length} evershine members → _evershine-clean.json`);
