/** 楊董 A Team 旗下 20 個分會（名單內會員用「綁定舊會員」） */
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
  return ATEAM_BRANCH_SET.has(String(branch || '').trim());
}

/** 認領頁顯示用：20 分會摘要 */
export function getAteamBranchSummary() {
  const z = BRANCHES.zhongshan.map(b => b.name).join('、');
  const s = BRANCHES.sanlu.map(b => b.name).join('、');
  return `中山區（${z}）· 三蘆區（${s}）`;
}
