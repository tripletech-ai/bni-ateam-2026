import { isDinnerMode } from '../config/appMode.js';
import { CHANGHUI_DINNER_EVENT } from '../data/changhuiDinner.js';

/** 晚宴獨立活動 ID；非晚宴回 null（走年會累積榜） */
export function activeEventId() {
  if (!isDinnerMode()) return null;
  return CHANGHUI_DINNER_EVENT?.id || null;
}

export function isEventScoped() {
  return !!activeEventId();
}
