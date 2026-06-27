import { fetchMyOutgoingMarks, getCurrentUser, isBound } from '../services/auth.js';
import { getMarks, setMarks, memberKey } from './storage.js';

/** 從 DB 還原本機標記（重整理／換裝置後連結榜資料不消失） */
export async function restoreMarksFromServer(members = window.BNI_MEMBERS || []) {
  if (!getCurrentUser() || !isBound()) return 0;
  let rows;
  try {
    rows = await fetchMyOutgoingMarks();
  } catch (e) {
    if (e.code === 'RPC_NOT_DEPLOYED') return 0;
    console.warn('restoreMarksFromServer:', e.message);
    return 0;
  }
  if (!rows?.length) return 0;

  const byDbId = new Map(members.filter(m => m.dbId).map(m => [m.dbId, m]));
  const byKey = new Map(members.map(m => [memberKey(m), m]));
  const list = getMarks();
  const idxByKey = new Map(list.map((m, i) => [m.key, i]));
  let changed = 0;

  for (const row of rows) {
    let member = (row.to_id && byDbId.get(row.to_id))
      || (row.name && row.branch ? byKey.get(`${row.name}||${row.branch}`) : null);
    if (!member && row.name && row.branch) {
      member = {
        dbId: row.to_id,
        name: row.name,
        branch: row.branch,
        profession: row.profession || '',
        have: row.have || '',
        wantMeet: row.want_meet || '',
        lineId: row.line_id || '',
        lineLink: row.line_link || '',
      };
    }
    if (!member) continue;

    const key = memberKey(member);
    const isOne = row.mark_type === 'one';
    const isBiz = row.mark_type === 'biz';
    if (!isOne && !isBiz) continue;

    let idx = idxByKey.get(key);
    if (idx === undefined) {
      list.push({
        key,
        name: member.name,
        branch: member.branch,
        profession: member.profession || '',
        have: member.have || '',
        wantMeet: member.wantMeet || '',
        lineId: member.lineId || '',
        lineLink: member.lineLink || '',
        one: isOne,
        biz: isBiz,
      });
      idxByKey.set(key, list.length - 1);
      changed++;
    } else {
      if (isOne && !list[idx].one) { list[idx].one = true; changed++; }
      if (isBiz && !list[idx].biz) { list[idx].biz = true; changed++; }
    }
  }

  if (changed) setMarks(list);
  return changed;
}
