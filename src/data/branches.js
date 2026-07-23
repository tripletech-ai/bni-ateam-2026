/** 楊董 A Team 旗下 20 個分會 */
export const BRANCHES = {
  zhongshan: [
    { name: "長悅", count: 11 },
    { name: "長佑", count: 10 },
    { name: "長翔", count: 8 },
    { name: "長城", count: 7 },
    { name: "長輝", count: 6 },
    { name: "長翼", count: 3 },
    { name: "長利", count: 2 },
    { name: "長和", count: 0 },
  ],
  sanlu: [
    { name: "金鑫",   count: 22 },
    { name: "金虎",   count: 7  },
    { name: "金暘",   count: 7  },
    { name: "金利",   count: 6  },
    { name: "金澎湃", count: 6  },
    { name: "金鈺",   count: 5  },
    { name: "金安",   count: 4  },
    { name: "金佑",   count: 3  },
    { name: "金盟",   count: 3  },
    { name: "金美",   count: 3  },
    { name: "金英",   count: 2  },
    { name: "金合",   count: 1  },
  ]
};

export function getAteamBranchNames() {
  return [
    ...BRANCHES.zhongshan.map(b => `${b.name}分會`),
    ...BRANCHES.sanlu.map(b => `${b.name}分會`),
  ];
}

const ATEAM_BRANCH_SET = new Set(getAteamBranchNames());

export function isAteamBranch(branch) {
  const s = String(branch || '').trim();
  if (ATEAM_BRANCH_SET.has(s)) return true;
  const base = s.replace(/分會$/, '');
  return ATEAM_BRANCH_SET.has(`${base}分會`);
}

export function normalizeBranchName(input) {
  const s = String(input || '').trim().replace(/\s+/g, '');
  if (!s) return '';
  const base = s.replace(/分會+$/, '');
  if (!base) return '';
  // 與後端 bni_normalize_claim_branch 對齊：長輝白金 ≡ 長輝
  if (base === '長輝白金') return '長輝分會';
  return `${base}分會`;
}

/** 分會是否視為同一會（認領／晚宴綁定比對用） */
export function branchesEquivalent(a, b) {
  const na = normalizeBranchName(a);
  const nb = normalizeBranchName(b);
  return !!na && na === nb;
}

/** 比對既有分會名稱，避免「長輝」vs「長輝分會」等重複 */
export function findSimilarBranch(input, knownBranches = []) {
  const norm = normalizeBranchName(input);
  if (!norm) return null;
  const base = norm.replace(/分會$/, '');
  for (const b of knownBranches) {
    const full = normalizeBranchName(b);
    const bBase = full.replace(/分會$/, '');
    if (full === norm || bBase === base) return full;
  }
  return null;
}

/** 從公開統計收集所有已知分會名（含來賓自填） */
export function collectKnownBranchNames(stats) {
  const names = new Set(getAteamBranchNames());
  for (const row of stats?.branches || []) {
    if (row.branch) names.add(normalizeBranchName(row.branch));
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-TW'));
}

/** 來賓分會建議清單（排除 A Team 20 分會） */
export function guestBranchSuggestions(stats) {
  return collectKnownBranchNames(stats).filter(b => !isAteamBranch(b));
}

export function getRegionForBranch(branch) {
  const full = normalizeBranchName(branch);
  if (BRANCHES.zhongshan.some(b => `${b.name}分會` === full)) return 'zhongshan';
  if (BRANCHES.sanlu.some(b => `${b.name}分會` === full)) return 'sanlu';
  return 'guest';
}

/** 認領頁顯示用：20 分會摘要 */
export function getAteamBranchSummary() {
  const z = BRANCHES.zhongshan.map(b => b.name).join('、');
  const s = BRANCHES.sanlu.map(b => b.name).join('、');
  return `中山區（${z}）· 三蘆區（${s}）`;
}

/**
 * 合併 DB 公開統計與靜態種子，供首頁／搜尋分會瀏覽。
 * guest 區域 = 非楊董區 20 分會的自填分會。
 */
export function resolveBranchLists(stats) {
  const rows = stats?.branches;
  if (rows?.length) {
    const map = (region) => rows
      .filter(b => b.region === region)
      .map(b => ({
        name: String(b.branch).replace(/分會$/, ''),
        fullName: String(b.branch).includes('分會') ? b.branch : `${b.branch}分會`,
        count: b.count ?? 0,
      }))
      .filter(b => b.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
    return {
      zhongshan: map('zhongshan'),
      sanlu: map('sanlu'),
      guest: map('guest'),
    };
  }
  return {
    zhongshan: BRANCHES.zhongshan.filter(b => b.count > 0),
    sanlu: BRANCHES.sanlu.filter(b => b.count > 0),
    guest: [],
  };
}

export function regionBranchPickerHTML(region, selected = '') {
  const list = BRANCHES[region] || [];
  return list.map(b => {
    const full = `${b.name}分會`;
    const active = full === selected ? ' active' : '';
    return `<button type="button" class="ateam-pick-chip ${region}${active}" data-branch="${full}">${b.name}</button>`;
  }).join('');
}

export const REGION_LABELS = {
  zhongshan: '中山區',
  sanlu: '三蘆區',
  guest: '其他分會',
};

/** 20 分會圖框 HTML（認領頁用） */
export function ateamBranchGridHTML() {
  const chip = (b, region) =>
    `<span class="ateam-grid-chip ${region}">${b.name}</span>`;
  const z = BRANCHES.zhongshan.map(b => chip(b, 'zhongshan')).join('');
  const s = BRANCHES.sanlu.map(b => chip(b, 'sanlu')).join('');
  return `
    <div class="ateam-branch-grid">
      <div class="ateam-grid-region">
        <div class="ateam-grid-label">中山區 · 8 分會</div>
        <div class="ateam-grid-chips">${z}</div>
      </div>
      <div class="ateam-grid-region">
        <div class="ateam-grid-label">三蘆區 · 12 分會</div>
        <div class="ateam-grid-chips">${s}</div>
      </div>
    </div>`;
}

/** 可選分會 chips（建立新檔案時點選） */
export function ateamBranchPickerHTML(selected = '') {
  const all = [
    ...BRANCHES.zhongshan.map(b => ({ ...b, region: 'zhongshan' })),
    ...BRANCHES.sanlu.map(b => ({ ...b, region: 'sanlu' })),
  ];
  return all.map(b => {
    const full = `${b.name}分會`;
    const active = full === selected ? ' active' : '';
    return `<button type="button" class="ateam-pick-chip ${b.region}${active}" data-branch="${full}">${b.name}</button>`;
  }).join('');
}
