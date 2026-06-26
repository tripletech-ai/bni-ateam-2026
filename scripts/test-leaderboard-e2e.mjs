/**
 * 動態牆排行榜 E2E（本機靜態站 + 真實 InsForge API）
 * node scripts/test-leaderboard-e2e.mjs
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 9876;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function serveFile(res, filePath) {
  try {
    const st = await stat(filePath);
    if (!st.isFile()) throw new Error('not file');
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function startServer() {
  return new Promise(resolve => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      let rel = decodeURIComponent(url.pathname);
      if (rel === '/') rel = '/index.html';
      const filePath = path.join(ROOT, rel.replace(/^\//, '').replace(/\.\./g, ''));
      await serveFile(res, filePath);
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const server = await startServer();
  const base = `http://127.0.0.1:${PORT}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.addInitScript(() => {
    sessionStorage.setItem('bni_guest_trial', '1');
    sessionStorage.setItem('bni_guest_intro_shown', '1');
  });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    await page.goto(`${base}/#live`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.live-page', { timeout: 30000 });
    await page.waitForTimeout(3000);

    const lbPanel = page.locator('.live-panel-leaderboard:not(.hidden)');
    await lbPanel.waitFor({ state: 'visible', timeout: 10000 });

    const modeTabs = page.locator('.lb-mode-tab');
    const modeCount = await modeTabs.count();
    if (modeCount < 2) throw new Error('應顯示連結王 / 被標記王 兩個模式分頁');

    const mutualRows = page.locator('.live-panel-leaderboard .lb-row');
    const mutualCount = await mutualRows.count();
    const hasEmpty = await page.locator('.live-panel-leaderboard .leaderboard-empty').count();

    if (mutualCount === 0 && hasEmpty === 0) {
      throw new Error('排行榜區塊既無資料列也無空狀態');
    }

    if (mutualCount > 0) {
      const firstName = await mutualRows.first().locator('.lb-name').textContent();
      const firstScore = await mutualRows.first().locator('.lb-score').textContent();
      console.log(`✓ 連結王 UI：${mutualCount} 筆，榜首 ${firstName?.trim()} — ${firstScore?.trim()}`);
    } else {
      console.log('✓ 連結王 UI：空狀態（尚無互相連結）');
    }

    await page.locator('.lb-mode-tab[data-lb-mode="received_one"]').click();
    await page.waitForTimeout(1500);

    const receivedRows = page.locator('.live-panel-leaderboard .lb-row');
    const receivedCount = await receivedRows.count();
    const receivedEmpty = await page.locator('.live-panel-leaderboard .leaderboard-empty').count();

    if (receivedCount === 0 && receivedEmpty === 0) {
      throw new Error('被標記王區塊既無資料列也無空狀態');
    }

    if (receivedCount > 0) {
      const name = await receivedRows.first().locator('.lb-name').textContent();
      console.log(`✓ 被標記王 UI：${receivedCount} 筆，榜首 ${name?.trim()}`);
    } else {
      console.log('✓ 被標記王 UI：空狀態');
    }

    const critical = consoleErrors.filter(e =>
      !/favicon|Failed to load resource|net::ERR/.test(e),
    );
    if (critical.length) {
      console.warn('⚠ 主控台錯誤:', critical.slice(0, 3).join(' | '));
    } else {
      console.log('✓ 無嚴重主控台錯誤');
    }

    console.log('\n=== E2E 通過 ===');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error('\n✗ E2E 失敗:', err.message);
  process.exit(1);
});
