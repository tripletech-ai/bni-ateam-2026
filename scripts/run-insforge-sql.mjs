#!/usr/bin/env node
/** Run SQL file(s) against InsForge via admin API (same as MCP run-raw-sql). */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_BASE_URL = process.env.API_BASE_URL || process.env.BNI_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.BNI_API_KEY;

if (!API_BASE_URL || !API_KEY) {
  console.error('Set API_BASE_URL and API_KEY (or BNI_* variants).');
  process.exit(1);
}

async function runSql(query, label = 'query') {
  const res = await fetch(`${API_BASE_URL}/api/database/advance/rawsql`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, params: [] }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === 'object' ? JSON.stringify(body, null, 2) : body;
    throw new Error(`${label} failed (${res.status}): ${msg}`);
  }
  return body;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/run-insforge-sql.mjs <file.sql> [...]');
  process.exit(1);
}

for (const file of files) {
  const path = resolve(file);
  const query = readFileSync(path, 'utf8');
  console.log(`\n=== ${file} ===`);
  const result = await runSql(query, file);
  console.log(JSON.stringify(result, null, 2));
}
