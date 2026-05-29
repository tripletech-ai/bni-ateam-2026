import { MEMBERS } from "../data/members.js";

export function searchMembers(keywords) {
  if (!keywords || keywords.length === 0) return [];
  const lkw = keywords.map(k => k.toLowerCase().trim()).filter(k => k.length >= 2);
  if (lkw.length === 0) return [];

  const results = [];
  for (const member of MEMBERS) {
    const searchText = [
      member.name,
      member.branch,
      member.profession,
      member.have,
      member.wantMeet,
      member.wantReferral,
      ...(member.tags || [])
    ].join(" ").toLowerCase();

    const matched = lkw.filter(k => searchText.includes(k));
    if (matched.length > 0) {
      results.push({ ...member, matchedKeywords: matched });
    }
  }

  // Sort by match count descending, then by name
  return results.sort((a, b) =>
    b.matchedKeywords.length - a.matchedKeywords.length ||
    a.name.localeCompare(b.name, 'zh-TW')
  );
}

export function getMembersByBranch(branchName) {
  return MEMBERS.filter(m => m.branch === branchName);
}

export function getAllMembers() {
  return [...MEMBERS];
}
