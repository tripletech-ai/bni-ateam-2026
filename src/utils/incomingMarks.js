/** 快取「想跟我約 1-1」標記，供標記分頁、Tab badge、互相連結估算共用 */

import { findMemberByNameBranch } from './feedMemberNav.js';

export {
  cacheIncomingOneKeys,
  cacheMutualPartners,
  hasIncomingOneMark,
  isServerMutual,
  refreshConnectionCache,
} from './connectionCache.js';

export function setIncomingUnseenCount(n) {
  const count = Math.max(0, Number(n) || 0);
  window.BNI_INCOMING_UNSEEN_COUNT = count;
  return count;
}

export function getIncomingUnseenCount() {
  return typeof window.BNI_INCOMING_UNSEEN_COUNT === 'number'
    ? window.BNI_INCOMING_UNSEEN_COUNT
    : 0;
}

export function resolveIncomingMemberLine(row) {
  const members = window.BNI_MEMBERS || [];
  if (row?.from_id) {
    const byId = members.find(m => m.dbId === row.from_id);
    if (byId) return { lineId: byId.lineId || '', lineLink: byId.lineLink || '' };
  }
  const byKey = members.find(m => m.name === row?.name && m.branch === row?.branch);
  return { lineId: byKey?.lineId || '', lineLink: byKey?.lineLink || '' };
}

/** 從 incoming 列解析完整夥伴物件（供回覆標記、查看資料） */
export function resolveIncomingMember(row) {
  if (!row) return null;
  const members = window.BNI_MEMBERS || [];
  if (row.from_id) {
    const byId = members.find(m => m.dbId === row.from_id);
    if (byId) return byId;
  }
  const found = findMemberByNameBranch(row.name, row.branch);
  if (found) return found;
  if (!row.name || !row.branch) return null;
  return {
    name: row.name,
    branch: row.branch,
    profession: row.profession || '',
    dbId: row.from_id || null,
    have: '',
    wantMeet: '',
    lineId: '',
    lineLink: '',
  };
}
