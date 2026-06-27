/**
 * App 運作模式（活動後 grace period）
 * - REGISTRATION_CLOSED：停止「新會員註冊」，但仍可重新認領資料庫既有名單
 * - SUNSET_AT：此時間後（台北）全站改為關閉頁（除 /admin）
 * - EVENT_CLOSED：手動強制全站關閉（覆蓋上述邏輯）
 */
export const EVENT_CLOSED = false;

export const REGISTRATION_CLOSED = true;

/** 台北時間 — 系統完全關閉 */
export const SUNSET_AT = '2026-06-29T23:59:59+08:00';

export function isPastSunset() {
  return Date.now() >= new Date(SUNSET_AT).getTime();
}

export function isAppFullyClosed() {
  return EVENT_CLOSED || isPastSunset();
}

export function isRegistrationClosed() {
  return REGISTRATION_CLOSED || isPastSunset();
}
