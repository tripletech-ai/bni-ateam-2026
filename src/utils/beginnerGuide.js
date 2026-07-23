import { isDinnerMode } from '../config/appMode.js';
import { CHANGHUI_DINNER_EVENT } from '../data/changhuiDinner.js';

const SESSION_FLAG = 'bni_show_beginner_guide';

function seenKey() {
  if (isDinnerMode() && CHANGHUI_DINNER_EVENT?.id) {
    return `bni_beginner_guide_seen:${CHANGHUI_DINNER_EVENT.id}`;
  }
  return 'bni_beginner_guide_seen:default';
}

export function queueBeginnerGuide() {
  try {
    sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    /* private mode */
  }
}

export function consumeBeginnerGuideQueue() {
  try {
    if (sessionStorage.getItem(SESSION_FLAG) !== '1') return false;
    sessionStorage.removeItem(SESSION_FLAG);
    return true;
  } catch {
    return false;
  }
}

export function hasSeenBeginnerGuide() {
  try {
    return localStorage.getItem(seenKey()) === '1';
  } catch {
    return false;
  }
}

export function markBeginnerGuideSeen() {
  try {
    localStorage.setItem(seenKey(), '1');
  } catch {
    /* private mode */
  }
}
