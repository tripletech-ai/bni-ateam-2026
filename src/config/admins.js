/** 管理員 Google 帳號（與 DB bni_is_admin() 白名單同步） */
export const ADMIN_EMAILS = Object.freeze([
  'b1993614@gmail.com',
  'tripletech.ai@gmail.com',
  'samuel900731@gmail.com',
]);

export function normalizeAdminEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isAdminEmail(email) {
  const e = normalizeAdminEmail(email);
  return e.length > 0 && ADMIN_EMAILS.includes(e);
}
