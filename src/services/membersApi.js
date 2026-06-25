function mapRow(row) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
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
    tags,
    status: row.status,
    authUserId: row.auth_user_id,
  };
}

export function mapDbMember(row) {
  return mapRow(row);
}

export async function loadMembersFromDb(fetchAllMembers) {
  const rows = await fetchAllMembers();
  const members = rows.map(mapRow);
  window.BNI_MEMBERS = members;
  return members;
}

export function applyMemberToCache(row) {
  const mapped = mapRow(row);
  const list = window.BNI_MEMBERS || [];
  const idx = list.findIndex(m => m.dbId === mapped.dbId);
  if (idx >= 0) list[idx] = mapped;
  else list.push(mapped);
  window.BNI_MEMBERS = list;
}
