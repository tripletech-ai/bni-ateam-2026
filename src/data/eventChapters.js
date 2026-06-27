/** 2026 年會出席分會名錄 — 區域 → 分會（與 DB bni_event_regions / bni_event_chapters 同步） */

import { normalizeBranchName, findSimilarBranch } from './branches.js';

/** 楊董 A Team 20 分會（可綁定名單 roster） */
export const ATEAM_ROSTER_NAMES = Object.freeze([
  '長悅', '長佑', '長翔', '長城', '長輝', '長翼', '長利', '長和',
  '金鑫', '金虎', '金暘', '金利', '金澎湃', '金鈺', '金安', '金佑', '金盟', '金美', '金英', '金合',
]);

const ATEAM_SET = new Set(ATEAM_ROSTER_NAMES);

export function isAteamRosterChapterName(shortName) {
  return ATEAM_SET.has(String(shortName || '').replace(/分會$/, '').trim());
}

export function chapterFullName(shortName) {
  const s = String(shortName || '').trim().replace(/分會+$/, '');
  if (!s || s.startsWith('~')) return s;
  if (s.includes('海外') || s.includes('籌備') || s.includes('Overseas')) return s;
  return `${s}分會`;
}

/**
 * @type {{ areaGroup: string, regionId: string, regionLabel: string, chapters: string[] }[]}
 */
export const EVENT_CHAPTER_REGISTRY = [
  {
    areaGroup: '台北市',
    regionId: 'taipei-center',
    regionLabel: '台北市中心區',
    chapters: ['廣豐', '典範', '合富', '菁鑽', '誠億', '安信', '菁誠'],
  },
  {
    areaGroup: '台北市',
    regionId: 'taipei-north',
    regionLabel: '台北市北區',
    chapters: [
      '長城', '長佑', '長展', '長東', '長虹', '長橋', '長旭', '長君', '長旺', '長冠軍', '長盛', '長捷',
      '長悅', '長翔', '長貴', '長星光', '長揚', '長雋', '長興', '長安', '長灃', '長沛', '長溙', '長榮',
      '長綺', '長輝', '長築', '長翼', '長鶴', '長鑽', '長策', '長慶', '長艾', '長利', '長鷹',
    ],
  },
  {
    areaGroup: '台北市',
    regionId: 'taipei-south',
    regionLabel: '台北市南區',
    chapters: [
      '旗艦', '大家', '大展', '大賀', '大陽', '大商之道', '大榕', '大丰', '大天', '大立', '大恆', '大恩',
      '大創', '大盛', '大雁', '大敬業', '大漢', '大耀', '大一', '大千', '大盈', '大無限', '大芯', '大種',
      '大越', '大正', '大源', '大晴', '大疆',
    ],
  },
  {
    areaGroup: '新北市',
    regionId: 'newtaipei-west-a',
    regionLabel: '新北市西A區',
    chapters: ['聚財', '聚道', '聚富', '聚大'],
  },
  {
    areaGroup: '新北市',
    regionId: 'newtaipei-west-b',
    regionLabel: '新北市西B區',
    chapters: [
      '華泰', '華one', '華外貿', '華地產', '華冠', '華軍', '華路', '華榮', '華綠', '華億', '華餐飲', '華豐',
      '華市集', '華旅', '華創育', '華心', '華資', '華聯', '華橋', '華影視', '華醫',
    ],
  },
  {
    areaGroup: '新北市',
    regionId: 'newtaipei-northwest-a',
    regionLabel: '新北市西北A區',
    chapters: ['新核心', '新太洋', '新同心', '新世界', '新能量', '新元享', '新生活', '新勢力'],
  },
  {
    areaGroup: '新北市',
    regionId: 'newtaipei-northwest-b',
    regionLabel: '新北市西北B區',
    chapters: ['金合', '金安', '金佑', '金利', '金虎', '金英', '金暘', '金澎湃', '金鑫', '金鈺', '金美', '金盟'],
  },
  {
    areaGroup: '基隆 / 宜蘭 / 桃園 / 新竹',
    regionId: 'keelung-yilan',
    regionLabel: '基隆宜蘭區',
    chapters: ['天大', '天明', '樂樂'],
  },
  {
    areaGroup: '基隆 / 宜蘭 / 桃園 / 新竹',
    regionId: 'taoyuan-east',
    regionLabel: '桃園東A、B區',
    chapters: ['永恩', '永福', '永善', '永成', '永強', '永富', '永齊', '永鴻', '永工', '永樂'],
  },
  {
    areaGroup: '基隆 / 宜蘭 / 桃園 / 新竹',
    regionId: 'taoyuan-west',
    regionLabel: '桃園西區',
    chapters: ['宏光', '宏力', '宏鑫'],
  },
  {
    areaGroup: '基隆 / 宜蘭 / 桃園 / 新竹',
    regionId: 'hsinchu-a',
    regionLabel: '新竹A區',
    chapters: ['元創', '元誠', '元夢', '元鑽'],
  },
  {
    areaGroup: '基隆 / 宜蘭 / 桃園 / 新竹',
    regionId: 'hsinchu-b',
    regionLabel: '新竹B區',
    chapters: ['創企', '創始', '創婕', '創智', '創葳'],
  },
  {
    areaGroup: '台中 / 彰化 / 南投',
    regionId: 'taichung-city',
    regionLabel: '台中市區',
    chapters: ['全勝', '湧泉', '致勝', '震宇', '東穎', '豐華', '磐鈺', 'Million'],
  },
  {
    areaGroup: '台中 / 彰化 / 南投',
    regionId: 'taichung-south',
    regionLabel: '大台中南區',
    chapters: ['全鑫', '全耀', '全冠', '全樂', '全杏', '~其它~'],
  },
  {
    areaGroup: '台中 / 彰化 / 南投',
    regionId: 'taichung-east',
    regionLabel: '大台中東區',
    chapters: ['榮耀'],
  },
  {
    areaGroup: '台中 / 彰化 / 南投',
    regionId: 'changhua-north',
    regionLabel: '彰化北區',
    chapters: ['耀華', '興創', '耀彰'],
  },
  {
    areaGroup: '台中 / 彰化 / 南投',
    regionId: 'changhua-south',
    regionLabel: '彰化南區',
    chapters: ['明商', '明樂'],
  },
  {
    areaGroup: '台中 / 彰化 / 南投',
    regionId: 'nantou',
    regionLabel: '南投區',
    chapters: ['璞麗', '璞隆'],
  },
  {
    areaGroup: '雲林 / 嘉義 / 台南 / 高雄 / 屏東',
    regionId: 'yunlin',
    regionLabel: '雲林區',
    chapters: ['雲創', '雲富', '雲榮', '雲華', '雲愛', '雲鼎'],
  },
  {
    areaGroup: '雲林 / 嘉義 / 台南 / 高雄 / 屏東',
    regionId: 'chiayi',
    regionLabel: '嘉義區',
    chapters: ['嘉樂'],
  },
  {
    areaGroup: '雲林 / 嘉義 / 台南 / 高雄 / 屏東',
    regionId: 'tainan-city',
    regionLabel: '台南市區',
    chapters: ['大貴', '大商', '億展', '金貴', '金道', '億冠', '金誠', '億齊'],
  },
  {
    areaGroup: '雲林 / 嘉義 / 台南 / 高雄 / 屏東',
    regionId: 'tainan-south',
    regionLabel: '大台南南區',
    chapters: ['真鑽', '真富', '真誠'],
  },
  {
    areaGroup: '雲林 / 嘉義 / 台南 / 高雄 / 屏東',
    regionId: 'kaohsiung-center',
    regionLabel: '高雄市中心區',
    chapters: [
      '富樂', '富聯', '富禮', '富新', '富泰', '富和', '富恩', '富騰', '富真', '富揚', '富翔', '富愛',
      '富瑞', '富商', '富源', '富達', '富鼎', '富豪', '富有', '富捷',
    ],
  },
  {
    areaGroup: '雲林 / 嘉義 / 台南 / 高雄 / 屏東',
    regionId: 'pingtung',
    regionLabel: '屏東區',
    chapters: ['屏東區籌備分會', '屏盛'],
  },
  {
    areaGroup: '花蓮 / 台東 / 海外',
    regionId: 'hualien-taitung',
    regionLabel: '花蓮台東區',
    chapters: ['太魯閣', '國盛', '國工', '國發', '國際', '國富', '國馨', '南島'],
  },
  {
    areaGroup: '花蓮 / 台東 / 海外',
    regionId: 'overseas',
    regionLabel: '海外',
    chapters: ['海外BNI會員(Overseas Member)'],
  },
];

export function getEventRegistry() {
  return window.BNI_EVENT_CHAPTERS?.regions?.length
    ? window.BNI_EVENT_CHAPTERS.regions
    : EVENT_CHAPTER_REGISTRY;
}

export function getAreaGroups() {
  const regions = getEventRegistry();
  const groups = [];
  const seen = new Set();
  for (const r of regions) {
    if (seen.has(r.areaGroup)) continue;
    seen.add(r.areaGroup);
    groups.push(r.areaGroup);
  }
  return groups;
}

export function getRegionsInArea(areaGroup) {
  return getEventRegistry().filter(r => r.areaGroup === areaGroup);
}

export function getRegionById(regionId) {
  return getEventRegistry().find(r => r.regionId === regionId) || null;
}

export function searchEventChapters(query, limit = 30) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 1) return [];
  const hits = [];
  for (const region of getEventRegistry()) {
    for (const name of region.chapters) {
      const full = chapterFullName(name);
      if (name.toLowerCase().includes(q) || full.toLowerCase().includes(q)
        || region.regionLabel.toLowerCase().includes(q)) {
        hits.push({
          regionId: region.regionId,
          regionLabel: region.regionLabel,
          areaGroup: region.areaGroup,
          shortName: name,
          fullName: full,
          isAteamRoster: isAteamRosterChapterName(name),
        });
      }
    }
  }
  return hits.slice(0, limit);
}

export function eventBranchPickerHTML(regionId, selected = '') {
  const region = getRegionById(regionId);
  if (!region) return '';
  return region.chapters.map(name => {
    const full = chapterFullName(name);
    const active = full === selected || name === selected ? ' active' : '';
    const roster = isAteamRosterChapterName(name) ? ' ateam-roster' : '';
    return `<button type="button" class="ateam-pick-chip event-chapter-chip${roster}${active}" data-branch="${full}" data-short="${name}">${name}</button>`;
  }).join('');
}

export function regionPickerHTML() {
  const groups = getAreaGroups();
  return groups.map(area => {
    const regions = getRegionsInArea(area);
    const btns = regions.map(r => `
      <button type="button" class="onboard-region-chip" data-region-id="${r.regionId}">
        <span class="onboard-region-chip-label">${r.regionLabel}</span>
        <span class="onboard-region-chip-count">${r.chapters.length} 分會</span>
      </button>`).join('');
    return `
      <div class="onboard-area-group">
        <div class="onboard-area-title">${area}</div>
        <div class="onboard-region-grid">${btns}</div>
      </div>`;
  }).join('');
}

const FALLBACK_REGION_ID = 'taichung-south';

function chapterKey(name) {
  return String(name || '').replace(/分會+$/, '').trim().toLowerCase();
}

function collectAllRegistryFullNames() {
  const out = [];
  for (const region of getEventRegistry()) {
    for (const ch of region.chapters) {
      if (String(ch).startsWith('~')) continue;
      out.push(chapterFullName(ch));
    }
  }
  return out;
}

/**
 * 將任意分會名稱對應到名錄區域（僅 UI 分類，不修改 DB）
 * @returns {{ regionId: string, regionLabel: string, areaGroup: string, shortName: string, fullName: string, inRegistry: boolean } | null}
 */
export function resolveChapterPlacement(branchInput) {
  const norm = normalizeBranchName(branchInput);
  if (!norm) return null;
  const base = norm.replace(/分會$/, '');

  for (const region of getEventRegistry()) {
    for (const ch of region.chapters) {
      if (String(ch).startsWith('~')) continue;
      const full = chapterFullName(ch);
      if (full === norm || chapterKey(ch) === chapterKey(base)) {
        return {
          regionId: region.regionId,
          regionLabel: region.regionLabel,
          areaGroup: region.areaGroup,
          shortName: ch,
          fullName: full,
          inRegistry: true,
        };
      }
    }
  }

  const similar = findSimilarBranch(norm, collectAllRegistryFullNames());
  if (similar && similar !== norm) {
    return resolveChapterPlacement(similar);
  }

  const hits = searchEventChapters(base, 5);
  if (hits.length) {
    const exact = hits.find(h => chapterKey(h.shortName) === chapterKey(base))
      || hits.find(h => chapterKey(h.fullName) === chapterKey(base))
      || hits[0];
    return {
      regionId: exact.regionId,
      regionLabel: exact.regionLabel,
      areaGroup: exact.areaGroup,
      shortName: exact.shortName,
      fullName: exact.fullName,
      inRegistry: true,
    };
  }

  const fallback = getRegionById(FALLBACK_REGION_ID);
  return {
    regionId: FALLBACK_REGION_ID,
    regionLabel: fallback?.regionLabel || '大台中南區',
    areaGroup: fallback?.areaGroup || '台中 / 彰化 / 南投',
    shortName: base,
    fullName: norm,
    inRegistry: false,
  };
}

/**
 * 合併公開統計中的活躍分會到名錄各區（含原 guest 區，不再另開「其他區」）
 */
export function buildRegistryBrowseGroups(stats) {
  const countByNorm = new Map();
  for (const row of stats?.branches || []) {
    const norm = normalizeBranchName(row.branch);
    if (!norm || !(row.count > 0)) continue;
    countByNorm.set(norm, Math.max(countByNorm.get(norm) || 0, row.count ?? 0));
  }

  /** @type {Map<string, Map<string, { shortName: string, fullName: string, count: number, inRegistry: boolean, dbAlias?: string }>>} */
  const regionChapterMaps = new Map();

  for (const region of getEventRegistry()) {
    const chMap = new Map();
    for (const ch of region.chapters) {
      if (String(ch).startsWith('~')) continue;
      const full = chapterFullName(ch);
      chMap.set(chapterKey(ch), {
        shortName: ch,
        fullName: full,
        count: countByNorm.get(full) || 0,
        inRegistry: true,
      });
    }
    regionChapterMaps.set(region.regionId, chMap);
  }

  for (const [dbFull, count] of countByNorm) {
    const placement = resolveChapterPlacement(dbFull);
    if (!placement) continue;

    let chMap = regionChapterMaps.get(placement.regionId);
    if (!chMap) {
      chMap = new Map();
      regionChapterMaps.set(placement.regionId, chMap);
    }

    const key = chapterKey(placement.shortName);
    const existing = chMap.get(key);
    if (existing) {
      existing.count = Math.max(existing.count, count);
      if (dbFull !== existing.fullName && !existing.dbAlias) {
        existing.dbAlias = dbFull;
      }
    } else {
      chMap.set(key, {
        shortName: placement.shortName,
        fullName: placement.inRegistry ? placement.fullName : dbFull,
        count,
        inRegistry: placement.inRegistry,
        dbAlias: placement.inRegistry && dbFull !== placement.fullName ? dbFull : undefined,
      });
    }
  }

  return getAreaGroups().map(areaGroup => ({
    areaGroup,
    regions: getRegionsInArea(areaGroup).map(region => {
      const chMap = regionChapterMaps.get(region.regionId) || new Map();
      const ordered = [];
      const seen = new Set();

      for (const ch of region.chapters) {
        if (String(ch).startsWith('~')) continue;
        const key = chapterKey(ch);
        const item = chMap.get(key);
        ordered.push(item || {
          shortName: ch,
          fullName: chapterFullName(ch),
          count: 0,
          inRegistry: true,
        });
        seen.add(key);
      }

      const extras = [...chMap.entries()]
        .filter(([key]) => !seen.has(key))
        .map(([, item]) => item)
        .sort((a, b) => a.shortName.localeCompare(b.shortName, 'zh-TW'));

      return {
        regionId: region.regionId,
        regionLabel: region.regionLabel,
        chapters: [...ordered, ...extras],
      };
    }),
  }));
}
