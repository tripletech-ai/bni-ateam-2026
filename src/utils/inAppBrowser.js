/** LINE / FB / IG / WeChat 等內建瀏覽器 — Google OAuth 會 403 disallowed_useragent */

/** LINE 官方參數：分享連結時加上可讓 LINE 直接用 Safari/Chrome 開啟 */
export const LINE_EXTERNAL_BROWSER_PARAM = 'openExternalBrowser';

export function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  if (/Line\//i.test(ua)) return true;
  if (/FBAN|FBAV|Instagram|FB_IAB/i.test(ua)) return true;
  if (/MicroMessenger/i.test(ua)) return true;
  if (/Twitter/i.test(ua)) return true;
  if (/LinkedInApp/i.test(ua)) return true;
  if (/Android/i.test(ua) && /\; wv\)/.test(ua)) return true;
  return false;
}

export function inAppBrowserLabel() {
  const ua = navigator.userAgent || '';
  if (/Line\//i.test(ua)) return 'LINE';
  if (/MicroMessenger/i.test(ua)) return 'WeChat';
  if (/FBAN|FBAV|Instagram|FB_IAB/i.test(ua)) return 'Facebook';
  return 'App';
}

/** 分享用 URL：LINE 會辨識 openExternalBrowser=1 並改開外部瀏覽器 */
export function withLineExternalBrowserParam(url = window.location.href) {
  try {
    const u = new URL(url);
    u.searchParams.set(LINE_EXTERNAL_BROWSER_PARAM, '1');
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${LINE_EXTERNAL_BROWSER_PARAM}=1`;
  }
}

/** 正規化網址：修正 // 路徑、清掉 LINE 參數（避免相對資源 404） */
export function normalizeAppUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  let changed = false;

  if (url.pathname !== '/' && /^\/+$/.test(url.pathname)) {
    url.pathname = '/';
    changed = true;
  }

  if (url.searchParams.has(LINE_EXTERNAL_BROWSER_PARAM)) {
    url.searchParams.delete(LINE_EXTERNAL_BROWSER_PARAM);
    changed = true;
  }

  if (changed) {
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
}

/** @deprecated use normalizeAppUrl */
export function stripLineExternalBrowserParam() {
  normalizeAppUrl();
}

export function getShareUrl() {
  return withLineExternalBrowserParam(`${window.location.origin}/`);
}

/** Android 嘗試用 Chrome 開啟；iOS 需使用者手動「在瀏覽器開啟」 */
export function tryOpenExternalBrowser(url = window.location.href) {
  const ua = navigator.userAgent || '';
  const clean = (() => {
    try {
      const u = new URL(url);
      u.searchParams.delete(LINE_EXTERNAL_BROWSER_PARAM);
      return u.toString();
    } catch { return url; }
  })();
  if (/Android/i.test(ua)) {
    const stripped = clean.replace(/^https?:\/\//, '');
    window.location.href =
      `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;` +
      `category=android.intent.category.BROWSABLE;package=com.android.chrome;` +
      `S.browser_fallback_url=${encodeURIComponent(clean)};end`;
    return true;
  }
  window.open(clean, '_blank', 'noopener,noreferrer');
  return false;
}

export async function copyPageUrl() {
  const url = getShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
