/**
 * App 運作模式
 * - DINNER_MODE：長輝晚會現場模式（開放根路徑、選人入場）
 * - REGISTRATION_CLOSED：停止一般新註冊（晚宴模式例外允許本場名單）
 * - SUNSET_AT / EVENT_CLOSED：全站關閉蓋樓（晚宴模式關閉時生效）
 */
export const DINNER_MODE = true;

export const EVENT_CLOSED = false;

export const REGISTRATION_CLOSED = true;

/** 台北時間 — 2026/6/29（日）23:59 自動全站關閉（除 /admin、/show） */
export const SUNSET_AT = '2026-06-29T23:59:59+08:00';

export function isDinnerMode() {
  return DINNER_MODE === true;
}

export function isPastSunset() {
  return Date.now() >= new Date(SUNSET_AT).getTime();
}

export function isAppFullyClosed() {
  if (isDinnerMode()) return false;
  return EVENT_CLOSED || isPastSunset();
}

export function isRegistrationClosed() {
  if (isDinnerMode()) return false;
  return REGISTRATION_CLOSED || isPastSunset();
}
