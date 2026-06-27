const SESSION_KEY = 'bni_search_session';
const DRAFT_KEY = 'bni_search_draft';

/** @typedef {{ input: string, intent: object, steps: string[] }} SearchSession */

function safeSet(storage, key, value) {
  try { storage.setItem(key, value); } catch { /* quota / private mode */ }
}

function safeGet(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

function safeRemove(storage, key) {
  try { storage.removeItem(key); } catch { /* ignore */ }
}

/** 持久化媒合輸入草稿（跨次開啟 App 保留） */
export function saveSearchDraft(input) {
  const text = String(input || '').trim();
  if (text.length < 2) {
    safeRemove(localStorage, DRAFT_KEY);
    return;
  }
  safeSet(localStorage, DRAFT_KEY, text.slice(0, 500));
}

/** @returns {string} */
export function loadSearchDraft() {
  const raw = safeGet(localStorage, DRAFT_KEY);
  if (!raw || typeof raw !== 'string') return '';
  return raw.slice(0, 500);
}

export function clearSearchDraft() {
  safeRemove(localStorage, DRAFT_KEY);
}

/** @param {SearchSession} data */
export function saveSearchSession(data) {
  saveSearchDraft(data.input);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      input: data.input,
      intent: data.intent,
      steps: data.steps,
      savedAt: Date.now(),
    }));
  } catch { /* quota / private mode */ }
}

/** @returns {SearchSession | null} */
export function loadSearchSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.input || !data?.intent) return null;
    return data;
  } catch {
    return null;
  }
}

/** 清除本次搜尋結果暫存（保留輸入草稿） */
export function clearSearchSession() {
  safeRemove(sessionStorage, SESSION_KEY);
}
