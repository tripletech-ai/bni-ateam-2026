/**
 * Helper: prints batch SQL file paths and sizes for MCP run-raw-sql execution.
 * Usage: node run-seed-batches-mcp-helper.mjs <batchNumber>
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const batch = Number(process.argv[2]);
if (!batch || batch < 1 || batch > 4) {
  console.error('Usage: node run-seed-batches-mcp-helper.mjs <1-4>');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, `seed-batch-${batch}.sql`);
const query = readFileSync(path, 'utf8');
process.stdout.write(JSON.stringify({ batch, path, queryLength: query.length, query }));
