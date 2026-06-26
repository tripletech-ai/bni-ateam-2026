const KEY = 'bni_guest_trial';

export function isGuestTrial() {
  try { return sessionStorage.getItem(KEY) === '1'; }
  catch { return false; }
}

export function startGuestTrial() {
  try { sessionStorage.setItem(KEY, '1'); }
  catch (e) { console.warn('guest trial:', e); }
}

export function endGuestTrial() {
  try { sessionStorage.removeItem(KEY); }
  catch (e) { console.warn('guest trial:', e); }
}
