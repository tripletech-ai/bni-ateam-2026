import { recordConnectionMark, removeConnectionMark, withAuthRetry } from '../services/auth.js';
import { getCurrentUser, isBound } from '../services/auth.js';
import { getMarks, memberKey } from './storage.js';
import { refreshLeaderboardCache } from './leaderboardCache.js';
import { refreshConnectionCache } from './connectionCache.js';

function resolveDbId(member) {
  if (member?.dbId) return member.dbId;
  const key = memberKey(member);
  return (window.BNI_MEMBERS || []).find(m => memberKey(m) === key)?.dbId || null;
}

export async function syncMarkToServer(member, type, active, { refreshLb = true } = {}) {
  if (!getCurrentUser() || !isBound()) return { ok: false, skipped: true };
  const dbId = resolveDbId(member);
  if (!dbId) {
    console.warn('syncMarkToServer: missing dbId for', member?.name);
    return { ok: false, missingId: true };
  }
  try {
    await withAuthRetry(async () => {
      if (active) await recordConnectionMark(dbId, type);
      else await removeConnectionMark(dbId, type);
    });
    if (type === 'one') {
      refreshConnectionCache().catch(() => {});
      if (refreshLb) refreshLeaderboardCache().catch(() => {});
    }
    return { ok: true };
  } catch (e) {
    console.warn('syncMarkToServer:', e.message);
    return { ok: false, error: e };
  }
}

/** 認領完成後，將本地標記批次同步至伺服器 */
export async function syncAllMarksToServer(members = []) {
  if (!getCurrentUser() || !isBound()) return;
  const byKey = new Map(members.map(m => [memberKey(m), m]));
  for (const m of getMarks()) {
    const member = byKey.get(m.key);
    if (!member) continue;
    if (m.one) await syncMarkToServer(member, 'one', true, { refreshLb: false });
    if (m.biz) await syncMarkToServer(member, 'biz', true, { refreshLb: false });
  }
  await refreshLeaderboardCache();
}
