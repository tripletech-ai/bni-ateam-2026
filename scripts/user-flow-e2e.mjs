/**
 * 瀏覽器 E2E — 模擬使用者完整流程（含認領身分）
 *
 *   node scripts/user-flow-e2e.mjs
 *   node scripts/user-flow-e2e.mjs --base http://localhost:3456
 */
import { chromium } from 'playwright';
import { BNI_API_BASE } from './insforge-admin-api.mjs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:3456';

const API = BNI_API_BASE;

let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed++;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failed++;
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function createTestSession() {
  const email = `e2e-${Date.now()}@bni-test.local`;
  const password = 'E2eTestPass123!';
  const res = await fetch(`${API}/api/auth/users?client_type=mobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'E2E 測試' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.accessToken || !data.refreshToken) {
    throw new Error(`signup failed: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  }
  return {
    email,
    session: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    },
  };
}

async function findUnboundMember(accessToken) {
  const res = await fetch(`${API}/api/database/rpc/bni_search_unbound_members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ p_query: '陳', p_limit: 5 }),
  });
  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data) ? data : (data?.data ?? []);
  return rows[0] || null;
}

async function run() {
  console.log(`\nE2E user flow → ${BASE}`);
  console.log(`InsForge API → ${API}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // ── 1. 未登入：應顯示 Google 登入 ──
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    const loginBtn = page.locator('#google-login-btn');
    await loginBtn.waitFor({ state: 'visible', timeout: 15000 });
    const loginText = await page.locator('#app').innerText();
    if (!/Google|登入/.test(loginText)) fail('01 未登入顯示登入頁', loginText.slice(0, 80));
    else ok('01 未登入顯示登入頁');
    const memberCount = await page.evaluate(() => window.BNI_MEMBERS?.length ?? 0);
    if (memberCount > 0) ok('01b 會員資料已載入', `${memberCount} 筆`);
  } catch (e) {
    fail('01 未登入顯示登入頁', e.message);
  }

  // ── 2. 建立測試帳號 + 注入 session ──
  let testEmail;
  let session;
  try {
    ({ email: testEmail, session } = await createTestSession());
    ok('02 建立測試帳號', testEmail);
  } catch (e) {
    fail('02 建立測試帳號', e.message);
    await browser.close();
    process.exit(1);
  }

  await page.evaluate(s => {
    localStorage.setItem('bni_auth_session', JSON.stringify(s));
  }, session);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // ── 3. 已登入未綁定：認領頁必須有楊董區 / 非楊董區 ──
  try {
    const appText = await page.locator('#app').innerText();
    const ateamBtn = page.locator('[data-mode="ateam"]');
    const guestBtn = page.locator('[data-mode="guest-branch"]');
    await ateamBtn.waitFor({ state: 'visible', timeout: 15000 });
    await guestBtn.waitFor({ state: 'visible', timeout: 5000 });
    if (!/認領|楊董|②/.test(appText)) fail('03 認領頁內容', appText.slice(0, 120));
    else ok('03 認領頁顯示（② 認領身分）', '楊董區 + 非楊董區可見');
    if (appText.trim().length < 50) fail('03b 認領頁非空白', `len=${appText.length}`);
    else ok('03b 認領頁非空白', `${appText.length} 字`);
  } catch (e) {
    fail('03 認領頁顯示', e.message);
    const html = await page.locator('#app').innerHTML().catch(() => '');
    console.error('    app HTML snippet:', html.slice(0, 300));
  }

  // ── 4. 綁定搜尋流程 ──
  try {
    await page.locator('[data-mode="ateam"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-mode="bind"]').click();
    await page.waitForTimeout(300);
    const search = page.locator('#bind-search');
    await search.waitFor({ state: 'visible', timeout: 5000 });
    await search.fill('陳');
    await page.waitForTimeout(800);
    const results = page.locator('.bind-item');
    const count = await results.count();
    if (count < 1) {
      const empty = await page.locator('#bind-results').innerText();
      fail('04 綁定搜尋有結果', empty || 'no results');
    } else {
      ok('04 綁定搜尋有結果', `${count} 筆`);
    }
  } catch (e) {
    fail('04 綁定搜尋', e.message);
  }

  // ── 5. 新認領表單 + 範本 ──
  try {
    await page.locator('[data-back="ateam"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-mode="register"]').click();
    await page.waitForTimeout(300);
    await page.locator('.ateam-pick-chip').first().click();
    await page.waitForTimeout(200);
    const template = page.locator('.profile-template-panel');
    await template.waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[data-preset="default"]').click();
    await page.waitForTimeout(200);
    const prof = await page.locator('input[name="profession"]').inputValue();
    if (!prof) fail('05 範本套用', 'profession empty');
    else ok('05 新認領範本可套用', prof.slice(0, 30));
  } catch (e) {
    fail('05 新認領範本', e.message);
  }

  // ── 6. API 綁定 + 重載進首頁 ──
  try {
    const member = await findUnboundMember(session.accessToken);
    if (!member?.id) throw new Error('no unbound member for bind test');
    const bindRes = await fetch(`${API}/api/database/rpc/bni_bind_existing_member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ p_member_id: member.id }),
    });
    const bindData = await bindRes.json().catch(() => ({}));
    if (!bindRes.ok) throw new Error(JSON.stringify(bindData).slice(0, 150));
    ok('06 API 綁定成功', member.name);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // 關閉或完成教學
    const tutorial = page.locator('#welcome-overlay');
    if (await tutorial.isVisible().catch(() => false)) {
      const startBtn = page.locator('#welcome-start, #welcome-next');
      for (let i = 0; i < 12; i++) {
        if (!(await tutorial.isVisible().catch(() => false))) break;
        const next = page.locator('#welcome-next');
        const start = page.locator('#welcome-start');
        if (await start.isVisible().catch(() => false)) {
          await start.click();
          break;
        }
        if (await next.isVisible().catch(() => false)) await next.click();
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(500);
    }

    const tabBar = page.locator('#tab-bar');
    await tabBar.waitFor({ state: 'visible', timeout: 15000 });
    const homeText = await page.locator('#app').innerText();
    if (!/A Team|商務|800|首頁|分會/.test(homeText)) {
      fail('07 綁定後進首頁', homeText.slice(0, 100));
    } else {
      ok('07 綁定後進首頁', 'tab bar 可見');
    }
  } catch (e) {
    fail('06-07 綁定後首頁', e.message);
  }

  // ── 8. 導覽分頁 ──
  try {
    for (const hash of ['search', 'marks', 'leaders']) {
      await page.evaluate(h => { location.hash = h; }, hash);
      await page.waitForTimeout(800);
      const text = await page.locator('#app').innerText();
      if (text.length < 20) fail(`08 分頁 #${hash}`, 'content too short');
    }
    await page.evaluate(() => { location.hash = 'result'; });
    await page.waitForTimeout(800);
    if (!(await page.locator('#marks-list').count())) fail('08 #result 相容', '應導向 marks 頁');
    ok('08 各分頁可導覽', 'search/marks/leaders（#result 相容）');
  } catch (e) {
    fail('08 分頁導覽', e.message);
  }

  // ── 9. profile 頁 ──
  try {
    await page.evaluate(() => { location.hash = 'profile'; });
    await page.waitForTimeout(1000);
    const profForm = page.locator('#profile-form');
    await profForm.waitFor({ state: 'visible', timeout: 8000 });
    const tpl = page.locator('.profile-template-panel');
    if (await tpl.isVisible()) ok('09 我的資料 + 範本', 'profile form OK');
    else fail('09 我的資料範本', 'panel missing');
  } catch (e) {
    fail('09 我的資料', e.message);
  }

  const criticalErrors = consoleErrors.filter(e =>
    !/favicon|404.*\.map|refresh|Unauthorized|401/.test(e),
  );
  if (criticalErrors.length) {
    fail('10 Console 無致命錯誤', criticalErrors.slice(0, 3).join(' | '));
  } else {
    ok('10 Console 無致命錯誤', consoleErrors.length ? `${consoleErrors.length} 則可忽略` : 'clean');
  }

  await browser.close();
  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
