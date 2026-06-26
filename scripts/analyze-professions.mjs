import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(join(__dirname, '../src/data/members.js'), 'utf8');
const sandbox = { window: {} };
new Function('window', js + '\nreturn window.BNI_MEMBERS;')(sandbox.window);
const members = sandbox.window.BNI_MEMBERS;
console.log(members.map(m => m.profession).sort((a, b) => a.localeCompare(b, 'zh-TW')).join('\n'));
