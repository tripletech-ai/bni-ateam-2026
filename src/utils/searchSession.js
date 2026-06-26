const KEY = 'bni_search_session';

/** @typedef {{ input: string, intent: object, steps: string[] }} SearchSession */

/** @param {SearchSession} data */
export function saveSearchSession(data) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
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
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.input || !data?.intent) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSearchSession() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
