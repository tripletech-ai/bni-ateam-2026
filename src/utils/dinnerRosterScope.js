import { isDinnerMode } from '../config/appMode.js';
import { getChanghuiDinnerRoster } from '../data/changhuiDinner.js';

function coreDinnerName(n) {
  return String(n || '')
    .replace(/\s+/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[A-Za-z].*$/, '')
    .trim();
}

function pickRicher(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x) return y;
  if (!y) return x;
  return x.length >= y.length ? x : y;
}

/**
 * 晚宴模式：把 window.BNI_MEMBERS 收斂成「今晚出席者 only」。
 * DB 欄位（dbId 等）會依姓名對回本場名單；靜態預填與 DB／年會 cue 取較完整者。
 */
export function applyDinnerRosterScope() {
  if (!isDinnerMode()) return window.BNI_MEMBERS || [];
  const dinner = getChanghuiDinnerRoster();
  const existing = window.BNI_MEMBERS || [];
  const byCore = new Map();
  for (const m of existing) {
    const k = coreDinnerName(m.name);
    if (!k) continue;
    const prev = byCore.get(k);
    if (!prev) {
      byCore.set(k, m);
      continue;
    }
    // 同名多筆時保留資料較完整者（年會 cue 後通常在此）
    const score = (r) =>
      String(r.bio || '').length + String(r.have || '').length + String(r.profession || '').length;
    if (score(m) > score(prev)) byCore.set(k, m);
  }

  window.BNI_MEMBERS = dinner.map(p => {
    const prev = byCore.get(coreDinnerName(p.name));
    return {
      ...(prev || {}),
      id: prev?.id || p.id,
      dbId: prev?.dbId,
      name: p.name,
      branch: p.branch,
      region: p.region,
      profession: pickRicher(p.profession, prev?.profession),
      have: pickRicher(p.have, prev?.have),
      wantMeet: pickRicher(p.wantMeet, prev?.wantMeet),
      bio: pickRicher(p.bio, prev?.bio),
      photo: p.photo || prev?.photo || '',
      lineLink: pickRicher(p.lineLink, prev?.lineLink),
      tags: (prev?.tags?.length ? prev.tags : null) || (p.tags?.length ? p.tags : []) || [],
      invitedBy: p.invitedBy || '',
      dinnerType: p.type,
      eventScoped: true,
      yearEndCued: !!(prev && (prev.bio || prev.have || prev.profession)),
    };
  });
  window.BNI_EVENT_ROSTER_SIZE = window.BNI_MEMBERS.length;
  return window.BNI_MEMBERS;
}
