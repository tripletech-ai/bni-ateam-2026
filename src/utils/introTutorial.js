const INTRO_KEY = 'bni_intro_seen';

export function hasSeenIntro() {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* private mode */
  }
}
