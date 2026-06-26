/**
 * 大產業分類（最多複選 2 項）— 供首頁統計、搜尋篩選、會員自填
 * keywords 用於從 profession / have 自動推斷（seed 腳本）
 */
export const INDUSTRY_MAX = 2;

export const INDUSTRY_CATEGORIES = [
  {
    id: 'finance',
    labelKey: 'ind_finance',
    keywords: ['保險', '理財', '融資', '證券', '會計', '記帳', '稅', '財富', '投資', '金融', '兆豐', '產險', '壽險', '海外金融'],
  },
  {
    id: 'legal_tax',
    labelKey: 'ind_legal_tax',
    keywords: ['律師', '法律', '地政', '訴訟', '家事', '工程律師'],
  },
  {
    id: 'built_space',
    labelKey: 'ind_built_space',
    keywords: ['不動產', '室內', '設計', '裝修', '統包', '工程', '油漆', '防水', '拆除', '鋁門窗', '空調', '燈飾', '系統櫃', '住宅', '商空', '房屋', '建築', '裝潢', '清運', '消防', '共享空間', '海外房地產', '租物'],
  },
  {
    id: 'marketing_media',
    labelKey: 'ind_marketing_media',
    keywords: ['行銷', '品牌', '廣告', '媒體', '短影音', 'podcast', 'line', 'cis', '整合行銷', '攝影', '影像', '活動', '展場', '主持人', '投放', 'podcast', 'seo', 'aeo'],
  },
  {
    id: 'tech_digital',
    labelKey: 'ind_tech_digital',
    keywords: ['網站', '電商', '數位', 'ai', '3c', '維修', '平台', '軟體', 'app', '科技', '創新', '程式'],
  },
  {
    id: 'food_beverage',
    labelKey: 'ind_food_beverage',
    keywords: ['餐', '咖啡', '甜品', '食品', '早午餐', '英式', '外燴', '飯店', '餐飲'],
  },
  {
    id: 'health_beauty',
    labelKey: 'ind_health_beauty',
    keywords: ['醫', '牙', '物理治療', '美容', '營養', '護眼', '保健', '長照', '石墨烯', '臭氧', '呼吸', '齒模', '美學', '瑜伽', '頌缽', '指甲', '耳朵', '護椎', '消毒', '除蟲'],
  },
  {
    id: 'education_consult',
    labelKey: 'ind_education_consult',
    keywords: ['培訓', '教練', '課程', '陪跑', 'esg', '碳盤', '勞資', '顧問', '教育', '孵化', '企業培訓'],
  },
  {
    id: 'trade_retail',
    labelKey: 'ind_trade_retail',
    keywords: ['批發', '製造', '零售', '珠寶', '禮贈', '髮品', '團體服', '開運', '負離子', '清潔劑', '出口', '貿易', '集運', '租賃', '搬運', '雲梯'],
  },
  {
    id: 'lifestyle_service',
    labelKey: 'ind_lifestyle_service',
    keywords: ['風水', '命理', '生命禮儀', '龍巖', '搬家公司', '清潔', '旅遊', '包車', '接送', '黏土', '手工皂', '開運商品', '命理師', '地理師'],
  },
];

const ALLOWED = new Set(INDUSTRY_CATEGORIES.map(c => c.id));

export function isValidIndustryId(id) {
  return ALLOWED.has(id);
}

export function normalizeIndustryIds(raw) {
  const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const out = [];
  for (const item of list) {
    const id = String(item || '').trim();
    if (isValidIndustryId(id) && !out.includes(id)) out.push(id);
    if (out.length >= INDUSTRY_MAX) break;
  }
  return out;
}

/** 從文字推斷最多 2 個大產業（依 keyword 命中分數） */
export function inferIndustriesFromText(...texts) {
  const blob = texts.filter(Boolean).join(' ').toLowerCase();
  if (!blob.trim()) return [];

  const scores = INDUSTRY_CATEGORIES.map(cat => {
    let score = 0;
    for (const kw of cat.keywords) {
      if (blob.includes(kw.toLowerCase())) score += kw.length >= 3 ? 2 : 1;
    }
    return { id: cat.id, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  return scores.slice(0, INDUSTRY_MAX).map(x => x.id);
}

export function industryLabel(id, t) {
  const cat = INDUSTRY_CATEGORIES.find(c => c.id === id);
  return cat ? t(cat.labelKey) : id;
}

export function countIndustriesFromMembers(members) {
  const counts = Object.fromEntries(INDUSTRY_CATEGORIES.map(c => [c.id, 0]));
  for (const m of members || []) {
    let ids = normalizeIndustryIds(m.industries);
    if (!ids.length) ids = inferIndustriesFromText(m.profession, m.have);
    for (const id of ids) {
      if (counts[id] != null) counts[id]++;
    }
  }
  return INDUSTRY_CATEGORIES
    .map(c => ({ id: c.id, labelKey: c.labelKey, count: counts[c.id] || 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

export function getMembersByIndustry(members, industryId) {
  const id = String(industryId || '').trim();
  if (!isValidIndustryId(id)) return [];
  return (members || []).filter(m => {
    let ids = normalizeIndustryIds(m.industries);
    if (!ids.length) ids = inferIndustriesFromText(m.profession, m.have);
    return ids.includes(id);
  });
}

export function mergeIndustryStatsFromPublic(publicStats, members) {
  const rows = publicStats?.industries;
  if (Array.isArray(rows) && rows.length) {
    return rows
      .map(r => ({
        id: r.id,
        labelKey: INDUSTRY_CATEGORIES.find(c => c.id === r.id)?.labelKey || r.id,
        count: r.count ?? 0,
      }))
      .filter(x => x.count > 0 && isValidIndustryId(x.id))
      .sort((a, b) => b.count - a.count);
  }
  return countIndustriesFromMembers(members);
}

/** 圓餅圖中心：唯一會員總數（來自 DB total_members，勿用產業加總） */
export function getMemberTotalFromStats(publicStats, members) {
  const n = publicStats?.total_members;
  if (typeof n === 'number' && n >= 0) return n;
  return Array.isArray(members) ? members.length : 0;
}
