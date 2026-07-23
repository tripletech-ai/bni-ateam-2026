import { activeEventId } from './eventScope.js';

const BASE_KEY = "bni_ateam_marks_2026";
const BASE_PENDING_KEY = "bni_pending_marks_2026";

function marksKey() {
  const eventId = activeEventId();
  return eventId ? `${BASE_KEY}:${eventId}` : BASE_KEY;
}

function pendingKey() {
  const eventId = activeEventId();
  return eventId ? `${BASE_PENDING_KEY}:${eventId}` : BASE_PENDING_KEY;
}

/** 晚宴目標較小；年會沿用原設定 */
export function getMarkPartnerGoal() {
  return activeEventId() ? 5 : 10;
}
export function getMarkOneGoal() {
  return activeEventId() ? 10 : 30;
}
export const MARK_PARTNER_GOAL = 10;
export const MARK_ONE_GOAL = 30;

function readList(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}

function writeList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); }
  catch (e) { console.warn('localStorage write failed:', e); }
}

export function getMarks() {
  return readList(marksKey());
}

export function setMarks(list) {
  writeList(marksKey(), list);
}

export function getPendingMarks() {
  return readList(pendingKey());
}

function setPendingMarks(list) {
  writeList(pendingKey(), list);
}

export function clearPendingMarks() {
  try { localStorage.removeItem(pendingKey()); }
  catch (e) { console.warn('clearPendingMarks:', e); }
}

export function memberKey(member) {
  return `${member.name}||${member.branch}`;
}

function markEntry(member, type) {
  return {
    key: memberKey(member),
    name: member.name,
    branch: member.branch,
    profession: member.profession,
    have: member.have || "",
    wantMeet: member.wantMeet || "",
    lineId: member.lineId || "",
    lineLink: member.lineLink || "",
    one: type === "one",
    biz: type === "biz",
  };
}

function toggleMarkInList(list, member, type) {
  const key = memberKey(member);
  const idx = list.findIndex(m => m.key === key);
  if (idx === -1) {
    list.push(markEntry(member, type));
  } else {
    list[idx][type] = !list[idx][type];
  }
  return list;
}

export function getMark(member) {
  const key = memberKey(member);
  const mark = getMarks().find(m => m.key === key);
  const pending = getPendingMarks().find(m => m.key === key);
  return {
    one: !!(mark?.one || pending?.one),
    biz: !!(mark?.biz || pending?.biz),
  };
}

export function setMark(member, type) {
  const list = getMarks();
  toggleMarkInList(list, member, type);
  setMarks(list);
}

/** 訪客試玩：暫存標記，登入認領後由 mergePendingMarks 合併 */
export function setPendingMark(member, type) {
  const list = getPendingMarks();
  toggleMarkInList(list, member, type);
  setPendingMarks(list);
}

/** 登入認領完成後，將訪客暫存標記併入主清單 */
export function mergePendingMarks() {
  const pending = getPendingMarks().filter(m => m.one || m.biz);
  if (!pending.length) {
    clearPendingMarks();
    return 0;
  }
  const list = getMarks();
  for (const p of pending) {
    const idx = list.findIndex(m => m.key === p.key);
    if (idx === -1) {
      list.push({ ...p });
    } else {
      list[idx].one = list[idx].one || p.one;
      list[idx].biz = list[idx].biz || p.biz;
    }
  }
  setMarks(list);
  clearPendingMarks();
  return pending.length;
}

export function removeMark(key) {
  setMarks(getMarks().filter(m => m.key !== key));
  setPendingMarks(getPendingMarks().filter(m => m.key !== key));
}

export function getPendingMarkCount() {
  return getPendingMarks().filter(m => m.one || m.biz).length;
}

export function getOneMarkCount() {
  const keys = new Set();
  getMarks().forEach(m => { if (m.one) keys.add(m.key); });
  getPendingMarks().forEach(m => { if (m.one) keys.add(m.key); });
  return keys.size;
}

export function getMarkCount() {
  return getConnectionCount();
}

export function getConnectionCount() {
  if (typeof window.BNI_MUTUAL_COUNT === 'number') return window.BNI_MUTUAL_COUNT;
  return getMutualConnectionCountLocal();
}

/** 本地估算：我標記 one + 對方也標記我（來自 incoming cache） */
export function getMutualConnectionCountLocal() {
  const incomingKeys = window.BNI_INCOMING_ONE_KEYS;
  const incomingIds = window.BNI_INCOMING_ONE_IDS;
  if (!incomingKeys?.size && !incomingIds?.size) return 0;
  return getMarks().filter(m => {
    if (!m.one) return false;
    if (incomingKeys?.has(m.key)) return true;
    const member = (window.BNI_MEMBERS || []).find(x => memberKey(x) === m.key);
    return !!(member?.dbId && incomingIds?.has(member.dbId));
  }).length;
}

export function isMutuallyConnected(member) {
  if (!member) return false;
  if (member.dbId && window.BNI_MUTUAL_IDS?.has(member.dbId)) return true;
  if (window.BNI_MUTUAL_KEYS?.has(memberKey(member))) return true;
  const mark = getMark(member);
  if (!mark.one) return false;
  if (member.dbId && window.BNI_INCOMING_ONE_IDS?.has(member.dbId)) return true;
  return window.BNI_INCOMING_ONE_KEYS?.has(memberKey(member)) ?? false;
}
