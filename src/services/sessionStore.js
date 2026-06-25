/** Persisted auth session (cross-origin SPA — no third-party cookies). */
const KEY = 'bni_auth_session';

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.accessToken || !data?.refreshToken || !data?.user) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSession({ accessToken, refreshToken, user }) {
  if (!accessToken || !refreshToken || !user) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ accessToken, refreshToken, user }));
  } catch (e) {
    console.warn('sessionStore save failed:', e);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
