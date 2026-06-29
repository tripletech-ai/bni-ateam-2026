import { chromium, devices } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../.ui-check');
mkdirSync(outDir, { recursive: true });

const URL = process.env.SITE_URL || 'https://bni-ateam-2026.netlify.app/';
const iPhone = devices['iPhone 13'];

const checks = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...iPhone,
  locale: 'zh-TW',
});
const page = await context.newPage();

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);

  const title = await page.title();
  record('頁面標題', title.includes('BNI A Team'), title);

  const texts = [
    'A Team 商務連結行動',
    '說你想找誰，AI 幫你媒合',
    '系統已關閉',
    '重要公告',
    '麻煩會員夥伴請勿利用此系統',
    '提早關閉系統',
    '請大家一起維護 BNI 的友好商務環境',
    '感謝 6/27 BNI 台灣年會',
    '平台累計成果',
    '聯繫開發者',
  ];

  for (const t of texts) {
    const visible = await page.getByText(t, { exact: false }).first().isVisible().catch(() => false);
    record(`文案：${t.slice(0, 20)}…`, visible, visible ? '可見' : '未找到');
  }

  const tabBar = await page.locator('#tab-bar').isVisible().catch(() => false);
  record('底部 Tab 已隱藏', !tabBar, tabBar ? '仍顯示' : '已隱藏');

  const userBar = await page.locator('#user-bar:not(.hidden)').isVisible().catch(() => false);
  record('UserBar 已隱藏', !userBar, userBar ? '仍顯示' : '已隱藏');

  const shutdown = page.locator('.event-closed-shutdown').first();
  if (await shutdown.isVisible().catch(() => false)) {
    const box = await shutdown.boundingBox();
    record('公告區塊在首屏', box && box.y < 500, box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : '無 box');
  } else {
    record('公告區塊存在', false, '.event-closed-shutdown 不可見');
  }

  const loading = await page.getByText('載入中…').isVisible().catch(() => false);
  record('非卡在載入中', !loading, loading ? '仍顯示載入中' : '已載入完成');

  const stats = await page.locator('.event-closed-stat-num').count();
  record('成果數字卡片', stats >= 4, `${stats} 格`);

  const lineBtn = page.locator('a.event-closed-contact-btn').first();
  if (await lineBtn.isVisible().catch(() => false)) {
    const href = await lineBtn.getAttribute('href');
    record('聯繫開發者按鈕可點', href?.includes('line.me'), href || '');
    const btnBox = await lineBtn.boundingBox();
    record('聯繫開發者按鈕夠大', btnBox && btnBox.height >= 40, btnBox ? `h=${Math.round(btnBox.height)}` : '');
  }

  await page.screenshot({ path: join(outDir, 'closed-mobile-top.png'), fullPage: false });
  await page.screenshot({ path: join(outDir, 'closed-mobile-full.png'), fullPage: true });

  const a11y = await page.locator('h1, h2').allTextContents();
  record('標題層級', a11y.length >= 2, a11y.join(' | '));
} catch (e) {
  record('頁面載入', false, e.message);
  await page.screenshot({ path: join(outDir, 'closed-error.png'), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

const report = {
  url: URL,
  at: new Date().toISOString(),
  passed: checks.filter(c => c.ok).length,
  total: checks.length,
  checks,
};

writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

process.exit(checks.every(c => c.ok) ? 0 : 1);
