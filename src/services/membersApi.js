const MEMBERS_STALE_MS = 90_000;
let refreshPromise = null;

function mapRow(row) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const claimed = row.claimed === true || !!row.auth_user_id;
  return {
    id: row.roster_id || row.id,
    dbId: row.id,
    name: row.name,
    branch: row.branch,
    region: row.region || 'zhongshan',
    profession: row.profession || '',
    have: row.have || '',
    wantMeet: row.want_meet || '',
    wantReferral: row.want_referral || '',
    lineId: row.line_id || '',
    lineLink: row.line_link || '',
    bio: row.bio || '',
    cardLink: row.card_link || '',
    industries: Array.isArray(row.industries) ? row.industries : [],
    tags,
    status: row.status,
    claimed,
    authUserId: row.auth_user_id || (claimed ? '__bound__' : null),
  };
}

export function mapDbMember(row) {
  return mapRow(row);
}

export async function loadMembersFromDb(fetchAllMembers) {
  const rows = await fetchAllMembers();
  const members = rows.map(mapRow);
  window.BNI_MEMBERS = members;
  window.BNI_MEMBERS_LOADED_AT = Date.now();
  return members;
}

/** 進入搜尋／填完資料後刷新名單，讓新認領會員可被搜到 */
export async function refreshMembersCache(fetchAllMembers, { force = false } = {}) {
  const loadedAt = window.BNI_MEMBERS_LOADED_AT || 0;
  if (!force && Date.now() - loadedAt < MEMBERS_STALE_MS && window.BNI_MEMBERS?.length) {
    return window.BNI_MEMBERS;
  }
  if (refreshPromise) return refreshPromise;
  refreshPromise = loadMembersFromDb(fetchAllMembers)
    .then(members => {
      window.dispatchEvent(new CustomEvent('bni-members-updated'));
      return members;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export function applyMemberToCache(row) {
  const mapped = mapRow(row);
  const list = window.BNI_MEMBERS || [];
  const idx = list.findIndex(m => m.dbId === mapped.dbId);
  if (idx >= 0) list[idx] = mapped;
  else list.push(mapped);
  window.BNI_MEMBERS = list;
  window.BNI_MEMBERS_LOADED_AT = Date.now();
}
