import { recordConnectionMark, removeConnectionMark } from '../services/auth.js';
import { getCurrentUser, isBound } from '../services/auth.js';
import { getMarks, memberKey } from './storage.js';

export async function syncMarkToServer(member, type, active) {
  if (!getCurrentUser() || !isBound() || !member?.dbId) return;
  try {
    if (active) await recordConnectionMark(member.dbId, type);
    else await removeConnectionMark(member.dbId, type);
  } catch (e) {
    console.warn('syncMarkToServer:', e.message);
  }
}

/** 認領完成後，將本地標記批次同步至伺服器 */
export async function syncAllMarksToServer(members = []) {
  if (!getCurrentUser() || !isBound()) return;
  const byKey = new Map(members.map(m => [memberKey(m), m]));
  for (const m of getMarks()) {
    const member = byKey.get(m.key);
    if (!member?.dbId) continue;
    if (m.one) await syncMarkToServer(member, 'one', true);
    if (m.biz) await syncMarkToServer(member, 'biz', true);
  }
}
