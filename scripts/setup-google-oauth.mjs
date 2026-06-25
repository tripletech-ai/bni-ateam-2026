/**
 * 設定 a-team InsForge 的 Google OAuth（BNI 專用，非夢想一號）
 *
 * 需要：
 *   BNI_API_KEY          InsForge 管理員 API Key（ik_...）
 *   GOOGLE_CLIENT_ID     Google Cloud OAuth Client ID
 *   GOOGLE_CLIENT_SECRET Google Cloud OAuth Client Secret
 *
 * 執行：
 *   $env:BNI_API_KEY="ik_..."
 *   $env:GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
 *   $env:GOOGLE_CLIENT_SECRET="GOCSPX-..."
 *   node scripts/setup-google-oauth.mjs
 *
 * Google Cloud Console 需加入 Authorized redirect URI（與 InsForge 完全一致）：
 *   https://a-team9204.zeabur.app/api/auth/oauth/google/callback
 * 若 InsForge 後台誤設尾隨斜線，Google 也要加雙斜線版：
 *   https://a-team9204.zeabur.app//api/auth/oauth/google/callback
 */
import { adminApi, BNI_API_BASE, BNI_API_KEY } from './insforge-admin-api.mjs';

const INSFORGE_CALLBACK = `${BNI_API_BASE.replace(/\/$/, '')}/api/auth/oauth/google/callback`;

const ALLOWED_REDIRECT_URLS = [
  'https://bni-ateam-2026.netlify.app/',
  'https://bni-ateam-2026.netlify.app',
  'http://localhost:8888/',
  'http://localhost:8888',
  'http://localhost:3000/',
  'http://localhost:3000',
];

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`缺少環境變數 ${name}`);
    process.exit(1);
  }
  return v;
}

async function upsertGoogleOAuth(clientId, clientSecret) {
  const body = {
    provider: 'google',
    clientId,
    clientSecret,
    redirectUri: INSFORGE_CALLBACK,
    scopes: ['openid', 'email', 'profile'],
    useSharedKey: false,
  };

  try {
    await adminApi('/api/auth/oauth/google/config', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    console.log('✓ 已更新 Google OAuth 設定');
  } catch (e) {
    if (!String(e.message).includes('404')) throw e;
    await adminApi('/api/auth/oauth/configs', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    console.log('✓ 已建立 Google OAuth 設定');
  }
}

async function setAllowedRedirects() {
  let current = {};
  try {
    current = await adminApi('/api/auth/config');
  } catch {
    /* first-time setup */
  }

  const merged = [...new Set([...(current.allowedRedirectUrls || []), ...ALLOWED_REDIRECT_URLS])];

  await adminApi('/api/auth/config', {
    method: 'PUT',
    body: JSON.stringify({ ...current, allowedRedirectUrls: merged }),
  });
  console.log('✓ allowedRedirectUrls 已設定：');
  merged.forEach(u => console.log(`    ${u}`));
}

async function verify() {
  const pub = await fetch(`${BNI_API_BASE}/api/auth/public-config`).then(r => r.json());
  const providers = pub.oAuthProviders || [];
  if (providers.includes('google')) {
    console.log('✓ public-config 已顯示 google');
  } else {
    console.warn('⚠ public-config 尚未列出 google，請確認設定或稍後重試');
  }

  const redirect = encodeURIComponent('https://bni-ateam-2026.netlify.app/');
  const test = await fetch(
    `${BNI_API_BASE}/api/auth/oauth/google?redirect_uri=${redirect}&code_challenge=E9MetWZc0z2WYv4n0FX11C5NWKc2lVKqLy_64QCXR8M`,
  ).then(r => r.json().catch(() => ({})));

  if (test.authUrl) {
    console.log('✓ OAuth 啟動 URL 可產生');
  } else if (test.error) {
    console.warn(`⚠ OAuth 測試：${test.message || test.error}`);
  }
}

async function main() {
  if (!BNI_API_KEY) {
    console.error('請設定 BNI_API_KEY（InsForge 管理後台 → API Keys → ik_...）');
    process.exit(1);
  }

  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');

  console.log('InsForge:', BNI_API_BASE);
  console.log('Google callback URI（請確認已在 Google Console 設定）：');
  console.log(' ', INSFORGE_CALLBACK);
  console.log('');

  await upsertGoogleOAuth(clientId, clientSecret);
  await setAllowedRedirects();
  await verify();

  console.log('\n完成。請到 https://bni-ateam-2026.netlify.app/ 測試 Google 登入。');
}

main().catch(e => {
  console.error('設定失敗:', e.message);
  process.exit(1);
});
