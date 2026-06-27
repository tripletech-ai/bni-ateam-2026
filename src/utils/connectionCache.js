import { fetchIncomingMarks, fetchMyMutualStats } from '../services/auth.js';
import { restoreMarksFromServer } from './marksRestore.js';
import { memberKey } from './storage.js';

export function cacheIncomingOneKeys(rows) {
  const keys = new Set();
  const ids = new Set();
  for (const r of rows || []) {
    if (r.mark_type && r.mark_type !== 'one') continue;
    if (r.from_id) ids.add(r.from_id);
    if (r.name && r.branch) keys.add(`${r.name}||${r.branch}`);
  }
  window.BNI_INCOMING_ONE_KEYS = keys;
  window.BNI_INCOMING_ONE_IDS = ids;
}

export function cacheMutualPartners(partners) {
  const keys = new Set();
  const ids = new Set();
  for (const p of partners || []) {
    if (p.id) ids.add(p.id);
    if (p.name && p.branch) keys.add(`${p.name}||${p.branch}`);
  }
  window.BNI_MUTUAL_KEYS = keys;
  window.BNI_MUTUAL_IDS = ids;
}

export function isServerMutual(member) {
  if (!member) return false;
  if (member.dbId && window.BNI_MUTUAL_IDS?.has(member.dbId)) return true;
  return window.BNI_MUTUAL_KEYS?.has(memberKey(member)) ?? false;
}

export function hasIncomingOneMark(member) {
  if (!member) return false;
  if (member.dbId && window.BNI_INCOMING_ONE_IDS?.has(member.dbId)) return true;
  return window.BNI_INCOMING_ONE_KEYS?.has(memberKey(member)) ?? false;
}

/** 重新抓取 incoming + 伺服器互相連結，更新快取並通知 UI */
export async function refreshConnectionCache() {
  await restoreMarksFromServer().catch(() => {});
  const [incoming, stats] = await Promise.all([
    fetchIncomingMarks(false).catch(() => []),
    fetchMyMutualStats().catch(() => null),
  ]);
  cacheIncomingOneKeys(incoming);
  if (Array.isArray(stats?.mutual_partners)) {
    cacheMutualPartners(stats.mutual_partners);
  }
  if (stats && typeof stats.mutual_count === 'number') {
    window.BNI_MUTUAL_COUNT = stats.mutual_count;
  }
  window.dispatchEvent(new CustomEvent('bni-connections-updated'));
  const unseenCount = (incoming || []).filter(r => !r.seen_by_target).length;
  return { incoming, stats, unseenCount };
}
