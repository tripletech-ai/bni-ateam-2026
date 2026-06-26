const KEY = "bni_ateam_marks_2026";

export const MARK_PARTNER_GOAL = 10;
export const MARK_ONE_GOAL = 30;

export function getMarks() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function setMarks(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); }
  catch (e) { console.warn('localStorage write failed:', e); }
}

export function memberKey(member) {
  return `${member.name}||${member.branch}`;
}

export function getMark(member) {
  const key = memberKey(member);
  const mark = getMarks().find(m => m.key === key);
  return { one: mark?.one || false, biz: mark?.biz || false };
}

export function setMark(member, type) {
  const key = memberKey(member);
  const list = getMarks();
  const idx = list.findIndex(m => m.key === key);
  if (idx === -1) {
    list.push({
      key,
      name: member.name,
      branch: member.branch,
      profession: member.profession,
      have: member.have || "",
      wantMeet: member.wantMeet || "",
      lineId: member.lineId || "",
      lineLink: member.lineLink || "",
      one: type === "one",
      biz: type === "biz",
    });
  } else {
    // Toggle: if already true, set to false; else set to true
    list[idx][type] = !list[idx][type];
    // If both false, still keep record (user may want to re-add)
  }
  setMarks(list);
}

export function removeMark(key) {
  setMarks(getMarks().filter(m => m.key !== key));
}

export function getOneMarkCount() {
  return getMarks().filter(m => m.one).length;
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
  const incoming = window.BNI_INCOMING_ONE_KEYS;
  if (!incoming?.size) return 0;
  return getMarks().filter(m => m.one && incoming.has(m.key)).length;
}

export function isMutuallyConnected(member) {
  const mark = getMark(member);
  if (!mark.one) return false;
  const incoming = window.BNI_INCOMING_ONE_KEYS;
  return incoming?.has(memberKey(member)) ?? false;
}
