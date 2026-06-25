/**
 * BNI A Team — 獨立 InsForge 後端（a-team 專用）。
 * 與夢想一號魔術方塊學院、UIC 等其他 InsForge 專案完全分離。
 * Hosted at https://a-team9204.zeabur.app (Zeabur).
 */
export const INSFORGE_BASE_URL = 'https://a-team9204.zeabur.app';

/** Public anon JWT — safe in frontend; RLS restricts writes. Regenerate via POST /api/auth/tokens/anon (admin). */
export const INSFORGE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTM4NzR9.b4G5qu2-t9QGM3TIkAO_2LLTWBPztLBMDC4q0Cf0m8g';
