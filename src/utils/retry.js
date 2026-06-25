/**
 * 網路請求重試（週六尖峰瞬斷時避免整頁掛死）
 */
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function withRetry(fn, { retries = 3, delayMs = 600, label = 'request' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        console.warn(`[retry] ${label} attempt ${attempt}/${retries}:`, err.message || err);
        await sleep(delayMs * attempt);
      }
    }
  }
  throw lastErr;
}
