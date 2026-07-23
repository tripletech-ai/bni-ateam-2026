/**
 * 晚宴入場必須完成「真實 DB 綁定」：廣播／標記 RPC 都以 auth_user_id 判斷。
 * 本機 applyDinnerBoundStatus 只負責 UI 顯示，不能代替 bind。
 */
import {
  ensureAuthSession,
  refreshStatus,
  isBound,
  getMyStatus,
  bindExistingMember,
  registerNewMember,
  selfUnbind,
} from '../services/auth.js';
import {
  claimByNameBranch,
  normalizeChineseName,
  matchesBoundIdentity,
} from './memberClaim.js';
import { normalizeBranchName, branchesEquivalent } from '../data/branches.js';

function claimNameFromPerson(person) {
  return normalizeChineseName(
    (String(person?.name || '').replace(/\s+[A-Za-z].*$/, '').trim() || person?.name || ''),
  );
}

function claimBranchFromPerson(person) {
  return normalizeBranchName(person?.branch || '') || String(person?.branch || '').trim();
}

function findRosterDbMatch(person) {
  const name = claimNameFromPerson(person);
  const branch = claimBranchFromPerson(person);
  if (!name || !branch) return null;
  const list = window.BNI_MEMBERS || [];
  const hits = list.filter(m =>
    normalizeChineseName(m.name) === name
    && branchesEquivalent(m.branch, branch)
    && m.dbId,
  );
  return hits.find(m => !m.claimed && !m.authUserId) || hits[0] || null;
}

async function ensureUnboundForSwitch(person) {
  await refreshStatus().catch(() => {});
  if (!isBound()) return;
  if (matchesBoundIdentity({
    name: claimNameFromPerson(person),
    branch: claimBranchFromPerson(person),
  })) {
    return;
  }
  // 已綁到別人（含換身分）→ 先解除再認領本場身分
  await selfUnbind();
}

/**
 * @param {object} person dinner roster person
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function ensureDinnerDbBind(person) {
  if (!person?.name || !person?.branch) {
    return { ok: false, error: 'MISSING_PERSON' };
  }

  const sessionOk = await ensureAuthSession();
  if (!sessionOk) return { ok: false, error: 'NO_SESSION' };

  await ensureUnboundForSwitch(person);

  await refreshStatus().catch(() => {});
  if (matchesBoundIdentity({
    name: claimNameFromPerson(person),
    branch: claimBranchFromPerson(person),
  })) {
    return { ok: true };
  }

  const rosterHit = findRosterDbMatch(person);
  if (rosterHit?.dbId) {
    try {
      await bindExistingMember(rosterHit.dbId);
      if (isBound()) return { ok: true };
    } catch (e) {
      console.warn('dinner bindExistingMember:', e.message);
    }
  }

  const payload = {
    name: claimNameFromPerson(person),
    branch: claimBranchFromPerson(person),
    region: person.region || (person.type === 'guest' ? 'guest' : 'zhongshan'),
  };

  try {
    await claimByNameBranch(payload);
    if (isBound()) return { ok: true };
  } catch (e) {
    console.warn('dinner claimByNameBranch:', e.message);
  }

  try {
    await registerNewMember({
      name: payload.name,
      branch: payload.branch,
      region: payload.region,
      profession: person.profession || '',
      have: person.have || '',
      wantMeet: person.wantMeet || '',
      tags: person.tags || [],
    });
    await refreshStatus().catch(() => {});
    if (isBound()) return { ok: true };
  } catch (e) {
    console.warn('dinner registerNewMember:', e.message);
    return { ok: false, error: e.message || 'REGISTER_FAIL' };
  }

  return { ok: false, error: 'NOT_BOUND' };
}

/** 發言前急救：若晚宴本機已入場但 DB 未綁定，補綁一次 */
export async function repairDinnerBindIfNeeded() {
  const person = typeof window !== 'undefined' ? window.BNI_DINNER_PROFILE : null;
  if (!person?.name) return false;
  await refreshStatus().catch(() => {});
  if (isBound() && matchesBoundIdentity({
    name: claimNameFromPerson(person),
    branch: claimBranchFromPerson(person),
  })) {
    return true;
  }
  const result = await ensureDinnerDbBind(person);
  return result.ok;
}
